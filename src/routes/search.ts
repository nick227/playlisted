import { Router } from "express";

import { mapPlaylistSummary } from "../lib/playlistMaps.js";
import { prisma } from "../lib/prisma.js";
import {
  BROWSABLE_RECORDING,
  PUBLIC_PUBLISHED_RECORDING,
  PUBLIC_RECORDING_TAG_COUNT_SELECT,
} from "../lib/publicRecordingFilter.js";
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
              ],
            },
          ],
        },
        include: {
          uploader: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
          },
          publishedPlaylist: { select: { id: true, slug: true, title: true } },
          tags: {
            where: { tag: { kind: "GENRE" } },
            include: { tag: { select: { id: true, name: true, slug: true } } },
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
          status: "ACTIVE",
          uploadedRecordings: { some: { visibility: "PUBLIC", status: "PUBLISHED" } },
          OR: [
            { displayName: { contains: q } },
            { username: { contains: q } },
            { bio: { contains: q } },
            {
              uploadedRecordings: {
                some: {
                  visibility: "PUBLIC",
                  status: "PUBLISHED",
                  tags: { some: tagMatch },
                },
              },
            },
          ],
        },
        orderBy: [{ isFeaturedArtist: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: pageSize,
      }),
      prisma.tag.findMany({
        where: {
          kind: "GENRE",
          OR: [{ name: { contains: q } }, { slug: { contains: q } }],
          recordingTags: {
            some: {
              recording: PUBLIC_PUBLISHED_RECORDING,
            },
          },
        },
        include: { _count: { select: PUBLIC_RECORDING_TAG_COUNT_SELECT } },
      }),
    ]);

    const rankedGenres = genres
      .map((genre) => ({
        id: genre.id,
        name: genre.name,
        slug: genre.slug,
        songCount: genre._count.recordingTags,
      }))
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
        artworkUrl: r.artworkUrl ?? null,
        recordingType: r.recordingType,
        visibility: r.visibility,
        status: r.status,
        trackNumber: r.trackNumber ?? null,
        episodeNumber: r.episodeNumber ?? null,
        explicit: r.explicit,
        releaseDate: r.releaseDate?.toISOString() ?? null,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        playCount: r.playCount,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        uploader: r.uploader,
        playlist: r.publishedPlaylist,
        genres: r.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })),
      })),
      playlists: playlists.map(mapPlaylistSummary),
      artists: artists.map(mapUserSummary),
      genres: rankedGenres,
    });
  } catch (error) {
    return next(error);
  }
});
