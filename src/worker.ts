import clientRedis from "./database";
import { PAYMENT_PROCESSOR_URL_DEFAULT, PAYMENT_PROCESSOR_URL_FALLBACK, PAYMENT_QUEUE_KEY } from "./settings";
import type { HealthCheckResponse, Payment } from "./interfaces/types";

const HEALTH_CHECK_INTERVAL = 5000; // 5 segundos

const REDIS_HEALTHCHECK_KEY='payments:health';

while(true) {
  const item = await clientRedis.rPopCount(PAYMENT_QUEUE_KEY, 100);

  if (!item || item?.length === 0) {
    continue;
  }

  const processorHealth = await getHealthCheck();

  await batchProcessPayment(item, processorHealth.processor);
}

async function batchProcessPayment(payments: string[], processor: 'default' | 'fallback' = 'default') {
  const promises = payments.map(payment => processPaymentAsync(payment, processor));

  await Promise.allSettled(promises);
}

async function getHealthCheck(): Promise<HealthCheckResponse> {
  try {
    const healthCache = await clientRedis.get(REDIS_HEALTHCHECK_KEY)

    if (healthCache && JSON.parse(healthCache).failing === false) {
      return JSON.parse(healthCache) as HealthCheckResponse;
    }

    const defaultRes = await checkProcessorHealth(PAYMENT_PROCESSOR_URL_DEFAULT);

    if (defaultRes.failing) {
      const fallbackRes = await checkProcessorHealth(PAYMENT_PROCESSOR_URL_FALLBACK)

      const objectToSaveFallback = {...fallbackRes, processor: 'fallback'} as HealthCheckResponse;

      await clientRedis.set(REDIS_HEALTHCHECK_KEY, JSON.stringify(objectToSaveFallback), {expiration: {type: 'PX', value: HEALTH_CHECK_INTERVAL}})

      return objectToSaveFallback;
    }

    const objectToSaveDefault = {...defaultRes, processor: 'default'} as HealthCheckResponse;

    await clientRedis.set(REDIS_HEALTHCHECK_KEY, JSON.stringify(objectToSaveDefault), {expiration: {type: 'PX', value: HEALTH_CHECK_INTERVAL}})

    return objectToSaveDefault;
  } catch (error) {
    await clientRedis.set(REDIS_HEALTHCHECK_KEY, JSON.stringify({ failing: true, minResponseTime: 0, processor: 'fallback' }), {expiration: {type: 'PX', value: HEALTH_CHECK_INTERVAL}})
    return { failing: true, minResponseTime: 0, processor: 'fallback' }
    ;
  }
}

async function checkProcessorHealth(url?: string): Promise<HealthCheckResponse> {
  const response = await fetch(`${url}/payments/service-health`);

  return response.json() as Promise<HealthCheckResponse>;
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

    const score = requestedAt.getTime();

    const payment = JSON.parse(data) as Payment;

    await clientRedis.zAdd(`payments:${processor}`, [{ score, value: `${payment.correlationId}:${payment.amount.toString()}` }]);

    return;
  }

  if (processor === 'default') {
    return processPaymentAsync(data, 'fallback');
  }

  await clientRedis.rPush(PAYMENT_QUEUE_KEY, data);
  return;
}