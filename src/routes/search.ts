import { Router } from "express";

import {
  effectiveGenreSelect,
  listEffectiveLibraryGenres,
  mergeGenreRefs,
} from "../lib/effectiveGenres.js";
import { mapPlaylistSummary } from "../lib/playlistMaps.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { prisma } from "../lib/prisma.js";
import { BROWSABLE_RECORDING } from "../lib/publicRecordingFilter.js";
import { ACTIVE_USER } from "../lib/publicUserFilter.js";
import {
  searchablePlaylistWhereWithTextMatch,
  songInPublicPlaylistTitleMatch,
  songPublishedPlaylistTitleMatch,
  tagContainsMatch,
  textContainsMatch,
} from "../lib/searchQuery.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const searchRouter = Router();

function mapUserSummary(user: {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  heroImageUrl: string | null;
  role: string;
  status: string;
  isFeaturedArtist: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    heroImageUrl: user.heroImageUrl,
    role: user.role,
    status: user.status,
    isFeaturedArtist: user.isFeaturedArtist,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

searchRouter.get("/unified", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE)),
    );

    if (!q) {
      return res.status(400).json({
        error: "search_query_required",
        message: "Query parameter q is required.",
      });
    }

    const tagMatch = tagContainsMatch(q);

    const [songs, playlists, artists, genres] = await Promise.all([
      prisma.recording.findMany({
        where: {
          AND: [
            BROWSABLE_RECORDING,
            {
              OR: [
                ...textContainsMatch(q),
                { uploader: { OR: [{ displayName: { contains: q } }, { username: { contains: q } }] } },
                songPublishedPlaylistTitleMatch(q),
                songInPublicPlaylistTitleMatch(q),
                { tags: { some: tagMatch } },
                { publishedPlaylist: { tags: { some: tagMatch } } },
              ],
            },
          ],
        },
        include: {
          uploader: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
          },
          tags: effectiveGenreSelect.tags,
          publishedPlaylist: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverArtUrl: true,
              tags: effectiveGenreSelect.publishedPlaylist.select.tags,
            },
          },
          _count: {
            select: { saves: { where: { kind: "FAVORITE" } } },
          },
        },
        orderBy: [{ playCount: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: pageSize,
      }),
      prisma.playlist.findMany({
        where: searchablePlaylistWhereWithTextMatch(q),
        include: {
          owner: true,
          tags: { include: { tag: true } },
        },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: pageSize,
      }),
      prisma.user.findMany({
        where: {
          ...ACTIVE_USER,
          uploadedRecordings: { some: BROWSABLE_RECORDING },
          OR: [
            { displayName: { contains: q } },
            { username: { contains: q } },
            { bio: { contains: q } },
            {
              uploadedRecordings: {
                some: {
                  ...BROWSABLE_RECORDING,
                  OR: [
                    { tags: { some: tagMatch } },
                    { publishedPlaylist: { tags: { some: tagMatch } } },
                  ],
                },
              },
            },
          ],
        },
        orderBy: [{ isFeaturedArtist: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: pageSize,
      }),
      listEffectiveLibraryGenres(),
    ]);

    const rankedGenres = genres
      .filter((genre) =>
        genre.name.toLowerCase().includes(q.toLowerCase())
        || genre.slug.toLowerCase().includes(q.toLowerCase()),
      )
      .sort((a, b) => b.songCount - a.songCount || a.name.localeCompare(b.name))
      .slice(0, pageSize);

    return res.json({
      songs: songs.map((r) => ({
        id: r.id,
        uploaderId: r.uploaderId,
        publishedPlaylistId: r.publishedPlaylistId,
        title: r.title,
        description: r.description ?? null,
        audioUrl: r.audioUrl,
        audioMimeType: r.audioMimeType ?? null,
        audioBytes: r.audioBytes != null ? Number(r.audioBytes) : null,
        durationSeconds: r.durationSeconds ?? null,
        artworkUrl: resolveRecordingArtworkUrl(r, r.publishedPlaylist),
        recordingType: r.recordingType,
        visibility: r.visibility,
        status: r.status,
        trackNumber: r.trackNumber ?? null,
        episodeNumber: r.episodeNumber ?? null,
        explicit: r.explicit,
        releaseDate: r.releaseDate?.toISOString() ?? null,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        playCount: r.playCount,
        favoriteCount: r._count.saves,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        uploader: r.uploader,
        playlist: {
          id: r.publishedPlaylist.id,
          slug: r.publishedPlaylist.slug,
          title: r.publishedPlaylist.title,
        },
        genres: mergeGenreRefs(r.tags, r.publishedPlaylist.tags),
      })),
      playlists: playlists.map(mapPlaylistSummary),
      artists: artists.map(mapUserSummary),
      genres: rankedGenres,
    });
  } catch (error) {
    return next(error);
  }
});
