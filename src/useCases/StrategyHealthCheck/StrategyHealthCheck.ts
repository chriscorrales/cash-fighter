import type { Cache } from "../../services/Cache/interface";
import { PaymentProcessor } from "../../services/paymentProcessor";
import type { StrategyHealthCheckInterface } from "./interface";
import type { HealthCheckResponse } from "./types";

export class StrategyHealthCheck implements StrategyHealthCheckInterface {
  private readonly defaultPaymentProcessor = new PaymentProcessor('default');
  private readonly fallbackPaymentProcessor = new PaymentProcessor('fallback');
  private readonly HEALTH_CHECK_KEY='payments:health';
  private readonly defaultResponseHealthCheck: HealthCheckResponse = { failing: true, minResponseTime: 0, processor: 'fallback' };

  constructor(private readonly cache: Cache<string>) {
  }

  public async getHealthCheck() {
    try {
      const healthCache = await this.cache.get(this.HEALTH_CHECK_KEY)
      const jsonParse = JSON.parse(healthCache || '{}') as HealthCheckResponse;

      if (healthCache && jsonParse.failing === false) {
        return jsonParse;
      }

      const defaultRes = await this.defaultPaymentProcessor.getHealthCheck();

      if (defaultRes.failing) {
        const fallbackRes =  await this.fallbackPaymentProcessor.getHealthCheck();

        const objectToSaveFallback = {...fallbackRes, processor: 'fallback'} as HealthCheckResponse;

        await this.cache.set(JSON.stringify(objectToSaveFallback))

        return objectToSaveFallback;
      }

      const objectToSaveDefault = {...defaultRes, processor: 'default'} as HealthCheckResponse;

      await this.cache.set(JSON.stringify(objectToSaveDefault))

      return objectToSaveDefault;
    } catch (error) {
      await this.cache.set(JSON.stringify(this.defaultResponseHealthCheck))
      return this.defaultResponseHealthCheck;
      ;
    }
  }
}