import { Redis, type ChainableCommander, type RedisOptions } from "ioredis";
import { REDIS_HOST } from "../../settings";
import type { Publisher } from "./interface";

const REDIS_CONFIG: RedisOptions = {
  host: REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}

export class RedisPublisher implements Publisher<string> {
  private redis: Redis;
  private queueKey: string = 'payments:queue';

  constructor() {
    this.redis = new Redis(REDIS_CONFIG);
  }
  public async leftPush(value: string): Promise<void>{
    this.redis.lpush(this.queueKey, value);
  };

  public async rightPush(value: string): Promise<void>{
    this.redis.rpush(this.queueKey, value);
  };
}