import { serve } from "bun";
import { PORT } from "./settings";
import { RoutesServer } from "./server";
import { RedisPublisher } from "./services/Publishers/redisPublisher";
import { RedisDatabase } from "./services/Database/redisDatabase";

async function main(){
  const publisher = new RedisPublisher();
  const database = new RedisDatabase();

  const serverRoutes = new RoutesServer(publisher, database);

  serve({
    port: PORT,
    fetch: serverRoutes.fetch.bind(serverRoutes),
  })

  console.log(`Running ${PORT}`)
}

main();