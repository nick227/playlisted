import { Router } from "express";

import { requireAdmin } from "../../lib/requireAdmin.js";
import { prisma } from "../../lib/prisma.js";

export const adminDeveloperKeysRouter = Router();

function mapKey(key: {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  user: { id: string; email: string; username: string; displayName: string };
}) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    user: key.user,
  };
}

adminDeveloperKeysRouter.get("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 50));
    const status = typeof req.query.status === "string" ? req.query.status : "all";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;

    const where = {
      ...(status === "active" ? { revokedAt: null } : {}),
      ...(status === "revoked" ? { revokedAt: { not: null } } : {}),
      ...(userId ? { userId } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q } },
          { prefix: { contains: q } },
          { user: { email: { contains: q } } },
          { user: { username: { contains: q } } },
          { user: { displayName: { contains: q } } },
        ],
      } : {}),
    };

    const [keys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, username: true, displayName: true } },
        },
        orderBy: [{ revokedAt: "asc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.apiKey.count({ where }),
    ]);

    const [totalActive, totalRevoked, usedLast7d] = await Promise.all([
      prisma.apiKey.count({ where: { revokedAt: null } }),
      prisma.apiKey.count({ where: { revokedAt: { not: null } } }),
      prisma.apiKey.count({
        where: {
          revokedAt: null,
          lastUsedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return res.json({
      data: keys.map(mapKey),
      meta: { page, pageSize, total },
      stats: { totalActive, totalRevoked, usedLast7d },
    });
  } catch (error) {
    return next(error);
  }
});

adminDeveloperKeysRouter.delete("/:keyId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const { keyId } = req.params;

    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, revokedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ error: "not_found", message: "API key not found or already revoked." });
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
