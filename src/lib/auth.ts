import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import { prisma } from "./prisma.js";

const SESSION_TTL_DAYS = 30;

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function getBearerToken(authorizationHeader?: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function getAuthContextFromRequest(req: { headers: { authorization?: string } }) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: now },
  });

  return {
    token,
    session,
    user: session.user,
  };
}
