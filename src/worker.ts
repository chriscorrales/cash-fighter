import { PAYMENT_PROCESSOR_URL_DEFAULT, PAYMENT_PROCESSOR_URL_FALLBACK, PAYMENT_QUEUE_KEY } from "./settings";
import type { Payment } from "./interfaces/types";
import { StrategyHealthCheck } from "./useCases/StrategyHealthCheck/StrategyHealthCheck";
import { RedisCache } from "./services/Cache/redisCache";
import { RedisDatabase } from "./services/Database/redisDatabase";
import { RedisPublisher } from "./services/Publishers/redisPublisher";
import { RedisConsumer } from "./services/Consumers/redisConsumer";

const HEALTH_CHECK_INTERVAL = 5000;

const REDIS_HEALTHCHECK_KEY='payments:health';

const redisCache = new RedisCache(REDIS_HEALTHCHECK_KEY, HEALTH_CHECK_INTERVAL);
const redisDatabase = new RedisDatabase();

const redisPublisher = new RedisPublisher();
const redisConsumer = new RedisConsumer();

const strategyHealthCheck = new StrategyHealthCheck(redisCache);

while(true) {
  const item = await redisConsumer.pop(100);

  if (!item || item?.length === 0) {
    continue;
  }

  const processorHealth = await strategyHealthCheck.getHealthCheck();

  await batchProcessPayment(item, processorHealth.processor);
}

async function batchProcessPayment(payments: string[], processor: 'default' | 'fallback' = 'default') {
  const promises = payments.map(payment => processPaymentAsync(payment, processor));

  await Promise.allSettled(promises);
}

async function processPaymentAsync(data: string, processor: 'default' | 'fallback') {
  const processorUrl = processor === 'default' ? PAYMENT_PROCESSOR_URL_DEFAULT : PAYMENT_PROCESSOR_URL_FALLBACK;
  const requestedAt = new Date();

  const {ok} = await fetch(`${processorUrl}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data.replace('}', `,"requestedAt":"${requestedAt.toISOString()}"}`),
  });

  if (ok) {
    const payment = {...JSON.parse(data), requestedAt} as Payment;

    await redisDatabase.save(payment, processor);

    return;
  }

  if (processor === 'default') {
    return processPaymentAsync(data, 'fallback');
  }

  await redisPublisher.rightPush(data);
  return;
}