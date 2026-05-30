import express from "express";
import fs from "node:fs";
import path from "node:path";

const WEB_DIST = path.resolve(process.cwd(), "apps/web/dist");
const SPA_EXCLUDED_PREFIXES = ["/api/", "/uploads/", "/docs", "/openapi.yaml"];

function isSpaRoute(pathname: string) {
  return !SPA_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function installWebApp(app: express.Application) {
  if (!fs.existsSync(WEB_DIST)) {
    console.warn("apps/web/dist missing; API-only mode (no SPA static files).");
    return;
  }

  app.use(express.static(WEB_DIST, { index: false }));

  app.get("*", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    if (!isSpaRoute(req.path)) {
      return next();
    }
    res.sendFile(path.join(WEB_DIST, "index.html"));
  });
}
