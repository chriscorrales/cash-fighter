export const PORT = Number(Bun.env.PORT || '3000');

// Payment processor
export const PAYMENT_PROCESSOR_URL_DEFAULT = Bun.env.PAYMENT_PROCESSOR_URL_DEFAULT || 'http://payment-processor-default:8080';
export const PAYMENT_PROCESSOR_URL_FALLBACK = Bun.env.PAYMENT_PROCESSOR_URL_FALLBACK || 'http://payment-processor-fallback:8080';

// Redis configuration
export const REDIS_URL = Bun.env.REDIS_URL || 'redis://localhost:6379';
export const REDIS_HOST = Bun.env.REDIS_HOST || 'redis';
export const PAYMENT_QUEUE_KEY = 'payments:queue';
export const PAYMENT_DATA_KEY = 'payments';