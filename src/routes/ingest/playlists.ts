import { Router } from "express";

import { requireApiKeyAuth } from "../../lib/apiKeyAuth.js";
import { resolveUploadAsset } from "../../lib/ingestAsset.js";
import { prisma } from "../../lib/prisma.js";
import { resolveUniquePlaylistSlug } from "../../lib/playlistSlug.js";

export const ingestPlaylistsRouter = Router();

const PLAYLIST_SELECT = {
  id: true,
  ownerId: true,
  title: true,
  slug: true,
  description: true,
  coverArtUrl: true,
  type: true,
  visibility: true,
  status: true,
  externalSource: true,
  externalId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapPlaylist(p: {
  id: string; ownerId: string; title: string; slug: string;
  description: string | null; coverArtUrl: string | null; type: string;
  visibility: string; status: string; externalSource: string | null;
  externalId: string | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: p.id,
    ownerId: p.ownerId,
    title: p.title,
    slug: p.slug,
    description: p.description,
    coverArtUrl: p.coverArtUrl,
    type: p.type,
    visibility: p.visibility,
    status: p.status,
    externalSource: p.externalSource,
    externalId: p.externalId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

ingestPlaylistsRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireApiKeyAuth(req, res);
    if (!auth) return;

    const body = req.body as {
      externalSource: string;
      externalId: string;
      title: string;
      description?: string | null;
      visibility?: string;
      type?: string;
      coverUploadId?: string | null;
    };

    // Resolve cover image if provided
    let coverArtUrl: string | null = null;
    if (body.coverUploadId) {
      const result = await resolveUploadAsset(body.coverUploadId, auth.user.id, "image");
      if ("assetError" in result) {
        return res.status(result.assetError.status).json({
          error: result.assetError.error,
          message: result.assetError.message,
        });
      }
      coverArtUrl = result.asset.url;
    }

    const visibility = (body.visibility ?? "PRIVATE") as "PUBLIC" | "UNLISTED" | "PRIVATE";

    // Owner-scoped lookup by externalSource + externalId
    const existing = await prisma.playlist.findFirst({
      where: {
        ownerId: auth.user.id,
        externalSource: body.externalSource,
        externalId: body.externalId,
      },
      select: PLAYLIST_SELECT,
    });

    if (existing) {
      const updated = await prisma.playlist.update({
        where: { id: existing.id },
        data: {
          title: body.title,
          description: body.description ?? null,
          coverArtUrl: coverArtUrl ?? existing.coverArtUrl,
          visibility,
          ...(body.type ? { type: body.type as any } : {}),
        },
        select: PLAYLIST_SELECT,
      });
      return res.status(200).json({ created: false, playlist: mapPlaylist(updated) });
    }

    const slug = await resolveUniquePlaylistSlug(auth.user.id, body.title);

    const created = await prisma.playlist.create({
      data: {
        ownerId: auth.user.id,
        title: body.title,
        slug,
        description: body.description ?? null,
        coverArtUrl,
        visibility,
        type: (body.type as any) ?? "PLAYLIST",
        status: "DRAFT",
        externalSource: body.externalSource,
        externalId: body.externalId,
      },
      select: PLAYLIST_SELECT,
    });

    return res.status(201).json({ created: true, playlist: mapPlaylist(created) });
  } catch (error) {
    return next(error);
  }
});

ingestPlaylistsRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireApiKeyAuth(req, res);
    if (!auth) return;

    const externalSource = typeof req.query.externalSource === "string" ? req.query.externalSource : undefined;
    const externalId = typeof req.query.externalId === "string" ? req.query.externalId : undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 50)));

    const where = {
      ownerId: auth.user.id,
      ...(externalSource ? { externalSource } : {}),
      ...(externalId ? { externalId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        select: PLAYLIST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.playlist.count({ where }),
    ]);

    return res.json({
      data: items.map(mapPlaylist),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});
