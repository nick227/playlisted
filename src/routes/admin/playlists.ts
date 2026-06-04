import { PlaylistType, PublishStatus, Visibility } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

const VALID_VISIBILITY = new Set<string>(["PUBLIC", "UNLISTED", "PRIVATE"]);
const VALID_STATUS = new Set<string>(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const adminPlaylistsRouter = Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

const adminPlaylistInclude = {
  owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true, kind: true } } } },
  _count: { select: { saves: true, playbackEvents: true } },
} as const;

function isPrismaRetryable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code: string }).code === "P2034") return true;
  return error instanceof Error && /deadlock|write conflict/i.test(error.message);
}

async function replacePlaylistGenreTags(playlistId: string, tagIds: string[]) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.playlistTag.deleteMany({ where: { playlistId } });
        if (tagIds.length > 0) {
          await tx.playlistTag.createMany({
            data: tagIds.map((tagId) => ({ playlistId, tagId })),
            skipDuplicates: true,
          });
        }
      });
      return;
    } catch (error) {
      if (!isPrismaRetryable(error) || attempt === maxAttempts) throw error;
      await new Promise((r) => setTimeout(r, 25 * attempt));
    }
  }
}

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

    const page = Math.max(1, parseInt(req.query.page as string, 10) || DEFAULT_PAGE);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || DEFAULT_PAGE_SIZE));
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const visibility = typeof req.query.visibility === "string" ? req.query.visibility : undefined;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const featured = req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined;
    const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
    const genreSlug = typeof req.query.genre === "string" ? req.query.genre : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const rawSortBy = req.query.sortBy as string;
    const sortBy = ["saves", "items", "duration", "title", "createdAt"].includes(rawSortBy) ? rawSortBy : "createdAt";
    const order: "asc" | "desc" = req.query.order === "asc" ? "asc" : "desc";

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
        include: adminPlaylistInclude,
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
      title?: string;
      status?: string;
      visibility?: string;
      featured?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        return res.status(400).json({ error: "invalid_title", message: "Title cannot be empty." });
      }
      data.title = title;
    }
    if (body.status !== undefined) {
      if (!VALID_STATUS.has(body.status)) {
        return res.status(400).json({
          error: "invalid_status",
          message: `Invalid status '${body.status}'.`,
        });
      }
      data.status = body.status as PublishStatus;
    }
    if (body.visibility !== undefined) {
      if (!VALID_VISIBILITY.has(body.visibility)) {
        return res.status(400).json({
          error: "invalid_visibility",
          message: `Invalid visibility '${body.visibility}'.`,
        });
      }
      data.visibility = body.visibility as Visibility;
    }
    if (body.featured !== undefined) data.featured = body.featured;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: "invalid_body",
        message: "At least one of title, status, visibility, or featured must be provided.",
      });
    }

    const playlist = await prisma.playlist.update({
      where: { id: req.params.playlistId },
      data,
      include: adminPlaylistInclude,
    });

    return res.json(mapPlaylist(playlist));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "playlist_not_found", message: "Playlist not found." });
    }
    return next(error);
  }
});

adminPlaylistsRouter.put("/:playlistId/tags", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const { tagIds } = req.body as { tagIds?: unknown };
    if (!Array.isArray(tagIds) || tagIds.some((id) => typeof id !== "string")) {
      return res.status(400).json({ error: "invalid_body", message: "tagIds must be an array of tag ID strings." });
    }

    const ids: string[] = tagIds as string[];

    if (ids.length > 0) {
      const tags = await prisma.tag.findMany({
        where: { id: { in: ids }, kind: "GENRE" },
        select: { id: true },
      });
      if (tags.length !== ids.length) {
        return res.status(400).json({ error: "invalid_tags", message: "One or more tag IDs are not valid GENRE tags." });
      }
    }

    await replacePlaylistGenreTags(req.params.playlistId, ids);

    const playlist = await prisma.playlist.findUnique({
      where: { id: req.params.playlistId },
      include: adminPlaylistInclude,
    });

    if (!playlist) {
      return res.status(404).json({ error: "playlist_not_found", message: "Playlist not found." });
    }

    return res.json(mapPlaylist(playlist));
  } catch (error) {
    return next(error);
  }
});
