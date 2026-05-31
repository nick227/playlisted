import { HomepageSection } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";
import { slugify } from "../../utils/slug.js";

export const adminHomepageRouter = Router();

type EditorialPostInput = {
  title?: string;
  slug?: string | null;
  summary?: string | null;
  body?: string;
  coverImageUrl?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string | null;
};

type HomepageTargetInput = {
  playlistId?: string | null;
  userId?: string | null;
  editorialPostId?: string | null;
  editorialPost?: EditorialPostInput;
};

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
    editorialPost: f.editorialPost
      ? {
          id: f.editorialPost.id,
          kind: f.editorialPost.kind,
          title: f.editorialPost.title,
          slug: f.editorialPost.slug,
          summary: f.editorialPost.summary ?? null,
          body: f.editorialPost.body,
          coverImageUrl: f.editorialPost.coverImageUrl ?? null,
          status: f.editorialPost.status,
          publishedAt: f.editorialPost.publishedAt?.toISOString() ?? null,
          author: {
            id: f.editorialPost.author.id,
            username: f.editorialPost.author.username,
            displayName: f.editorialPost.author.displayName,
          },
        }
      : null,
  };
}

const featureInclude = {
  playlist: { select: { id: true, title: true, coverArtUrl: true } },
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  editorialPost: {
    include: {
      author: { select: { id: true, username: true, displayName: true } },
    },
  },
};

async function resolveUniqueEditorialSlug(titleOrSlug: string, currentPostId?: string | null) {
  const baseSlug = slugify(titleOrSlug) || "news";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.editorialPost.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === currentPostId) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function createEditorialPost(input: EditorialPostInput, authorId: string) {
  const title = input.title?.trim();
  if (!title) {
    throw Object.assign(new Error("Site news title is required."), { status: 400, error: "invalid_editorial_post" });
  }

  const body = input.body?.trim();
  if (!body) {
    throw Object.assign(new Error("Site news body is required."), { status: 400, error: "invalid_editorial_post" });
  }

  const status = input.status ?? "PUBLISHED";
  return prisma.editorialPost.create({
    data: {
      authorId,
      kind: "NEWS",
      title,
      slug: await resolveUniqueEditorialSlug(input.slug?.trim() || title),
      summary: input.summary?.trim() || null,
      body,
      coverImageUrl: input.coverImageUrl?.trim() || null,
      status,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : status === "PUBLISHED" ? new Date() : null,
    },
  });
}

async function updateEditorialPost(postId: string, input: EditorialPostInput) {
  const data: Record<string, unknown> = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      throw Object.assign(new Error("Site news title is required."), { status: 400, error: "invalid_editorial_post" });
    }
    data.title = title;
  }
  if (input.slug !== undefined) {
    const slugSource = input.slug?.trim();
    if (slugSource) data.slug = await resolveUniqueEditorialSlug(slugSource, postId);
  }
  if (input.summary !== undefined) data.summary = input.summary?.trim() || null;
  if (input.body !== undefined) {
    const body = input.body.trim();
    if (!body) {
      throw Object.assign(new Error("Site news body is required."), { status: 400, error: "invalid_editorial_post" });
    }
    data.body = body;
  }
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl?.trim() || null;
  if (input.status !== undefined) data.status = input.status;
  if (input.publishedAt !== undefined) {
    data.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
  } else if (input.status === "PUBLISHED") {
    data.publishedAt = new Date();
  }

  if (Object.keys(data).length === 0) return null;
  return prisma.editorialPost.update({ where: { id: postId }, data });
}

function countTargets(input: HomepageTargetInput) {
  return [input.playlistId, input.userId, input.editorialPostId, input.editorialPost].filter(Boolean).length;
}

function targetValidationError(input: HomepageTargetInput) {
  if (input.playlistId !== undefined && input.playlistId !== null && !input.playlistId.trim()) {
    return { error: "invalid_homepage_feature_target", message: "Playlist target must not be blank." };
  }
  if (input.userId !== undefined && input.userId !== null && !input.userId.trim()) {
    return { error: "invalid_homepage_feature_target", message: "User target must not be blank." };
  }
  if (input.editorialPostId !== undefined && input.editorialPostId !== null && !input.editorialPostId.trim()) {
    return { error: "invalid_homepage_feature_target", message: "Site news target must not be blank." };
  }

  const targetCount = countTargets(input);
  if (targetCount > 1) {
    return {
      error: "invalid_homepage_feature_target",
      message: "Homepage features can target only one playlist, user, or site news post.",
    };
  }
  if (targetCount === 0) return null;

  return null;
}

async function updateFeature(featureId: string, data: Record<string, unknown>) {
  if (data.position === undefined) {
    return prisma.homepageFeature.update({
      where: { id: featureId },
      data,
      include: featureInclude,
    });
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.homepageFeature.findUnique({
      where: { id: featureId },
      select: { id: true, section: true, position: true },
    });

    if (!current) {
      throw Object.assign(new Error("Homepage feature not found."), { code: "P2025" });
    }

    const nextSection = (data.section as HomepageSection | undefined) ?? current.section;
    const nextPosition = data.position as number;

    const occupyingFeature = await tx.homepageFeature.findFirst({
      where: {
        section: nextSection,
        position: nextPosition,
        id: { not: featureId },
      },
      select: { id: true },
    });

    if (occupyingFeature && nextSection === current.section) {
      const maxPosition = await tx.homepageFeature.findFirst({
        where: { section: current.section },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const temporaryPosition = (maxPosition?.position ?? 0) + 1;

      await tx.homepageFeature.update({
        where: { id: featureId },
        data: { position: temporaryPosition },
      });
      await tx.homepageFeature.update({
        where: { id: occupyingFeature.id },
        data: { position: current.position },
      });
    }

    return tx.homepageFeature.update({
      where: { id: featureId },
      data,
      include: featureInclude,
    });
  });
}

adminHomepageRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

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
    const auth = await requireAdmin(req, res);
    if (!auth) return;

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
      editorialPostId?: string | null;
      editorialPost?: EditorialPostInput;
    };

    const targetError = targetValidationError(body);
    if (targetError) return res.status(400).json(targetError);

    let editorialPostId = body.editorialPostId ?? null;
    if (body.editorialPost) {
      const post = await createEditorialPost(body.editorialPost, auth.user.id);
      editorialPostId = post.id;
    }

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
        editorialPostId,
        createdById: auth.user.id,
      },
      include: featureInclude,
    });

    return res.status(201).json(mapFeature(feature));
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      const err = error as { status: number; error?: string; message?: string };
      return res.status(err.status).json({
        error: err.error ?? "bad_request",
        message: err.message ?? "Bad request.",
      });
    }
    return next(error);
  }
});

adminHomepageRouter.patch("/:featureId", async (req, res, next) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

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
      editorialPostId?: string | null;
      editorialPost?: EditorialPostInput;
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
    if (body.editorialPostId !== undefined) data.editorialPostId = body.editorialPostId;

    let currentTarget: { playlistId: string | null; userId: string | null; editorialPostId: string | null } | null = null;
    const hasTargetUpdate =
      body.playlistId !== undefined ||
      body.userId !== undefined ||
      body.editorialPostId !== undefined ||
      body.editorialPost !== undefined;
    if (hasTargetUpdate) {
      currentTarget = await prisma.homepageFeature.findUnique({
        where: { id: req.params.featureId },
        select: { playlistId: true, userId: true, editorialPostId: true },
      });

      if (!currentTarget) {
        return res.status(404).json({ error: "feature_not_found", message: "Homepage feature not found." });
      }

      const effectiveEditorialPostId =
        body.editorialPostId !== undefined ? body.editorialPostId : currentTarget.editorialPostId;
      const targetError = targetValidationError({
        playlistId: body.playlistId !== undefined ? body.playlistId : currentTarget.playlistId,
        userId: body.userId !== undefined ? body.userId : currentTarget.userId,
        editorialPostId: effectiveEditorialPostId,
        editorialPost: effectiveEditorialPostId ? undefined : body.editorialPost,
      });
      if (targetError) return res.status(400).json(targetError);
    }

    if (body.editorialPost !== undefined) {
      currentTarget ??= await prisma.homepageFeature.findUnique({
        where: { id: req.params.featureId },
        select: { playlistId: true, userId: true, editorialPostId: true },
      });

      if (!currentTarget) {
        return res.status(404).json({ error: "feature_not_found", message: "Homepage feature not found." });
      }

      if (!currentTarget.editorialPostId) {
        const post = await createEditorialPost(body.editorialPost, auth.user.id);
        data.editorialPostId = post.id;
      } else {
        await updateEditorialPost(currentTarget.editorialPostId, body.editorialPost);
      }
    }

    const feature = await updateFeature(req.params.featureId, data);

    return res.json(mapFeature(feature));
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      const err = error as { status: number; error?: string; message?: string };
      return res.status(err.status).json({
        error: err.error ?? "bad_request",
        message: err.message ?? "Bad request.",
      });
    }
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return res.status(404).json({ error: "feature_not_found", message: "Homepage feature not found." });
    }
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2002") {
      return res.status(409).json({
        error: "homepage_feature_position_conflict",
        message: "Another homepage feature already uses that section and position.",
      });
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
