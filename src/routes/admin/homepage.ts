import { HomepageSection } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

export const adminHomepageRouter = Router();

function mapFeature(f: any) {
  return {
    id: f.id,
    section: f.section,
    position: f.position,
    titleOverride: f.titleOverride ?? null,
    subtitleOverride: f.subtitleOverride ?? null,
    description: f.description ?? null,
    imageUrl: f.imageUrl ?? null,
    isActive: f.isActive,
    startsAt: f.startsAt?.toISOString() ?? null,
    endsAt: f.endsAt?.toISOString() ?? null,
    playlistId: f.playlistId ?? null,
    userId: f.userId ?? null,
    editorialPostId: f.editorialPostId ?? null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    playlist: f.playlist ? { id: f.playlist.id, title: f.playlist.title, coverArtUrl: f.playlist.coverArtUrl ?? null } : null,
    user: f.user ? { id: f.user.id, username: f.user.username, displayName: f.user.displayName, avatarUrl: f.user.avatarUrl ?? null } : null,
  };
}

const featureInclude = {
  playlist: { select: { id: true, title: true, coverArtUrl: true } },
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
};

adminHomepageRouter.get("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const features = await prisma.homepageFeature.findMany({
      include: featureInclude,
      orderBy: [{ section: "asc" }, { position: "asc" }],
    });

    res.json({ data: features.map(mapFeature) });
  } catch (error) {
    next(error);
  }
});

adminHomepageRouter.post("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const body = req.body as {
      section: string;
      position?: number;
      titleOverride?: string | null;
      subtitleOverride?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
      playlistId?: string | null;
      userId?: string | null;
    };

    const maxPos = await prisma.homepageFeature.findFirst({
      where: { section: body.section as HomepageSection },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = body.position ?? (maxPos ? maxPos.position + 1 : 0);

    const feature = await prisma.homepageFeature.create({
      data: {
        section: body.section as HomepageSection,
        position,
        titleOverride: body.titleOverride ?? null,
        subtitleOverride: body.subtitleOverride ?? null,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        isActive: body.isActive ?? true,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        playlistId: body.playlistId ?? null,
        userId: body.userId ?? null,
      },
      include: featureInclude,
    });

    return res.status(201).json(mapFeature(feature));
  } catch (error) {
    return next(error);
  }
});

adminHomepageRouter.patch("/:featureId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const body = req.body as {
      section?: string;
      position?: number;
      titleOverride?: string | null;
      subtitleOverride?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
      playlistId?: string | null;
      userId?: string | null;
    };

    const data: Record<string, unknown> = {};
    if (body.section !== undefined) data.section = body.section as HomepageSection;
    if (body.position !== undefined) data.position = body.position;
    if (body.titleOverride !== undefined) data.titleOverride = body.titleOverride;
    if (body.subtitleOverride !== undefined) data.subtitleOverride = body.subtitleOverride;
    if (body.description !== undefined) data.description = body.description;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.playlistId !== undefined) data.playlistId = body.playlistId;
    if (body.userId !== undefined) data.userId = body.userId;

    const feature = await prisma.homepageFeature.update({
      where: { id: req.params.featureId },
      data,
      include: featureInclude,
    });

    return res.json(mapFeature(feature));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "feature_not_found", message: "Homepage feature not found." });
    }
    return next(error);
  }
});

adminHomepageRouter.delete("/:featureId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await prisma.homepageFeature.delete({ where: { id: req.params.featureId } });
    res.status(204).send();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "feature_not_found", message: "Homepage feature not found." });
    }
    return next(error);
  }
});
