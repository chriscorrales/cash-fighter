import { serve } from "bun";
import { PAYMENT_PROCESSOR_URL_DEFAULT, PAYMENT_PROCESSOR_URL_FALLBACK, PAYMENT_QUEUE_KEY, PORT } from "./settings";
import type { PaymentsSummaryResponse } from "./types";
import clientRedis from "./database";

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
      case '/purge-payments':
        if (req.method === 'DELETE') {
          await deleteAllPayments();
          await purgePayments();
          return new Response(null, { status: 204 });
        }
        break;
    }

    return new Response('Not found', { status: 404 });
  }
})

async function handlePayment(req: Request) {
  const bodyBuffer = await req.arrayBuffer();
  const bodyArray = new Uint8Array(bodyBuffer);
  const jsonString = new TextDecoder().decode(bodyArray);

  const compactJson = jsonString.replace(/\s+/g, '');

  try {
    clientRedis.lPush(PAYMENT_QUEUE_KEY, compactJson);

    return new Response(null, { status: 202 });
  } catch {
    return new Response(null, { status: 502 });
  }
}


async function purgePayments() {
  try {
    await fetch(`${PAYMENT_PROCESSOR_URL_DEFAULT}/admin/purge-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Rinha-Token': '123' },
    });

    await fetch(`${PAYMENT_PROCESSOR_URL_FALLBACK}/admin/purge-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Rinha-Token': '123' },
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
    // Lógica de retry pode ser adicionada aqui
  }
}

async function deleteAllPayments() {
  await clientRedis.flushAll('ASYNC');
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