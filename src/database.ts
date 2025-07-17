import { createClient } from "redis";
import { REDIS_URL } from "./settings";

const clientRedis = await createClient({ url: REDIS_URL })
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

export async function savePayment(processor: 'default' | 'fallback', amount: number, requestedAt: string) {
  const key = "payments:" + processor;
  await clientRedis.rPush(key, JSON.stringify({ amount, requestedAt }));
}

export default clientRedis;