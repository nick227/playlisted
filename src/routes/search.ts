import { Router } from "express";

import {
  effectiveGenreSelect,
  listEffectiveLibraryGenres,
  mergeGenreRefs,
} from "../lib/effectiveGenres.js";
import { getPlaylistHref } from "../lib/playlistHref.js";
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
const DEFAULT_SUGGESTION_LIMIT = 5;
const MAX_SUGGESTION_LIMIT = 8;

export const searchRouter = Router();

type SearchSuggestionOption = {
  id: string;
  kind: "song" | "playlist" | "artist" | "genre";
  label: string;
  href: string;
  meta?: string;
  imageUrl?: string | null;
};

function parseSuggestionLimit(raw: unknown): number {
  const parsed = Number(raw ?? DEFAULT_SUGGESTION_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_SUGGESTION_LIMIT;
  return Math.min(MAX_SUGGESTION_LIMIT, Math.max(1, Math.floor(parsed)));
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function group(label: string, options: SearchSuggestionOption[]) {
  return options.length > 0 ? { label, options } : null;
}

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

searchRouter.get("/suggestions", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = parseSuggestionLimit(req.query.limit);

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
        select: {
          id: true,
          title: true,
          artworkUrl: true,
          durationSeconds: true,
          uploader: { select: { displayName: true, username: true } },
          publishedPlaylist: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverArtUrl: true,
              owner: { select: { username: true } },
            },
          },
        },
        orderBy: [{ playCount: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: limit,
      }),
      prisma.playlist.findMany({
        where: searchablePlaylistWhereWithTextMatch(q),
        select: {
          id: true,
          title: true,
          slug: true,
          coverArtUrl: true,
          itemCount: true,
          owner: { select: { displayName: true, username: true } },
        },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: limit,
      }),
      prisma.user.findMany({
        where: {
          ...ACTIVE_USER,
          uploadedRecordings: { some: BROWSABLE_RECORDING },
          OR: [
            { displayName: { contains: q } },
            { username: { contains: q } },
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
        select: { id: true, username: true, displayName: true, avatarUrl: true },
        orderBy: [{ isFeaturedArtist: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: limit,
      }),
      listEffectiveLibraryGenres(),
    ]);

    const rankedGenres = genres
      .filter((genre) =>
        genre.name.toLowerCase().includes(q.toLowerCase())
        || genre.slug.toLowerCase().includes(q.toLowerCase()),
      )
      .sort((a, b) => b.songCount - a.songCount || a.name.localeCompare(b.name))
      .slice(0, limit);

    const groups = [
      group("Songs", songs.map((song) => {
        const duration = formatDuration(song.durationSeconds);
        const meta = [song.uploader.displayName, song.publishedPlaylist.title, duration]
          .filter(Boolean)
          .join(" · ");
        return {
          id: `song-${song.id}`,
          kind: "song" as const,
          label: song.title,
          meta,
          href: `${getPlaylistHref(song.publishedPlaylist)}#track-${song.id}`,
          imageUrl: resolveRecordingArtworkUrl(song, song.publishedPlaylist),
        };
      })),
      group("Artists", artists.map((artist) => ({
        id: `artist-${artist.id}`,
        kind: "artist" as const,
        label: artist.displayName,
        meta: `@${artist.username}`,
        href: `/@/${encodeURIComponent(artist.username)}`,
        imageUrl: artist.avatarUrl,
      }))),
      group("Playlists", playlists.map((playlist) => ({
        id: `playlist-${playlist.id}`,
        kind: "playlist" as const,
        label: playlist.title,
        meta: `${playlist.owner.displayName} · ${playlist.itemCount} tracks`,
        href: getPlaylistHref(playlist),
        imageUrl: playlist.coverArtUrl,
      }))),
      group("Genres", rankedGenres.map((genre) => {
        const trackLabel = genre.songCount === 1 ? "track" : "tracks";
        return {
          id: `genre-${genre.id}`,
          kind: "genre" as const,
          label: genre.name,
          meta: `${genre.songCount.toLocaleString()} ${trackLabel}`,
          href: `/genres/${encodeURIComponent(genre.slug)}`,
        };
      })),
    ].filter((item): item is { label: string; options: SearchSuggestionOption[] } => Boolean(item));

    return res.json({ groups });
  } catch (error) {
    return next(error);
  }
});

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
