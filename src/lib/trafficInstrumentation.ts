import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";

import { getBearerToken, hashSessionToken } from "./auth.js";
import { enqueueTrafficEvent } from "./trafficEventBuffer.js";

const VISITOR_HEADER = "x-playlisted-visitor-id";
const VISITOR_COOKIE = "plt_visitor";
const MAX_PATH_LENGTH = 2048;
const MAX_REFERRER_LENGTH = 2048;
const MAX_UA_LENGTH = 512;

const BOT_PATTERNS = [
  { pattern: /bot|crawl|spider|slurp|bingpreview/i, reason: "crawler" },
  { pattern: /uptime|pingdom|statuscake|healthcheck/i, reason: "monitor" },
  { pattern: /curl|wget|python-requests|httpclient|postman/i, reason: "scripted_client" },
];

function truncate(value: string | undefined, maxLength: number) {
  if (!value) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function parseCookie(header: string | undefined, key: string) {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === key) {
      return decodeURIComponent(rawValue.join("="));
    }
  }
  return null;
}

function isValidVisitorId(value: string | null | undefined) {
  return Boolean(value && /^[a-zA-Z0-9_-]{12,64}$/.test(value));
}

function generateVisitorId() {
  return crypto.randomBytes(18).toString("base64url");
}

function getVisitorId(req: Request, res: Response) {
  const headerVisitorId = req.header(VISITOR_HEADER);
  const cookieVisitorId = parseCookie(req.header("cookie"), VISITOR_COOKIE);
  const visitorId = isValidVisitorId(headerVisitorId)
    ? headerVisitorId!
    : isValidVisitorId(cookieVisitorId)
      ? cookieVisitorId!
      : generateVisitorId();

  if (visitorId !== cookieVisitorId) {
    res.cookie(VISITOR_COOKIE, visitorId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }

  return visitorId;
}

function hashIp(ip: string | undefined) {
  if (!ip) return null;
  const salt = process.env.TRAFFIC_IP_HASH_SALT ?? process.env.SESSION_SECRET ?? "playlisted-dev-traffic-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function classifyBot(userAgent: string | null) {
  if (!userAgent) return { isBot: false, botReason: null };
  const match = BOT_PATTERNS.find((item) => item.pattern.test(userAgent));
  return match ? { isBot: true, botReason: match.reason } : { isBot: false, botReason: null };
}

function normalizedPath(req: Request) {
  try {
    return truncate(new URL(req.originalUrl || req.url, "http://playlisted.local").pathname, MAX_PATH_LENGTH) ?? "/";
  } catch {
    return truncate(req.path || "/", MAX_PATH_LENGTH) ?? "/";
  }
}

function shouldLogRequest(req: Request) {
  if (req.path === "/openapi.yaml" || req.path.startsWith("/docs")) return false;
  if (req.path.startsWith("/uploads")) return true;
  if (req.path.startsWith("/api/")) return true;
  if (req.method === "GET" && !req.path.includes(".")) return true;
  return false;
}

function getSessionTokenHash(req: Request) {
  const token = getBearerToken(req.header("authorization"));
  if (!token || token.startsWith("plt_")) {
    return null;
  }

  return hashSessionToken(token);
}

export function trafficInstrumentation(req: Request, res: Response, next: NextFunction) {
  if (!shouldLogRequest(req)) {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();
  const visitorId = getVisitorId(req, res);
  const userAgent = truncate(req.header("user-agent"), MAX_UA_LENGTH);
  const { isBot, botReason } = classifyBot(userAgent);

  res.on("finish", () => {
    const latencyMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    const bytesHeader = res.getHeader("content-length");
    const bytesSent =
      typeof bytesHeader === "number"
        ? BigInt(bytesHeader)
        : typeof bytesHeader === "string" && /^\d+$/.test(bytesHeader)
          ? BigInt(bytesHeader)
          : null;

    enqueueTrafficEvent({
      eventType: "REQUEST",
      visitorId,
      sessionTokenHash: getSessionTokenHash(req),
      path: normalizedPath(req),
      method: req.method,
      status: res.statusCode,
      latencyMs: Math.max(0, Math.min(latencyMs, 4_294_967_295)),
      ipHash: hashIp(req.ip),
      userAgent,
      referrer: truncate(req.header("referer") ?? req.header("referrer"), MAX_REFERRER_LENGTH),
      isBot,
      botReason,
      bytesSent,
      createdAt: new Date(),
    });
  });

  next();
}
