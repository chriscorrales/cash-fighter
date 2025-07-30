import { createClient } from "redis";
import { REDIS_URL } from "./settings";

const clientRedis = await createClient({ url: REDIS_URL })
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

export default clientRedis;