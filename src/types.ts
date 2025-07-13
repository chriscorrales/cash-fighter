// src/types.ts
export interface HealthCheckResponse {
  failing: boolean;
  minResponseTime: number;
}

export interface PaymentRequest {
  correlationId: string;
  amount: number;
  requestedAt: string;
}

export interface PaymentResponse {
  message: string;
}

export interface PaymentsSummaryResponse {
  default: {
    totalRequests: number;
    totalAmount: number;
  };
  fallback: {
    totalRequests: number;
    totalAmount: number;
  };
}
