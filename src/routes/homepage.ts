import { Router } from "express";

import { prisma } from "../lib/prisma.js";

export const homepageRouter = Router();

const SECTION_TITLES: Record<string, string> = {
  FEATURED_PLAYLIST: "Featured Playlists",
  CUSTOM_MIX: "Custom Mix",
  NEW_RELEASE: "New Releases",
  NEW_ARTIST: "New Artists",
  TRENDING: "Trending",
  EDITOR_PICK: "Editor Picks",
  SITE_NEWS: "Site News",
};

homepageRouter.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const features = await prisma.homepageFeature.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: {
        playlist: {
          include: {
            owner: true,
          },
        },
        user: true,
        editorialPost: {
          include: {
            author: true,
          },
        },
      },
      orderBy: [{ section: "asc" }, { position: "asc" }],
    });

    const grouped = new Map<string, any[]>();

    for (const feature of features) {
      if (!grouped.has(feature.section)) {
        grouped.set(feature.section, []);
      }

      let item: any = null;

      if (feature.playlist) {
        item = {
          id: feature.playlist.id,
          targetType: "PLAYLIST",
          title: feature.titleOverride ?? feature.playlist.title,
          subtitle: feature.subtitleOverride ?? feature.playlist.owner.displayName,
          description: feature.description ?? feature.playlist.description,
          imageUrl: feature.imageUrl ?? feature.playlist.coverArtUrl,
          href: `/playlists/${feature.playlist.id}`,
        };
      } else if (feature.user) {
        item = {
          id: feature.user.id,
          targetType: "USER",
          title: feature.titleOverride ?? feature.user.displayName,
          subtitle: feature.subtitleOverride ?? feature.user.username,
          description: feature.description ?? feature.user.bio,
          imageUrl: feature.imageUrl ?? feature.user.avatarUrl ?? feature.user.heroImageUrl,
          href: `/@/${encodeURIComponent(feature.user.username)}`,
        };
      } else if (feature.editorialPost) {
        item = {
          id: feature.editorialPost.id,
          targetType: "EDITORIAL_POST",
          title: feature.titleOverride ?? feature.editorialPost.title,
          subtitle: feature.subtitleOverride ?? feature.editorialPost.author.displayName,
          description: feature.description ?? feature.editorialPost.summary,
          imageUrl: feature.imageUrl ?? feature.editorialPost.coverImageUrl,
          href: `/news/${feature.editorialPost.slug}`,
        };
      }

      if (item) {
        grouped.get(feature.section)?.push(item);
      }
    }

    const sections = Array.from(grouped.entries()).map(([section, items]) => ({
      section,
      title: SECTION_TITLES[section] ?? section,
      items,
    }));

    return res.json({ sections });
  } catch (error) {
    return next(error);
  }
});
