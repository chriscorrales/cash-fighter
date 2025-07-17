export const PORT = Number(process.env.PORT || '9999');

// Payment processor
export const PAYMENT_PROCESSOR_URL_DEFAULT = process.env.PAYMENT_PROCESSOR_URL_DEFAULT || 'http://payment-processor-default:8080';
export const PAYMENT_PROCESSOR_URL_FALLBACK = process.env.PAYMENT_PROCESSOR_URL_FALLBACK || 'http://payment-processor-fallback:8080';

// Application settings
export const MIN_RESPONSE_TIME = Number(process.env.MIN_RESPONSE_TIME || '900');

// Redis configuration
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const PAYMENT_QUEUE_KEY = process.env.PAYMENT_QUEUE_KEY || 'payments:queue';
export const PAYMENT_DATA_KEY = process.env.PAYMENT_DATA_KEY || 'payments';
