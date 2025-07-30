import { serve } from "bun";
import { PORT } from "./settings";
import { RoutesServer } from "./server";

async function main(){
  const serverRoutes = new RoutesServer();

  serve({
    port: PORT,
    fetch: serverRoutes.fetch.bind(serverRoutes),
  })

  console.log(`Running ${PORT}`)
}

main();