import { PlaylistType, PublishStatus, Visibility } from "@prisma/client";
import { Router } from "express";

import {
  mapPlaylistDetail,
  mapPlaylistSummary,
  playlistDetailInclude,
} from "../lib/playlistMaps.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/requireAuth.js";
import { syncPlaylistStats } from "../lib/playlistStats.js";
import { slugify } from "../utils/slug.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const playlistsRouter = Router();

async function loadPlaylistDetail(playlistId: string) {
  return prisma.playlist.findUnique({
    where: { id: playlistId },
    include: playlistDetailInclude,
  });
}

async function assertPlaylistOwner(playlistId: string, userId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { id: true, ownerId: true },
  });

  if (!playlist) {
    return { error: "not_found" as const };
  }

  if (playlist.ownerId !== userId) {
    return { error: "forbidden" as const };
  }

  return { playlist };
}

playlistsRouter.get("/", async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);
    const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
    const visibility = typeof req.query.visibility === "string" ? req.query.visibility : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const where = {
      ...(ownerId ? { ownerId } : {}),
      ...(visibility ? { visibility: visibility as Visibility } : {}),
      ...(status ? { status: status as PublishStatus } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        include: {
          owner: true,
          tags: { include: { tag: true } },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.playlist.count({ where }),
    ]);

    res.json({
      data: items.map(mapPlaylistSummary),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    next(error);
  }
});

playlistsRouter.get("/:playlistId", async (req, res, next) => {
  try {
    const playlist = await loadPlaylistDetail(req.params.playlistId);

    if (!playlist) {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist ${req.params.playlistId} was not found.`,
      });
    }

    return res.json(mapPlaylistDetail(playlist));
  } catch (error) {
    return next(error);
  }
});

playlistsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body as {
      ownerId: string;
      title: string;
      description?: string | null;
      coverArtUrl?: string | null;
      type?: PlaylistType;
      visibility?: Visibility;
      status?: PublishStatus;
      publishedAt?: string | null;
    };

    const owner = await prisma.user.findUnique({
      where: { id: body.ownerId },
      select: { id: true },
    });

    if (!owner) {
      return res.status(404).json({
        error: "owner_not_found",
        message: `User ${body.ownerId} does not exist.`,
      });
    }

    const baseSlug = slugify(body.title) || "playlist";
    let slug = baseSlug;
    let suffix = 1;

    while (await prisma.playlist.findUnique({ where: { slug }, select: { id: true } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const created = await prisma.playlist.create({
      data: {
        ownerId: body.ownerId,
        title: body.title,
        slug,
        description: body.description ?? null,
        coverArtUrl: body.coverArtUrl ?? null,
        type: body.type ?? "PLAYLIST",
        visibility: body.visibility ?? "PUBLIC",
        status: body.status ?? "DRAFT",
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      },
      include: playlistDetailInclude,
    });

    return res.status(201).json(mapPlaylistDetail(created));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return res.status(409).json({
        error: "playlist_conflict",
        message: "A playlist with that unique value already exists.",
      });
    }

    return next(error);
  }
});

playlistsRouter.patch("/:playlistId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const access = await assertPlaylistOwner(req.params.playlistId, auth.user.id);
    if (access.error === "not_found") {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist ${req.params.playlistId} was not found.`,
      });
    }
    if (access.error === "forbidden") {
      return res.status(403).json({
        error: "forbidden",
        message: "You do not own this playlist.",
      });
    }

    const body = req.body as {
      title?: string;
      description?: string | null;
      coverArtUrl?: string | null;
      type?: PlaylistType;
      visibility?: Visibility;
      status?: PublishStatus;
      isPinnedOnProfile?: boolean;
      publishedAt?: string | null;
    };

    const updated = await prisma.playlist.update({
      where: { id: req.params.playlistId },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.coverArtUrl !== undefined ? { coverArtUrl: body.coverArtUrl } : {}),
        ...(body.type ? { type: body.type } : {}),
        ...(body.visibility ? { visibility: body.visibility } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.isPinnedOnProfile !== undefined
          ? { isPinnedOnProfile: body.isPinnedOnProfile }
          : {}),
        ...(body.publishedAt !== undefined
          ? { publishedAt: body.publishedAt ? new Date(body.publishedAt) : null }
          : {}),
        ...(body.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      },
      include: playlistDetailInclude,
    });

    return res.json(mapPlaylistDetail(updated));
  } catch (error) {
    return next(error);
  }
});

playlistsRouter.post("/:playlistId/items", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const access = await assertPlaylistOwner(req.params.playlistId, auth.user.id);
    if (access.error === "not_found") {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist ${req.params.playlistId} was not found.`,
      });
    }
    if (access.error === "forbidden") {
      return res.status(403).json({ error: "forbidden", message: "You do not own this playlist." });
    }

    const body = req.body as { recordingId: string };

    const recording = await prisma.recording.findUnique({
      where: { id: body.recordingId },
      select: { id: true },
    });

    if (!recording) {
      return res.status(404).json({
        error: "recording_not_found",
        message: `Recording ${body.recordingId} was not found.`,
      });
    }

    const maxPosition = await prisma.playlistItem.aggregate({
      where: { playlistId: req.params.playlistId },
      _max: { position: true },
    });

    await prisma.playlistItem.create({
      data: {
        playlistId: req.params.playlistId,
        recordingId: body.recordingId,
        position: (maxPosition._max.position ?? 0) + 1,
        addedById: auth.user.id,
      },
    });

    await syncPlaylistStats(req.params.playlistId);

    const playlist = await loadPlaylistDetail(req.params.playlistId);
    return res.json(mapPlaylistDetail(playlist!));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return res.status(409).json({
        error: "item_conflict",
        message: "That recording is already in this playlist.",
      });
    }

    return next(error);
  }
});

playlistsRouter.delete("/:playlistId/items/:recordingId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const access = await assertPlaylistOwner(req.params.playlistId, auth.user.id);
    if (access.error === "not_found") {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist ${req.params.playlistId} was not found.`,
      });
    }
    if (access.error === "forbidden") {
      return res.status(403).json({ error: "forbidden", message: "You do not own this playlist." });
    }

    await prisma.playlistItem.deleteMany({
      where: {
        playlistId: req.params.playlistId,
        recordingId: req.params.recordingId,
      },
    });

    const items = await prisma.playlistItem.findMany({
      where: { playlistId: req.params.playlistId },
      orderBy: { position: "asc" },
    });

    await prisma.$transaction(
      items.map((item, index) =>
        prisma.playlistItem.update({
          where: { id: item.id },
          data: { position: index + 1 },
        }),
      ),
    );

    await syncPlaylistStats(req.params.playlistId);

    const playlist = await loadPlaylistDetail(req.params.playlistId);
    return res.json(mapPlaylistDetail(playlist!));
  } catch (error) {
    return next(error);
  }
});

playlistsRouter.put("/:playlistId/items/reorder", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const access = await assertPlaylistOwner(req.params.playlistId, auth.user.id);
    if (access.error === "not_found") {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist ${req.params.playlistId} was not found.`,
      });
    }
    if (access.error === "forbidden") {
      return res.status(403).json({ error: "forbidden", message: "You do not own this playlist." });
    }

    const body = req.body as { recordingIds: string[] };

    await prisma.$transaction(
      body.recordingIds.map((recordingId, index) =>
        prisma.playlistItem.updateMany({
          where: { playlistId: req.params.playlistId, recordingId },
          data: { position: index + 1 },
        }),
      ),
    );

    await syncPlaylistStats(req.params.playlistId);

    const playlist = await loadPlaylistDetail(req.params.playlistId);
    return res.json(mapPlaylistDetail(playlist!));
  } catch (error) {
    return next(error);
  }
});

playlistsRouter.delete("/:playlistId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const access = await assertPlaylistOwner(req.params.playlistId, auth.user.id);
    if (access.error === "not_found") {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist ${req.params.playlistId} was not found.`,
      });
    }
    if (access.error === "forbidden") {
      return res.status(403).json({ error: "forbidden", message: "You do not own this playlist." });
    }

    await prisma.playlist.delete({ where: { id: req.params.playlistId } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
