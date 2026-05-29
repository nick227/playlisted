import { PublishStatus, RecordingType, Visibility } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

export const adminSongsRouter = Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

function mapSong(r: any) {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    audioUrl: r.audioUrl,
    artworkUrl: r.artworkUrl ?? null,
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
          publishedPlaylist: { select: { id: true, title: true, slug: true } },
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

adminSongsRouter.patch("/:songId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const body = req.body as {
      status?: string;
      visibility?: string;
      explicit?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status as PublishStatus;
    if (body.visibility !== undefined) data.visibility = body.visibility as Visibility;
    if (body.explicit !== undefined) data.explicit = body.explicit;

    const recording = await prisma.recording.update({
      where: { id: req.params.songId },
      data,
      include: {
        uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        publishedPlaylist: { select: { id: true, title: true, slug: true } },
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
