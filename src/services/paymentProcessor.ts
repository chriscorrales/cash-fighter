import type { HealthCheckResponse } from "../interfaces/types";
import { PAYMENT_PROCESSOR_URL_DEFAULT, PAYMENT_PROCESSOR_URL_FALLBACK } from "../settings";

const URL_API = {
  default: PAYMENT_PROCESSOR_URL_DEFAULT,
  fallback: PAYMENT_PROCESSOR_URL_FALLBACK
}

export class PaymentProcessor {
  private url = PAYMENT_PROCESSOR_URL_DEFAULT;

  constructor(processor: 'default' | 'fallback') {
    this.url = URL_API[processor];
  }

  public processPayment(body: string) {
    return fetch(`${this.url}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  public async getHealthCheck() {
    const response = await fetch(`${this.url}/payments/service-health`, {
      method: 'GET'
    });

    return response.json() as Promise<HealthCheckResponse>;
  }
}