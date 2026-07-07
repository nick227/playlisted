import type express from "express";

import { PUBLIC_ORIGIN } from "./constants.js";

export function getRequestOrigin(req: express.Request): string {
  if (process.env.PUBLIC_SITE_URL) {
    return PUBLIC_ORIGIN;
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const proto = forwardedProto ? forwardedProto.split(",")[0]?.trim() : req.protocol;
  const forwardedHost = req.get("x-forwarded-host");
  const host = forwardedHost ? forwardedHost.split(",")[0]?.trim() : req.get("host");
  if (!host) return PUBLIC_ORIGIN;
  return `${proto}://${host}`;
}

export function acceptsHtml(req: express.Request): boolean {
  const accept = req.get("accept") ?? "";
  if (!accept) return true;
  if (accept.includes("text/html")) return true;
  if (accept.includes("*/*") && !accept.includes("application/json")) return true;
  return false;
}

export function normalizeSharePathname(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? "/";
  const withoutHash = withoutQuery.split("#")[0] ?? "/";
  if (!withoutHash.startsWith("/")) return `/${withoutHash}`;
  return withoutHash;
}
