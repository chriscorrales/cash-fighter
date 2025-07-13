import { serve } from "bun";
import { PORT } from "./settings";
import type { HealthCheckResponse, PaymentsSummaryResponse } from "./types";

const PROCESSOR_DEFAULT = "http://payment-processor-default:8080";
const PROCESSOR_FALLBACK = "http://payment-processor-fallback:8080";
const HEALTH_CHECK_INTERVAL = 5000; // 5 segundos

let processorStatus = {
  default: { available: true, minResponseTime: 0 },
  fallback: { available: true, minResponseTime: 0 }
};

async function checkProcessorHealth(url: string): Promise<HealthCheckResponse> {
  const response = await fetch(`${url}/payments/service-health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json() as Promise<HealthCheckResponse>;
}

async function updateProcessorStatus() {
  try {
    const [defaultRes, fallbackRes] = await Promise.allSettled([
      checkProcessorHealth(PROCESSOR_DEFAULT),
      checkProcessorHealth(PROCESSOR_FALLBACK)
    ]);

    if (defaultRes.status === 'fulfilled') {
      processorStatus.default = {
        available: !defaultRes.value.failing,
        minResponseTime: defaultRes.value.minResponseTime
      };
    }

    if (fallbackRes.status === 'fulfilled') {
      processorStatus.fallback = {
        available: !fallbackRes.value.failing,
        minResponseTime: fallbackRes.value.minResponseTime
      };
    }
  } catch (error) {
    console.error("Health check failed:", error);
  }

  setTimeout(updateProcessorStatus, HEALTH_CHECK_INTERVAL);
}

updateProcessorStatus();

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    switch (url.pathname) {
      case '/payments':
        if (req.method === 'POST') return handlePayment(req);
        break;
      case '/payments-summary':
        if (req.method === 'GET') return getSummary(req);
        break;
    }

    return new Response('Not found', { status: 404 });
  }
})

async function handlePayment(req: Request) {
  const decoder = new TextDecoder();
  const OK_RESPONSE = new Response(null, { status: 202 });
  const BAD_REQUEST = new Response(null, { status: 400 });
  const GATEWAY_ERROR = new Response(null, { status: 502 });

  try {
    const body = await req.arrayBuffer();
    const decoded = decoder.decode(body);

    if (!decoded.includes('correlationId') || !decoded.includes('amount')) {
      return BAD_REQUEST;
    }

    processPaymentAsync(decoded); // Passa o JSON bruto
    return OK_RESPONSE;
  } catch {
    return GATEWAY_ERROR;
  }
}

async function processPaymentAsync(data: any) {
  try {
    const processor = selectProcessor();
    await fetch(`${processor}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        requestedAt: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
    // Lógica de retry pode ser adicionada aqui
  }
}

function selectProcessor() {
  // Lógica de seleção baseada em disponibilidade e performance
  if (processorStatus.default.available) {
    return PROCESSOR_DEFAULT;
  }
  if (processorStatus.fallback.available) {
    return PROCESSOR_FALLBACK;
  }
  throw new Error('No available processors');
}

async function getSummary(req: Request): Promise<Response> {
  const summary: PaymentsSummaryResponse = {
    default: { totalRequests: 0, totalAmount: 0 },
    fallback: { totalRequests: 0, totalAmount: 0 }
  };

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' }
  });
}