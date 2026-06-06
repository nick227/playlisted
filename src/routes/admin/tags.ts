import { TagKind } from "@prisma/client";
import { Router } from "express";

import { clearPublicCatalogCaches } from "../../lib/publicCatalogCache.js";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";
import { slugify } from "../../utils/slug.js";

export const adminTagsRouter = Router();

adminTagsRouter.get("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;

    const tags = await prisma.tag.findMany({
      where: kind ? { kind: kind as TagKind } : undefined,
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    });

    res.json({ data: tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, kind: t.kind, createdAt: t.createdAt.toISOString() })) });
  } catch (error) {
    next(error);
  }
});

adminTagsRouter.post("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const { name, kind } = req.body as { name: string; kind?: string };
    const slug = slugify(name);

    if (!slug) {
      return res.status(400).json({ error: "invalid_name", message: "Tag name must produce a valid slug." });
    }

    const tag = await prisma.tag.create({
      data: { name: name.trim(), slug, kind: (kind as TagKind) ?? "GENRE" },
    });

    clearPublicCatalogCaches();
    return res.status(201).json({ id: tag.id, name: tag.name, slug: tag.slug, kind: tag.kind, createdAt: tag.createdAt.toISOString() });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2002") {
      return res.status(409).json({ error: "tag_conflict", message: "A tag with that name or slug already exists." });
    }
    return next(error);
  }
});

adminTagsRouter.patch("/:tagId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const { name, kind } = req.body as { name?: string; kind?: string };
    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      const slug = slugify(name);
      if (!slug) return res.status(400).json({ error: "invalid_name", message: "Tag name must produce a valid slug." });
      data.name = name.trim();
      data.slug = slug;
    }
    if (kind !== undefined) data.kind = kind as TagKind;

    const tag = await prisma.tag.update({ where: { id: req.params.tagId }, data });
    clearPublicCatalogCaches();
    return res.json({ id: tag.id, name: tag.name, slug: tag.slug, kind: tag.kind, createdAt: tag.createdAt.toISOString() });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "tag_not_found", message: "Tag not found." });
    }
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2002") {
      return res.status(409).json({ error: "tag_conflict", message: "A tag with that name or slug already exists." });
    }
    return next(error);
  }
});

adminTagsRouter.post("/bulk", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const items = req.body as { name: string; kind?: string }[];

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "invalid_body", message: "Body must be a non-empty array of { name, kind? }." });
    }
    if (items.length > 500) {
      return res.status(400).json({ error: "too_many", message: "Maximum 500 tags per import." });
    }

    const existingSlugs = new Set(
      (await prisma.tag.findMany({ select: { slug: true } })).map((t) => t.slug)
    );

    const toCreate: { name: string; slug: string; kind: TagKind }[] = [];
    const skipped: string[] = [];

    for (const item of items) {
      if (!item.name || typeof item.name !== "string") continue;
      const slug = slugify(item.name);
      if (!slug) continue;
      if (existingSlugs.has(slug)) {
        skipped.push(item.name.trim());
        continue;
      }
      existingSlugs.add(slug);
      toCreate.push({ name: item.name.trim(), slug, kind: (item.kind as TagKind) ?? "GENRE" });
    }

    if (toCreate.length > 0) {
      await prisma.tag.createMany({ data: toCreate });
    }

    if (toCreate.length > 0) clearPublicCatalogCaches();
    return res.status(201).json({ created: toCreate.length, skipped: skipped.length, skippedNames: skipped });
  } catch (error) {
    return next(error);
  }
});

adminTagsRouter.delete("/:tagId", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await prisma.tag.delete({ where: { id: req.params.tagId } });
    clearPublicCatalogCaches();
    res.status(204).send();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "tag_not_found", message: "Tag not found." });
    }
    return next(error);
  }
});
