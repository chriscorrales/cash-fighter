import { PORT } from "./src/settings";

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    return new Response("Bun!");
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);