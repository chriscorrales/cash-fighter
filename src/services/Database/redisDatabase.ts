import { Redis, type RedisOptions } from "ioredis";
import type { DatabaseInterface } from "./interface";
import type { Payment } from "../../interfaces/types";
import { REDIS_HOST } from "../../settings";

const REDIS_CONFIG: RedisOptions = {
  host: REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}

export class RedisDatabase implements DatabaseInterface<Payment> {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(REDIS_CONFIG);
  }
  public async countFromRangeDate(from: number, to: number, processor: 'default' | 'fallback') {
    return this.redis.zcount(`payments:${processor}`, from, to);
  };

  public async findAllAmountFromRangeDate(from: number, to: number, processor: 'default' | 'fallback') {
    const values = await this.redis.zrangebyscore(`payments:${processor}`, from, to);

    console.log('values', values);

    return values.map((v) => Number(v.split(':')[1]));
  };

  public async save(data: Payment, processor: 'default' | 'fallback') {
    const {requestedAt, amount, correlationId} = data

    const score = requestedAt.getTime()

    await this.redis.zadd(`payments:${processor}:${correlationId}`, score, `${amount}:`);
  }

  public async cleanAllData() {
    await this.redis.flushall('ASYNC');
  }
}