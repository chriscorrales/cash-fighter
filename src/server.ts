import clientRedis from "./database";
import { PAYMENT_QUEUE_KEY, PAYMENT_PROCESSOR_URL_DEFAULT, PAYMENT_PROCESSOR_URL_FALLBACK } from "./settings";
import type { PaymentsSummaryResponse } from "./interfaces/types";

export class RoutesServer {
  public async fetch(req: Request) {
    const url = new URL(req.url);

    console.log(`Request received: ${url.pathname} ${req.method}`);

    const { pathname, searchParams } = url;
    const { method } = req;

    if (pathname === '/payments' && method === 'POST') {
      return this.handleRequest(req);
    }

    if (pathname === '/payments-summary' && method === 'GET') {
      return this.getSummary(searchParams);
    }

    if (pathname === '/purge-payments' && method === 'DELETE') {
      return this.purgePayments();
    }

    return new Response(null, { status: 404 });
  }

  private async handleRequest(req: Request) {
    const bodyBuffer = await req.json() as { correlationId: string; amount: number; };

    try {
      clientRedis.lPush(PAYMENT_QUEUE_KEY, `{"correlationId":"${bodyBuffer.correlationId}","amount":${bodyBuffer.amount}}`);

      return new Response(null, { status: 202 });
    } catch {
      return new Response(null, { status: 502 });
    }
  }

  private async getSummary(searchParams: URLSearchParams) {

    const from = new Date(searchParams.get('from') || '2000-01-01T00:00:00Z').getTime();
    const to = new Date(searchParams.get('to') || '2900-01-01T00:00:00Z').getTime();

    const countDefault = await clientRedis.zCount('payments:default', from, to);
    const countFallback = await clientRedis.zCount('payments:fallback', from, to);

    const sumDefault = await clientRedis.zRangeByScoreWithScores('payments:default', from, to);
    const sumFallback = await clientRedis.zRangeByScoreWithScores('payments:fallback', from, to);

    const totalAmountDefault = sumDefault.reduce((acc, item) => acc + parseFloat(item.value.split(':')[1] || '0'), 0).toFixed(2);
    const totalAmountFallback = sumFallback.reduce((acc, item) => acc + parseFloat(item.value.split(':')[1] || '0'), 0).toFixed(2);


    const summary: PaymentsSummaryResponse = {
      default: { totalRequests: countDefault, totalAmount: Number(totalAmountDefault) },
      fallback: { totalRequests: countFallback, totalAmount: Number(totalAmountFallback) }
    };

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async purgePayments() {
    await clientRedis.flushAll('ASYNC');

    await fetch(`${PAYMENT_PROCESSOR_URL_DEFAULT}/admin/purge-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Rinha-Token': '123' },
    });

    await fetch(`${PAYMENT_PROCESSOR_URL_FALLBACK}/admin/purge-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Rinha-Token': '123' },
    });

    return new Response(null, { status: 204 });
  }
}