import { Prisma } from "@prisma/client";

import { prisma } from "./prisma.js";

export type GenreRef = { id: string; name: string; slug: string };

export function mergeGenreRefs(
  recordingTags: { tag: GenreRef }[] = [],
  playlistTags: { tag: GenreRef }[] = [],
): GenreRef[] {
  const genres = new Map<string, GenreRef>();
  for (const { tag } of [...recordingTags, ...playlistTags]) {
    genres.set(tag.id, tag);
  }
  return Array.from(genres.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function effectiveGenreWhere(slug: string) {
  return {
    OR: [
      { tags: { some: { tag: { slug, kind: "GENRE" as const } } } },
      { publishedPlaylist: { tags: { some: { tag: { slug, kind: "GENRE" as const } } } } },
    ],
  };
}

export const effectiveGenreSelect = {
  tags: {
    where: { tag: { kind: "GENRE" as const } },
    include: { tag: { select: { id: true, name: true, slug: true } } },
  },
  publishedPlaylist: {
    select: {
      tags: {
        where: { tag: { kind: "GENRE" as const } },
        include: { tag: { select: { id: true, name: true, slug: true } } },
      },
    },
  },
} as const;

export type LibraryGenreCount = GenreRef & { songCount: number };

export async function listEffectiveLibraryGenres(): Promise<LibraryGenreCount[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    slug: string;
    songCount: bigint;
  }>>(Prisma.sql`
    SELECT tagRows.id, tagRows.name, tagRows.slug, COUNT(*) AS songCount
    FROM (
      SELECT DISTINCT t.id, t.name, t.slug, r.id AS recordingId
      FROM Tag t
      INNER JOIN RecordingTag rt ON rt.tagId = t.id
      INNER JOIN Recording r ON r.id = rt.recordingId
      INNER JOIN Playlist p ON p.id = r.publishedPlaylistId
      WHERE t.kind = 'GENRE'
        AND r.visibility = 'PUBLIC'
        AND r.status = 'PUBLISHED'
        AND p.visibility = 'PUBLIC'
        AND p.status = 'PUBLISHED'

      UNION

      SELECT DISTINCT t.id, t.name, t.slug, r.id AS recordingId
      FROM Tag t
      INNER JOIN PlaylistTag pt ON pt.tagId = t.id
      INNER JOIN Playlist p ON p.id = pt.playlistId
      INNER JOIN Recording r ON r.publishedPlaylistId = p.id
      WHERE t.kind = 'GENRE'
        AND r.visibility = 'PUBLIC'
        AND r.status = 'PUBLISHED'
        AND p.visibility = 'PUBLIC'
        AND p.status = 'PUBLISHED'
    ) AS tagRows
    GROUP BY tagRows.id, tagRows.name, tagRows.slug
    ORDER BY tagRows.name ASC
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    songCount: Number(row.songCount),
  }));
}
