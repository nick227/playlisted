import { PlaylistType, PublishStatus, Visibility } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

export const adminPlaylistsRouter = Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

function mapPlaylist(p: any) {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    coverArtUrl: p.coverArtUrl ?? null,
    type: p.type,
    visibility: p.visibility,
    status: p.status,
    featured: p.featured,
    itemCount: p.itemCount,
    totalDurationSeconds: p.totalDurationSeconds,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    owner: {
      id: p.owner.id,
      username: p.owner.username,
      displayName: p.owner.displayName,
      avatarUrl: p.owner.avatarUrl ?? null,
    },
    tags: (p.tags ?? []).map((t: any) => ({
      id: t.tag.id,
      name: t.tag.name,
      slug: t.tag.slug,
      kind: t.tag.kind,
    })),
    savesCount: p._count?.saves ?? 0,
    playCount: p._count?.playbackEvents ?? 0,
  };
}

adminPlaylistsRouter.get("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const page = Math.max(1, Number(req.query.page ?? DEFAULT_PAGE));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE)));
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const visibility = typeof req.query.visibility === "string" ? req.query.visibility : undefined;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const featured = req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined;
    const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
    const genreSlug = typeof req.query.genre === "string" ? req.query.genre : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const sortBy = (req.query.sortBy as string) ?? "createdAt";
    const order = ((req.query.order as string) ?? "desc") as "asc" | "desc";

    const where: any = {
      ...(status ? { status: status as PublishStatus } : {}),
      ...(visibility ? { visibility: visibility as Visibility } : {}),
      ...(type ? { type: type as PlaylistType } : {}),
      ...(featured !== undefined ? { featured } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(q ? { title: { contains: q } } : {}),
      ...(genreSlug ? { tags: { some: { tag: { slug: genreSlug } } } } : {}),
    };

    const orderBy: any = sortBy === "saves"
      ? { saves: { _count: order } }
      : sortBy === "items"
        ? { itemCount: order }
        : sortBy === "duration"
          ? { totalDurationSeconds: order }
          : sortBy === "title"
            ? { title: order }
            : { createdAt: order };

    const [items, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true, kind: true } } } },
          _count: { select: { saves: true, playbackEvents: true } },
        },
      }),
      prisma.playlist.count({ where }),
    ]);

    res.json({ data: items.map(mapPlaylist), meta: { page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

adminPlaylistsRouter.patch("/:playlistId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const body = req.body as {
      status?: string;
      visibility?: string;
      featured?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status as PublishStatus;
    if (body.visibility !== undefined) data.visibility = body.visibility as Visibility;
    if (body.featured !== undefined) data.featured = body.featured;

    const playlist = await prisma.playlist.update({
      where: { id: req.params.playlistId },
      data,
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true, kind: true } } } },
        _count: { select: { saves: true, playbackEvents: true } },
      },
    });

    return res.json(mapPlaylist(playlist));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "playlist_not_found", message: "Playlist not found." });
    }
    return next(error);
  }
});
