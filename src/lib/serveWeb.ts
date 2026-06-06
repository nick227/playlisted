import express from "express";
import fs from "node:fs";
import path from "node:path";

const WEB_DIST = path.resolve(process.cwd(), "apps/web/dist");
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SPA_EXCLUDED_PREFIXES = ["/api/", "/uploads/", "/docs", "/openapi.yaml"];
const STATIC_ASSET_PREFIXES = ["/assets/"];
const STATIC_ASSET_EXTENSIONS = new Set([
  ".css",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".map",
  ".png",
  ".svg",
  ".txt",
  ".webmanifest",
  ".webp",
  ".woff",
  ".woff2",
]);

function isSpaRoute(pathname: string) {
  if (SPA_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (STATIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  return !STATIC_ASSET_EXTENSIONS.has(path.extname(pathname).toLowerCase());
}

export function installWebApp(app: express.Application) {
  if (!fs.existsSync(WEB_DIST)) {
    console.warn("apps/web/dist missing; API-only mode (no SPA static files).");
    return;
  }

  app.use(
    express.static(WEB_DIST, {
      index: false,
      setHeaders(res, filePath) {
        const relativePath = path.relative(WEB_DIST, filePath).replaceAll(path.sep, "/");
        if (relativePath.startsWith("assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.setHeader("Expires", new Date(Date.now() + ONE_YEAR_MS).toUTCString());
          return;
        }

        if (path.basename(filePath) === "index.html") {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  app.get("*", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    if (!isSpaRoute(req.path)) {
      return next();
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(WEB_DIST, "index.html"));
  });
}
