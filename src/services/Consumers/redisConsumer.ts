import { Redis, type RedisOptions } from "ioredis";
import type { Consumer } from "./interface";
import { REDIS_HOST } from "../../settings";

const REDIS_CONFIG: RedisOptions = {
  host: REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}

export class RedisConsumer implements Consumer<string> {
  private redis: Redis;
  private queueKey: string = 'payments:queue';

  constructor() {
    this.redis = new Redis(REDIS_CONFIG);
  }

  public pop(count: number) {
    return this.redis.rpop(this.queueKey, count);
  };
}