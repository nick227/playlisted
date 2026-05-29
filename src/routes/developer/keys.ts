import { Router } from "express";

import { generateApiKey, getApiKeyPrefix, hashApiKey } from "../../lib/apiKeyAuth.js";
import { requireAuth } from "../../lib/requireAuth.js";
import { prisma } from "../../lib/prisma.js";

export const developerKeysRouter = Router();

function mapApiKey(key: { id: string; name: string; prefix: string; lastUsedAt: Date | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
  };
}

// List all active API keys for the current user
developerKeysRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const keys = await prisma.apiKey.findMany({
      where: { userId: auth.user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ keys: keys.map(mapApiKey) });
  } catch (error) {
    return next(error);
  }
});

// Create a new API key — raw key shown once, never stored
developerKeysRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { name } = req.body as { name: string };

    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const prefix = getApiKeyPrefix(rawKey);

    const created = await prisma.apiKey.create({
      data: {
        userId: auth.user.id,
        name,
        keyHash,
        prefix,
      },
    });

    return res.status(201).json({
      ...mapApiKey(created),
      key: rawKey,
    });
  } catch (error) {
    return next(error);
  }
});

// Revoke an API key
developerKeysRouter.delete("/:keyId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { keyId } = req.params;

    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: auth.user.id, revokedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ error: "not_found", message: "API key not found." });
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
