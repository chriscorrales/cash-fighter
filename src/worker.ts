import clientRedis from "./database";
import { PAYMENT_DATA_KEY, PAYMENT_PROCESSOR_URL_DEFAULT, PAYMENT_PROCESSOR_URL_FALLBACK, PAYMENT_QUEUE_KEY } from "./settings";
import type { HealthCheckResponse, PaymentRequest } from "./types";

const HEALTH_CHECK_INTERVAL = 5000; // 5 segundos

const REDIS_HEALTHCHECK_KEY='payments:health';


function toJson(obj: PaymentRequest) {
  return `{"correlationId":"${obj.correlationId}","amount":${obj.amount},"requestedAt":"${obj.requestedAt}"}`;
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

    console.log('Processor health:', processorHealth);

    if (processorHealth.failing) {
      await clientRedis.rPush(PAYMENT_QUEUE_KEY, toJson(payment));
      return;
    }

    const processorUrl = processorHealth.processor === 'default' ? PAYMENT_PROCESSOR_URL_DEFAULT : PAYMENT_PROCESSOR_URL_FALLBACK;

    payment.requestedAt = new Date().toISOString();

    const response = await processPaymentAsync(payment, processorUrl);

    console.log('Payment response:', response);

    if (!response) {
      setTimeout(async () => {
        await clientRedis.rPush(PAYMENT_QUEUE_KEY, toJson(payment));
      }, 2000);
      return;
    }

    if (response.status >= 200 && response.status < 300) {
      const score = new Date(payment.requestedAt).getTime();
      clientRedis.hSet(`${PAYMENT_DATA_KEY}:${processorHealth.processor}:${payment.correlationId}`, payment.correlationId, JSON.stringify(payment))

      clientRedis.zAdd(`payments:${processorHealth.processor}:by_date`, { score, value: payment.correlationId });

      return;
    }

    setTimeout(async () => {
      await clientRedis.rPush(PAYMENT_QUEUE_KEY, toJson(payment));
    }, 2000);
    return;
  } catch (error) {
    console.error('Error processing payment:', error);
    await clientRedis.rPush(PAYMENT_QUEUE_KEY, toJson(payment));
    return;
  }
}

async function getHealthCheck(): Promise<HealthCheckResponse> {
  try {
    const healthCache = await clientRedis.get(REDIS_HEALTHCHECK_KEY)

    if (healthCache) {
      return JSON.parse(healthCache) as HealthCheckResponse;
    }

    const defaultRes = await checkProcessorHealth(PAYMENT_PROCESSOR_URL_DEFAULT);

    if (defaultRes.failing || defaultRes.minResponseTime > 700) {
      const fallbackRes = await checkProcessorHealth(PAYMENT_PROCESSOR_URL_FALLBACK)

      const objectToSaveFallback = {...fallbackRes, processor: 'fallback'} as HealthCheckResponse;

      await clientRedis.set(REDIS_HEALTHCHECK_KEY, JSON.stringify(objectToSaveFallback), {expiration: {type: 'PX', value: HEALTH_CHECK_INTERVAL}})

      return objectToSaveFallback;
    }

    const objectToSaveDefault = {...defaultRes, processor: 'default'} as HealthCheckResponse;

    await clientRedis.set(REDIS_HEALTHCHECK_KEY, JSON.stringify(objectToSaveDefault), {expiration: {type: 'PX', value: HEALTH_CHECK_INTERVAL}})

    return objectToSaveDefault;
  } catch (error) {
    console.error('Error checking processor health:', error);

     await clientRedis.set(REDIS_HEALTHCHECK_KEY, JSON.stringify({ failing: true, minResponseTime: 0, processor: 'fallback' }), {expiration: {type: 'PX', value: HEALTH_CHECK_INTERVAL}})
    return { failing: true, minResponseTime: 0, processor: 'fallback' }
    ;
  }
}

async function processPaymentAsync(data: PaymentRequest, url: string) {
  try {
    return fetch(`${url}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data).replace(/\s+/g, '')
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
  }
}