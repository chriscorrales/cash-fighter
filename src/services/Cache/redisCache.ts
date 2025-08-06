import { Redis, type RedisOptions } from "ioredis";;
import { REDIS_HOST } from "../../settings";
import type { Cache } from "./interface";

const REDIS_CONFIG: RedisOptions = {
  host: REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}

export class RedisCache implements Cache<string> {
  private readonly redis: Redis;
  private readonly memoryCache: Map<string, string> = new Map();

  constructor(private readonly key: string, private readonly defaultTTL: number = 5000) {
    this.redis = new Redis(REDIS_CONFIG);
  }

  public async set(value: string) {
    this.redis.set(this.key, value, 'PX', this.defaultTTL);

    this.memoryCache.set(this.key, value);

    this.scheduleCleanup();
  }

  public async get() {
    const cached = this.memoryCache.get(this.key);

    if (cached) {
      return cached;
    }

    const value = await this.redis.get(this.key);

    if (value !== null) {
      this.memoryCache.set(this.key, value);

      this.scheduleCleanup();
    }

    return undefined;
  }

  private scheduleCleanup() {
    setTimeout(() => {
      this.memoryCache.delete(this.key);

    }, this.defaultTTL);
  }
}