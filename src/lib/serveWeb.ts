import express from "express";
import fs from "node:fs";
import path from "node:path";

import { isSpaRoute } from "./spaRoutes.js";
import { buildShareHtml, readIndexHtmlTemplate, sendShareHtml, shouldInjectShareHtml } from "../share/shareHtml.js";

const WEB_DIST = path.resolve(process.cwd(), "apps/web/dist");
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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

        if (relativePath.startsWith("og/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }

        if (path.basename(filePath) === "index.html") {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  app.get("*", async (req, res, next) => {
    if (!shouldInjectShareHtml(req)) {
      return next();
    }
    if (!isSpaRoute(req.path)) {
      return next();
    }

    try {
      const template = readIndexHtmlTemplate();
      const html = await buildShareHtml(template, req);
      sendShareHtml(res, html);
    } catch (error) {
      next(error);
    }
  });
}
