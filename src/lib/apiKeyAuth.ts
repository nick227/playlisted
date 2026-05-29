import crypto from "node:crypto";
import type { Request, Response } from "express";

import { prisma } from "./prisma.js";

const KEY_PREFIX = "plt_";

export function generateApiKey(): string {
  return KEY_PREFIX + crypto.randomBytes(32).toString("hex");
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function getApiKeyPrefix(key: string): string {
  return key.slice(0, 12);
}

export async function getApiKeyFromRequest(req: { headers: { authorization?: string } }) {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  if (!token.startsWith(KEY_PREFIX)) return null;

  const keyHash = hashApiKey(token);
  const now = new Date();

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    include: { user: true },
  });

  if (!apiKey) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: now },
  });

  return { apiKey, user: apiKey.user };
}

export async function requireApiKeyAuth(req: Request, res: Response) {
  const ctx = await getApiKeyFromRequest(req);
  if (!ctx) {
    res.status(401).json({
      error: "unauthorized",
      message: "A valid API key is required.",
    });
    return null;
  }
  if (ctx.user.status !== "ACTIVE") {
    res.status(403).json({
      error: "forbidden",
      message: "Your account is not active.",
    });
    return null;
  }
  return ctx;
}
