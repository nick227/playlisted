import { createApp } from "./app.js";
import { isApiDocsEnabled } from "./lib/apiDocs.js";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const app = createApp();
const server = app.listen(port, host, () => {
  const mode = process.env.NODE_ENV ?? "development";
  console.log(`Playlisted listening on http://${host}:${port} (${mode})`);
  if (isApiDocsEnabled()) {
    console.log(`OpenAPI docs at http://localhost:${port}/docs`);
  }
});

const shutdownMs = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000);

function shutdown(signal: string) {
  console.log(`Received ${signal}, closing server…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), shutdownMs).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
