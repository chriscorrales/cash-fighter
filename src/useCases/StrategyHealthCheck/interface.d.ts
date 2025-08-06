import type { HealthCheckResponse } from "./types";

export interface StrategyHealthCheckInterface {
  getHealthCheck: () => Promise<HealthCheckResponse>;
}