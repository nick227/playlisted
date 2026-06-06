import { Router } from "express";

import { getPlaylistHref } from "../lib/playlistHref.js";
import { isPlaylistBrowsable } from "../lib/publicPlaylistFilter.js";
import { BROWSABLE_RECORDING } from "../lib/publicRecordingFilter.js";
import { isUserActive } from "../lib/publicUserFilter.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { prisma } from "../lib/prisma.js";
import { sendCachedPublicJson } from "../lib/publicJsonCache.js";

export const homepageRouter = Router();

const SECTION_TITLES: Record<string, string> = {
  SPOTLIGHT: "Spotlight",
  FEATURED_ARTIST: "Featured Artist",
  FEATURED_PLAYLIST: "Featured Playlists",
  CUSTOM_MIX: "Custom Mix",
  NEW_RELEASE: "New Releases",
  NEW_ARTIST: "New Artists",
  TRENDING: "Trending",
  EDITOR_PICK: "Editor Picks",
  SITE_NEWS: "Site News",
};

homepageRouter.get("/", async (req, res, next) => {
  try {
    return await sendCachedPublicJson(req, res, {
      namespace: "homepage",
      ttlSeconds: 30,
      staleWhileRevalidateSeconds: 90,
      maxEntries: 25,
    }, async () => {
      const now = new Date();
      const [features, newestRecordings] = await Promise.all([
        prisma.homepageFeature.findMany({
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
        }),
        prisma.recording.findMany({
          where: {
            ...BROWSABLE_RECORDING,
            recordingType: "SONG",
          },
          include: {
            uploader: {
              select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
            },
            publishedPlaylist: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverArtUrl: true,
                owner: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
                },
              },
            },
          },
          orderBy: [
            { publishedAt: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
          ],
          take: 10,
        }),
      ]);

      const grouped = new Map<string, any[]>();
      const curatedNewReleases: any[] = [];

      for (const feature of features) {
        if (feature.section !== "NEW_RELEASE" && !grouped.has(feature.section)) {
          grouped.set(feature.section, []);
        }

        let item: any = null;

        if (feature.playlist && isPlaylistBrowsable(feature.playlist)) {
          item = {
            id: feature.playlist.id,
            targetType: "PLAYLIST",
            title: feature.titleOverride ?? feature.playlist.title,
            subtitle: feature.subtitleOverride ?? feature.playlist.owner.displayName,
            description: feature.description ?? feature.playlist.description,
            imageUrl: feature.imageUrl ?? feature.playlist.coverArtUrl,
            href: `/playlists/${feature.playlist.id}`,
          };
        } else if (feature.user && isUserActive(feature.user)) {
          const userImage =
            feature.imageUrl ??
            (feature.section === "SPOTLIGHT" || feature.section === "FEATURED_ARTIST"
              ? (feature.user.heroImageUrl ?? feature.user.avatarUrl)
              : (feature.user.avatarUrl ?? feature.user.heroImageUrl));
          item = {
            id: feature.user.id,
            targetType: "USER",
            title: feature.titleOverride ?? feature.user.displayName,
            subtitle: feature.subtitleOverride ?? feature.user.username,
            description: feature.description ?? feature.user.bio,
            imageUrl: userImage,
            href: `/@/${encodeURIComponent(feature.user.username)}`,
          };
        } else if (feature.editorialPost?.status === "PUBLISHED") {
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
          if (feature.section === "NEW_RELEASE") {
            curatedNewReleases.push(item);
          } else {
            grouped.get(feature.section)?.push(item);
          }
        }
      }

      const newestReleaseItems = newestRecordings.map((recording) => {
        const playlistHref = getPlaylistHref(recording.publishedPlaylist);
        return {
          id: recording.id,
          targetType: "RECORDING",
          title: recording.title,
          subtitle: recording.uploader.displayName,
          description: recording.publishedPlaylist.title,
          imageUrl: resolveRecordingArtworkUrl(recording, recording.publishedPlaylist),
          href: `${playlistHref}#track-${recording.id}`,
          uploaderId: recording.uploaderId,
          publishedPlaylistId: recording.publishedPlaylistId,
          audioUrl: recording.audioUrl,
          durationSeconds: recording.durationSeconds,
          recordingType: recording.recordingType,
          visibility: recording.visibility,
          status: recording.status,
          explicit: recording.explicit,
          playCount: recording.playCount,
          createdAt: recording.createdAt.toISOString(),
          updatedAt: recording.updatedAt.toISOString(),
          playlistTitle: recording.publishedPlaylist.title,
          playlistSlug: recording.publishedPlaylist.slug,
          playlistOwnerUsername: recording.publishedPlaylist.owner.username,
        };
      });

      const newestReleaseIds = new Set(newestReleaseItems.map((item) => item.id));
      grouped.set("NEW_RELEASE", [
        ...newestReleaseItems,
        ...curatedNewReleases.filter((item) => !newestReleaseIds.has(item.id)),
      ]);

      const sections = Array.from(grouped.entries()).map(([section, items]) => ({
        section,
        title: SECTION_TITLES[section] ?? section,
        items,
      }));

      return { sections };
    });
  } catch (error) {
    return next(error);
  }
});
