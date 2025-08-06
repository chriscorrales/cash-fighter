import { PAYMENT_PROCESSOR_URL_DEFAULT, PAYMENT_PROCESSOR_URL_FALLBACK } from "./settings";
import type { Payment, PaymentsSummaryResponse } from "./interfaces/types";
import type { DatabaseInterface } from "./services/Database/interface";
import type { Publisher } from "./services/Publishers/interface";

export class RoutesServer {
  constructor(private publisher: Publisher<string>, private database: DatabaseInterface<Payment>) {
  }

  public async fetch(req: Request) {
    const url = new URL(req.url);

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
    const bodyBuffer = await req.text();

    try {
      await this.publisher.leftPush(bodyBuffer)

      return new Response(null, { status: 202 });
    } catch {
      return new Response(null, { status: 502 });
    }
  }

  private async getSummary(searchParams: URLSearchParams) {

    const from = new Date(searchParams.get('from') || '2000-01-01T00:00:00Z').getTime();
    const to = new Date(searchParams.get('to') || '2900-01-01T00:00:00Z').getTime();

    const countDefault = await this.database.countFromRangeDate(from, to, 'default');
    const countFallback = await this.database.countFromRangeDate(from, to, 'fallback');


    const sumDefault = await this.database.findAllAmountFromRangeDate(from, to, 'default');
    const sumFallback = await this.database.findAllAmountFromRangeDate(from, to, 'fallback');

    // console.log({sumDefault, sumFallback})

    const totalAmountDefault = sumDefault.reduce((acc, item) => acc + item, 0).toFixed(2);
    const totalAmountFallback = sumFallback.reduce((acc, item) => acc + item, 0).toFixed(2);

    const summary: PaymentsSummaryResponse = {
      default: { totalRequests: countDefault, totalAmount: Number(totalAmountDefault) },
      fallback: { totalRequests: countFallback, totalAmount: Number(totalAmountFallback) }
    };

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async purgePayments() {
    await this.database.cleanAllData();

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