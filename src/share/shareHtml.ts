import fs from "node:fs";
import path from "node:path";

import type express from "express";

import { injectShareMeta } from "./injectShareMeta.js";
import { resolveShareMeta } from "./shareMeta.js";
import { acceptsHtml, getRequestOrigin, normalizeSharePathname } from "./shareRequest.js";
import { SHARE_CACHE_CONTROL } from "./constants.js";

const WEB_ROOT = path.resolve(process.cwd(), "apps/web");
const WEB_DIST = path.resolve(WEB_ROOT, "dist");
const DEV_INDEX_HTML = path.join(WEB_ROOT, "index.html");
const DIST_INDEX_HTML = path.join(WEB_DIST, "index.html");

let cachedTemplate: string | null = null;
let cachedTemplatePath: string | null = null;

function resolveIndexHtmlPath(): string {
  if (fs.existsSync(DIST_INDEX_HTML)) return DIST_INDEX_HTML;
  return DEV_INDEX_HTML;
}

export function readIndexHtmlTemplate(): string {
  const indexPath = resolveIndexHtmlPath();
  if (cachedTemplate && cachedTemplatePath === indexPath) {
    return cachedTemplate;
  }

  cachedTemplate = fs.readFileSync(indexPath, "utf-8");
  cachedTemplatePath = indexPath;
  return cachedTemplate;
}

export function clearIndexHtmlTemplateCache(): void {
  cachedTemplate = null;
  cachedTemplatePath = null;
}

export async function buildShareHtml(template: string, req: express.Request): Promise<string> {
  const origin = getRequestOrigin(req);
  const pathname = normalizeSharePathname(req.path);
  const meta = await resolveShareMeta(pathname, origin);
  return injectShareMeta(template, meta);
}

export function sendShareHtml(res: express.Response, html: string): void {
  res
    .status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Cache-Control", SHARE_CACHE_CONTROL)
    .send(html);
}

export function shouldInjectShareHtml(req: express.Request): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  return acceptsHtml(req);
}
