import { Router } from "express";

import { requireAuth } from "../lib/requireAuth.js";
import { prisma } from "../lib/prisma.js";
import { PUBLIC_RECORDING_TAG_COUNT_SELECT } from "../lib/publicRecordingFilter.js";
import { slugify } from "../utils/slug.js";

export const tagsRouter = Router();

/** All genre tags for studio authoring (playlist/track metadata). */
tagsRouter.get("/genres", async (_req, res, next) => {
  try {
    const genres = await prisma.tag.findMany({
      where: { kind: "GENRE" },
      include: { _count: { select: PUBLIC_RECORDING_TAG_COUNT_SELECT } },
      orderBy: { name: "asc" },
    });

    return res.json({
      data: genres.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        songCount: g._count.recordingTags,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

tagsRouter.post("/genres", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { name } = req.body as { name?: unknown };
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "invalid_name", message: "Genre name is required." });
    }

    const trimmedName = name.trim().replace(/\s+/g, " ");
    const slug = slugify(trimmedName);
    if (!slug) {
      return res.status(400).json({ error: "invalid_name", message: "Genre name must produce a valid slug." });
    }

    const existing = await prisma.tag.findUnique({ where: { slug } });
    if (existing) {
      if (existing.kind !== "GENRE") {
        return res.status(409).json({ error: "tag_conflict", message: "A non-genre tag already uses that name." });
      }
      return res.json({ id: existing.id, name: existing.name, slug: existing.slug, songCount: 0 });
    }

    const tag = await prisma.tag.create({
      data: { name: trimmedName, slug, kind: "GENRE" },
    });

    return res.status(201).json({ id: tag.id, name: tag.name, slug: tag.slug, songCount: 0 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return res.status(409).json({ error: "tag_conflict", message: "A tag with that name or slug already exists." });
    }
    return next(error);
  }
});
