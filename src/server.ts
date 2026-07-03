import type { ViteDevServer } from "vite";

import { createApp, installAppErrorHandlers } from "./app.js";
import { installWebDev, shouldUseViteDev } from "./lib/installWebDev.js";
import { isApiDocsEnabled } from "./lib/apiDocs.js";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const shutdownMs = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000);
// Node's default requestTimeout (5 min) covers the entire request body, which
// kills 250 MB video uploads on slow uplinks mid-transfer with no response.
// Match the web client's 30-minute upload budget.
const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS ?? 30 * 60_000);

let vite: ViteDevServer | undefined;
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

async function start() {
  const useViteDev = shouldUseViteDev();
  const app = createApp({ skipWeb: useViteDev });

  if (useViteDev) {
    vite = await installWebDev(app);
    installAppErrorHandlers(app);
  }

  server = app.listen(port, host, () => {
    const mode = process.env.NODE_ENV ?? "development";
    console.log(`Playlisted listening on http://${host}:${port} (${mode})`);
    if (useViteDev) {
      console.log(`Web app with hot reload at http://localhost:${port}`);
    }
    if (isApiDocsEnabled()) {
      console.log(`OpenAPI docs at http://localhost:${port}/docs`);
    }
  });
  server.requestTimeout = requestTimeoutMs;
}

function shutdown(signal: string) {
  console.log(`Received ${signal}, closing server…`);
  const closeServer = () => server.close(() => process.exit(0));
  if (vite) {
    void vite.close().then(closeServer).catch(closeServer);
    return;
  }
  closeServer();
  setTimeout(() => process.exit(1), shutdownMs).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
