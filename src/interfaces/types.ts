// src/types.ts
export type Payment = {
  correlationId: string;
  amount: number;
  requestedAt: string;
}


export type HealthCheckResponse =  {
  failing: boolean;
  minResponseTime: number;
  processor: 'default' | 'fallback';
}

export type PaymentResponse =  {
  message: string;
}

export type PaymentsSummaryResponse = {
  default: {
    totalRequests: number;
    totalAmount: number;
  };
  fallback: {
    totalRequests: number;
    totalAmount: number;
  };
}
