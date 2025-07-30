import { Redis, type RedisOptions } from "ioredis";
import { REDIS_HOST } from "../settings";
import type { DatabaseInterface } from "../interfaces/database";
import type { QueueInterface } from "../interfaces/queue";
import clientRedis from "../database";

const REDIS_CONFIG: RedisOptions = {
  host: REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}

type Data = {
  value: string;
  score: number;
}
export class RedisCache implements DatabaseInterface<Data>, QueueInterface<string> {
  private redis: Redis;
  private queueKey: string = 'payments:queue';

  constructor() {
    this.redis = new Redis(REDIS_CONFIG);
  }
  public async leftPush(value: string): Promise<void>{
    clientRedis.lPush(this.queueKey, value);
  };

  public async rightPush(value: string): Promise<void>{
    clientRedis.rPush(this.queueKey, value);
  };

  public pop(count: number) {
    return clientRedis.rPopCount(this.queueKey, count);
  };

  public async countFromRangeDate(from: number, to: number, processor: 'default' | 'fallback'): Promise<number> {
    return clientRedis.zCount(`payments:${processor}`, from, to);
  };

  public findFromRangeDate(from: number, to: number, processor: 'default' | 'fallback') {
    return clientRedis.zRangeByScoreWithScores(`payments:${processor}`, from, to);
  };

  public async save(data: Data, processor: 'default' | 'fallback'): Promise<void> {
    const { value, score } = data;

    await clientRedis.zAdd(`payments:${processor}`, [{ score, value }]);
  }
}