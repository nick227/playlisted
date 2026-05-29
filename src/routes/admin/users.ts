import { UserRole, UserStatus } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

export const adminUsersRouter = Router();

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

    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Math.min(Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE), 100);
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

    const data: Record<string, unknown> = {};
    if (body.role !== undefined) data.role = body.role as UserRole;
    if (body.status !== undefined) data.status = body.status as UserStatus;
    if (body.isFeaturedArtist !== undefined) data.isFeaturedArtist = body.isFeaturedArtist;

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data,
    });

    return res.json(mapUserSummary(user));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "user_not_found", message: "User not found." });
    }
    return next(error);
  }
});
