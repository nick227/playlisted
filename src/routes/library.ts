import { Router } from "express";

import {
  effectiveGenreSelect,
  effectiveGenreWhere,
  listEffectiveLibraryGenres,
  mergeGenreRefs,
} from "../lib/effectiveGenres.js";
import { prisma } from "../lib/prisma.js";
import { mapSubtitleSummary, subtitleInclude } from "../lib/subtitles/summary.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { BROWSABLE_RECORDING } from "../lib/publicRecordingFilter.js";
import { PUBLIC_PUBLISHED_PLAYLIST } from "../lib/publicPlaylistFilter.js";
import { parsePageSize, parsePositivePage } from "../lib/pagination.js";
import { sendCachedPublicJson } from "../lib/publicJsonCache.js";

export const libraryRouter = Router();

type ArtistSummaryRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  songCount: bigint | number;
  earliestYear: number | null;
  latestYear: number | null;
};

type ArtistGenreRow = {
  uploaderId: string;
  id: string;
  name: string;
  slug: string;
};

libraryRouter.get("/genres", async (req, res, next) => {
  try {
    return await sendCachedPublicJson(req, res, {
      namespace: "library-genres",
      ttlSeconds: 60,
      staleWhileRevalidateSeconds: 120,
      maxEntries: 25,
    }, async () => {
      const requestedMinSongCount = Number(req.query.minSongCount ?? 1);
      const minSongCount = Number.isFinite(requestedMinSongCount)
        ? Math.max(1, requestedMinSongCount)
        : 1;

      return { data: await listEffectiveLibraryGenres(minSongCount) };
    });
  } catch (error) {
    return next(error);
  }
});

libraryRouter.get("/playlist-genres", async (req, res, next) => {
  try {
    return await sendCachedPublicJson(req, res, {
      namespace: "library-playlist-genres",
      ttlSeconds: 60,
      staleWhileRevalidateSeconds: 120,
      maxEntries: 10,
    }, async () => {
      const genres = await prisma.tag.findMany({
        where: {
          kind: "GENRE",
          playlistTags: { some: { playlist: PUBLIC_PUBLISHED_PLAYLIST } },
        },
        include: {
          _count: {
            select: {
              playlistTags: { where: { playlist: PUBLIC_PUBLISHED_PLAYLIST } },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      return {
        data: genres.map((g) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          songCount: g._count.playlistTags,
        })),
      };
    });
  } catch (error) {
    return next(error);
  }
});

libraryRouter.get("/songs", async (req, res, next) => {
  try {
    const page = parsePositivePage(req.query.page);
    const pageSize = parsePageSize(req.query.pageSize, 50, 100);
    const genreSlug = typeof req.query.genre === "string" ? req.query.genre : undefined;

    const where = {
      ...BROWSABLE_RECORDING,
      ...(genreSlug ? effectiveGenreWhere(genreSlug) : {}),
    };

    const [items, total] = await Promise.all([
      prisma.recording.findMany({
        where,
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
          subtitle: subtitleInclude(),
        },
        orderBy: { title: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.recording.count({ where }),
    ]);

    return res.json({
      data: items.map((r) => ({
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
        subtitle: mapSubtitleSummary(r.subtitle),
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
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});

libraryRouter.get("/artists", async (req, res, next) => {
  try {
    return await sendCachedPublicJson(req, res, {
      namespace: "library-artists",
      ttlSeconds: 60,
      staleWhileRevalidateSeconds: 180,
      maxEntries: 10,
    }, async () => {
      const [artistRows, genreRows] = await Promise.all([
        prisma.$queryRaw<ArtistSummaryRow[]>`
          SELECT
            u.id,
            u.username,
            u.displayName,
            u.avatarUrl,
            COUNT(r.id) AS songCount,
            MIN(YEAR(COALESCE(r.releaseDate, r.publishedAt))) AS earliestYear,
            MAX(YEAR(COALESCE(r.releaseDate, r.publishedAt))) AS latestYear
          FROM Recording r
          INNER JOIN Playlist p ON p.id = r.publishedPlaylistId
          INNER JOIN User u ON u.id = r.uploaderId
          WHERE r.visibility = 'PUBLIC'
            AND r.status = 'PUBLISHED'
            AND p.visibility = 'PUBLIC'
            AND p.status = 'PUBLISHED'
            AND u.status = 'ACTIVE'
          GROUP BY u.id, u.username, u.displayName, u.avatarUrl
          ORDER BY u.displayName ASC
        `,
        prisma.$queryRaw<ArtistGenreRow[]>`
          SELECT DISTINCT genreRows.uploaderId, genreRows.id, genreRows.name, genreRows.slug
          FROM (
            SELECT r.uploaderId, t.id, t.name, t.slug
            FROM Recording r
            INNER JOIN Playlist p ON p.id = r.publishedPlaylistId
            INNER JOIN RecordingTag rt ON rt.recordingId = r.id
            INNER JOIN Tag t ON t.id = rt.tagId
            INNER JOIN User u ON u.id = r.uploaderId
            WHERE r.visibility = 'PUBLIC'
              AND r.status = 'PUBLISHED'
              AND p.visibility = 'PUBLIC'
              AND p.status = 'PUBLISHED'
              AND u.status = 'ACTIVE'
              AND t.kind = 'GENRE'
            UNION
            SELECT r.uploaderId, t.id, t.name, t.slug
            FROM Recording r
            INNER JOIN Playlist p ON p.id = r.publishedPlaylistId
            INNER JOIN PlaylistTag pt ON pt.playlistId = p.id
            INNER JOIN Tag t ON t.id = pt.tagId
            INNER JOIN User u ON u.id = r.uploaderId
            WHERE r.visibility = 'PUBLIC'
              AND r.status = 'PUBLISHED'
              AND p.visibility = 'PUBLIC'
              AND p.status = 'PUBLISHED'
              AND u.status = 'ACTIVE'
              AND t.kind = 'GENRE'
          ) AS genreRows
          ORDER BY genreRows.name ASC
        `,
      ]);

      const genresByArtist = new Map<string, ArtistGenreRow[]>();
      for (const genre of genreRows) {
        const artistGenres = genresByArtist.get(genre.uploaderId) ?? [];
        artistGenres.push(genre);
        genresByArtist.set(genre.uploaderId, artistGenres);
      }

      const artists = artistRows.map((artist) => ({
        id: artist.id,
        username: artist.username,
        displayName: artist.displayName,
        avatarUrl: artist.avatarUrl,
        songCount: Number(artist.songCount),
        genres: (genresByArtist.get(artist.id) ?? []).map((genre) => ({
          id: genre.id,
          name: genre.name,
          slug: genre.slug,
        })),
        yearRange: {
          earliest: artist.earliestYear == null ? null : Number(artist.earliestYear),
          latest: artist.latestYear == null ? null : Number(artist.latestYear),
        },
      }));

      return { data: artists };
    });
  } catch (error) {
    return next(error);
  }
});
