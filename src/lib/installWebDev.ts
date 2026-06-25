import fs from "node:fs";
import path from "node:path";
import type express from "express";
import type { ViteDevServer } from "vite";

import { isSpaRoute } from "./spaRoutes.js";

const WEB_ROOT = path.resolve(process.cwd(), "apps/web");
const WEB_DIST = path.resolve(WEB_ROOT, "dist");
const INDEX_HTML = path.join(WEB_ROOT, "index.html");

export function shouldUseViteDev(): boolean {
  if (process.env.SERVE_WEB_DIST === "1") return false;
  if (process.env.NODE_ENV === "production") return false;
  // Railway sets RAILWAY_ENVIRONMENT; prefer built assets when dist exists even if NODE_ENV was omitted.
  if (process.env.RAILWAY_ENVIRONMENT && fs.existsSync(WEB_DIST)) return false;
  return fs.existsSync(WEB_ROOT);
}

export async function installWebDev(app: express.Application): Promise<ViteDevServer> {
  const { createServer: createViteServer } = await import("vite");

  const vite = await createViteServer({
    root: WEB_ROOT,
    configFile: path.join(WEB_ROOT, "vite.config.ts"),
    server: {
      middlewareMode: true,
      // Railway (and other proxies) send a public Host header; allow when dev middleware is active.
      allowedHosts: [".railway.app", "localhost", "127.0.0.1", ".localhost"],
    },
    appType: "spa",
  });

  app.use(vite.middlewares);

  app.get("*", async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    if (!isSpaRoute(req.path)) {
      return next();
    }

    try {
      const template = fs.readFileSync(INDEX_HTML, "utf-8");
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).setHeader("Content-Type", "text/html").end(html);
    } catch (error) {
      if (error instanceof Error) {
        vite.ssrFixStacktrace(error);
      }
      next(error);
    }
  });

  return vite;
}
