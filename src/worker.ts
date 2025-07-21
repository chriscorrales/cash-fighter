import clientRedis from "./database";
import { PAYMENT_PROCESSOR_URL_DEFAULT, PAYMENT_PROCESSOR_URL_FALLBACK, PAYMENT_QUEUE_KEY } from "./settings";
import type { HealthCheckResponse, PaymentRequest } from "./types";

const HEALTH_CHECK_INTERVAL = 5000; // 5 segundos

const REDIS_HEALTHCHECK_KEY='payments:health';


function toJson(obj: PaymentRequest) {
  return `{"correlationId":"${obj.correlationId}","amount":${obj.amount}}`;
}

while(true) {
  try {
    const item = await clientRedis.rPop(PAYMENT_QUEUE_KEY);

    if (!item) {
      continue;
    }

    const payment = JSON.parse(item) as PaymentRequest;

    await processPayment(payment);
  } catch (err) {
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function checkProcessorHealth(url?: string): Promise<HealthCheckResponse> {
  const response = await fetch(`${url}/payments/service-health`);

  return response.json() as Promise<HealthCheckResponse>;
}


async function processPayment(payment: PaymentRequest) {
  try {
    const processorHealth = await getHealthCheck();

    if (processorHealth.failing) {
      await clientRedis.rPush(PAYMENT_QUEUE_KEY, toJson(payment));
      return;
    }

    const processorUrl = processorHealth.processor === 'default' ? PAYMENT_PROCESSOR_URL_DEFAULT : PAYMENT_PROCESSOR_URL_FALLBACK;

    payment.requestedAt = new Date().toISOString();

    const response = await processPaymentAsync(payment, processorUrl);

    if (!response) {
      await clientRedis.rPush(PAYMENT_QUEUE_KEY, toJson(payment));
      return;
    }

    if (response.status === 200) {
      const score = new Date(payment.requestedAt).getTime();
      await clientRedis.zAdd(`payments:${processorHealth.processor}`, [{ score, value: `${payment.correlationId}:${payment.amount.toString()}` }]);

      return;
    }

    await clientRedis.rPush(PAYMENT_QUEUE_KEY, toJson(payment));
    return;
  } catch (error) {
    await clientRedis.rPush(PAYMENT_QUEUE_KEY, toJson(payment));
    return;
  }
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

function processPaymentAsync(data: PaymentRequest, url: string) {
  try {
    const bodyArray = new TextEncoder().encode(JSON.stringify(data).replace(/\s+/g, ''));

    return fetch(`${url}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyArray
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
  }
}