import { UserRole, UserStatus } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { isUserActive } from "../../lib/publicUserFilter.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

const VALID_ROLES = new Set<string>(["LISTENER", "CREATOR", "EDITOR", "ADMIN"]);
const VALID_STATUS = new Set<string>(["ACTIVE", "SUSPENDED", "INVITED"]);

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

export const adminUsersRouter = Router();

async function revokeUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function mapUserSummary(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    heroImageUrl: user.heroImageUrl ?? null,
    role: user.role,
    status: user.status,
    isFeaturedArtist: user.isFeaturedArtist,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

adminUsersRouter.get("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || DEFAULT_PAGE);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || DEFAULT_PAGE_SIZE));
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;

    const where = {
      ...(role ? { role: role as UserRole } : {}),
      ...(status ? { status: status as UserStatus } : {}),
      ...(q ? {
        OR: [
          { displayName: { contains: q } },
          { username: { contains: q } },
          { email: { contains: q } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ isFeaturedArtist: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: items.map(mapUserSummary), meta: { page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

adminUsersRouter.patch("/:userId", async (req, res, next) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    if (auth.user.id === req.params.userId) {
      return res.status(403).json({
        error: "forbidden",
        message: "You cannot modify your own account via the admin panel.",
      });
    }

    const body = req.body as {
      role?: string;
      status?: string;
      isFeaturedArtist?: boolean;
    };

    // Only ADMIN may assign roles or change account status — EDITOR has read access only here
    if (auth.user.role !== "ADMIN" && (body.role !== undefined || body.status !== undefined)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Only admins may change user roles or status.",
      });
    }

    const data: Record<string, unknown> = {};
    if (body.role !== undefined) {
      if (!VALID_ROLES.has(body.role)) {
        return res.status(400).json({
          error: "invalid_role",
          message: `Invalid role '${body.role}'.`,
        });
      }
      data.role = body.role as UserRole;
    }
    if (body.status !== undefined) {
      if (!VALID_STATUS.has(body.status)) {
        return res.status(400).json({
          error: "invalid_status",
          message: `Invalid status '${body.status}'.`,
        });
      }
      data.status = body.status as UserStatus;
    }
    if (body.isFeaturedArtist !== undefined) data.isFeaturedArtist = body.isFeaturedArtist;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: "invalid_body",
        message: "At least one of role, status, or isFeaturedArtist must be provided.",
      });
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data,
    });

    if (body.status !== undefined && !isUserActive(user)) {
      await revokeUserSessions(user.id);
    }

    return res.json(mapUserSummary(user));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "user_not_found", message: "User not found." });
    }
    return next(error);
  }
});
