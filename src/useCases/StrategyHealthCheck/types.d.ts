export type HealthCheckResponse =  {
  failing: boolean;
  minResponseTime: number;
  processor: 'default' | 'fallback';
}