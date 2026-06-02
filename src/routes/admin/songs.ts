import { PublishStatus, RecordingType, Visibility } from "@prisma/client";
import { Router } from "express";

import { resolveRecordingArtworkUrl } from "../../lib/mediaUrls.js";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

const VALID_VISIBILITY = new Set<string>(["PUBLIC", "UNLISTED", "PRIVATE"]);
const VALID_STATUS = new Set<string>(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const adminSongsRouter = Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

function mapSong(r: any) {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    audioUrl: r.audioUrl,
    artworkUrl: resolveRecordingArtworkUrl(r, r.publishedPlaylist),
    durationSeconds: r.durationSeconds ?? null,
    recordingType: r.recordingType,
    visibility: r.visibility,
    status: r.status,
    explicit: r.explicit,
    playCount: r.playCount,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    uploader: {
      id: r.uploader.id,
      username: r.uploader.username,
      displayName: r.uploader.displayName,
      avatarUrl: r.uploader.avatarUrl ?? null,
    },
    playlist: {
      id: r.publishedPlaylist.id,
      title: r.publishedPlaylist.title,
      slug: r.publishedPlaylist.slug,
      coverArtUrl: r.publishedPlaylist.coverArtUrl,
    },
    tags: (r.tags ?? []).map((t: any) => ({
      id: t.tag.id,
      name: t.tag.name,
      slug: t.tag.slug,
      kind: t.tag.kind,
    })),
    savesCount: r._count?.saves ?? 0,
  };
}

adminSongsRouter.get("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || DEFAULT_PAGE);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || DEFAULT_PAGE_SIZE));
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const visibility = typeof req.query.visibility === "string" ? req.query.visibility : undefined;
    const recordingType = typeof req.query.recordingType === "string" ? req.query.recordingType : undefined;
    const explicit = req.query.explicit === "true" ? true : req.query.explicit === "false" ? false : undefined;
    const genreSlug = typeof req.query.genre === "string" ? req.query.genre : undefined;
    const uploaderId = typeof req.query.uploaderId === "string" ? req.query.uploaderId : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const rawSortBy = req.query.sortBy as string;
    const sortBy = ["plays", "title", "duration", "createdAt"].includes(rawSortBy) ? rawSortBy : "createdAt";
    const order: "asc" | "desc" = req.query.order === "asc" ? "asc" : "desc";

    const where: any = {
      ...(status ? { status: status as PublishStatus } : {}),
      ...(visibility ? { visibility: visibility as Visibility } : {}),
      ...(recordingType ? { recordingType: recordingType as RecordingType } : {}),
      ...(explicit !== undefined ? { explicit } : {}),
      ...(uploaderId ? { uploaderId } : {}),
      ...(q ? { title: { contains: q } } : {}),
      ...(genreSlug ? { tags: { some: { tag: { slug: genreSlug } } } } : {}),
    };

    const orderBy: any = sortBy === "plays"
      ? { playCount: order }
      : sortBy === "title"
        ? { title: order }
        : sortBy === "duration"
          ? { durationSeconds: order }
          : { createdAt: order };

    const [items, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          publishedPlaylist: { select: { id: true, title: true, slug: true, coverArtUrl: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true, kind: true } } } },
          _count: { select: { saves: true } },
        },
      }),
      prisma.recording.count({ where }),
    ]);

    res.json({ data: items.map(mapSong), meta: { page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

adminSongsRouter.put("/:songId/tags", async (req, res, next) => {
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

    await prisma.$transaction([
      prisma.recordingTag.deleteMany({ where: { recordingId: req.params.songId } }),
      ...(ids.length > 0
        ? [prisma.recordingTag.createMany({
            data: ids.map((tagId) => ({ recordingId: req.params.songId, tagId })),
            skipDuplicates: true,
          })]
        : []),
    ]);

    const recording = await prisma.recording.findUnique({
      where: { id: req.params.songId },
      include: {
        uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        publishedPlaylist: { select: { id: true, title: true, slug: true, coverArtUrl: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true, kind: true } } } },
        _count: { select: { saves: true } },
      },
    });

    if (!recording) {
      return res.status(404).json({ error: "song_not_found", message: "Song not found." });
    }

    return res.json(mapSong(recording));
  } catch (error) {
    return next(error);
  }
});

adminSongsRouter.patch("/:songId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const body = req.body as {
      title?: string;
      status?: string;
      visibility?: string;
      explicit?: boolean;
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
    if (body.explicit !== undefined) data.explicit = body.explicit;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: "invalid_body",
        message: "At least one of title, status, visibility, or explicit must be provided.",
      });
    }

    const recording = await prisma.recording.update({
      where: { id: req.params.songId },
      data,
      include: {
        uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        publishedPlaylist: { select: { id: true, title: true, slug: true, coverArtUrl: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true, kind: true } } } },
        _count: { select: { saves: true } },
      },
    });

    return res.json(mapSong(recording));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "song_not_found", message: "Song not found." });
    }
    return next(error);
  }
});

adminSongsRouter.delete("/:songId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    await prisma.recording.delete({ where: { id: req.params.songId } });
    return res.status(204).send();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "song_not_found", message: "Song not found." });
    }
    return next(error);
  }
});
