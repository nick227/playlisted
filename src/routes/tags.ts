import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { PUBLIC_RECORDING_TAG_COUNT_SELECT } from "../lib/publicRecordingFilter.js";

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
