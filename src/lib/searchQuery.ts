import { PUBLIC_PUBLISHED_RECORDING } from "./publicRecordingFilter.js";
import { slugify } from "../utils/slug.js";

/**
 * Playlists discoverable via public search.
 * Includes PUBLIC+DRAFT for studio collections saved before publish status syncs.
 */
export const SEARCHABLE_PLAYLIST = {
  OR: [
    { visibility: "PUBLIC" as const, status: { in: ["PUBLISHED", "DRAFT"] as const } },
    { visibility: "UNLISTED" as const, status: "PUBLISHED" as const },
  ],
};

/** Case-sensitive substring match fields for titles and descriptions. */
export function textContainsMatch(q: string) {
  return [{ title: { contains: q } }, { description: { contains: q } }] as const;
}

export function playlistTitleOrSlugMatch(q: string) {
  const normalizedSlug = slugify(q);
  const matches: Array<{ title?: { contains: string }; slug?: string | { contains: string } }> = [
    { title: { contains: q } },
    { slug: { contains: q } },
  ];

  if (normalizedSlug) {
    matches.push({ slug: normalizedSlug });
    if (normalizedSlug !== q) {
      matches.push({ slug: { contains: normalizedSlug } });
    }
  }

  return matches;
}

export function searchablePlaylistTitleMatch(q: string) {
  return {
    AND: [SEARCHABLE_PLAYLIST, { OR: [...playlistTitleOrSlugMatch(q)] }],
  };
}

/** Songs whose canonical published playlist matches the query. */
export function songPublishedPlaylistTitleMatch(q: string) {
  return {
    publishedPlaylist: searchablePlaylistTitleMatch(q),
  };
}

/** Songs belonging to a searchable playlist matched by title or slug. */
export function songInPublicPlaylistTitleMatch(q: string) {
  return {
    playlistItems: {
      some: {
        playlist: searchablePlaylistTitleMatch(q),
      },
    },
  };
}

export function publicPublishedRecordingInPlaylistItemsMatch(q: string) {
  return {
    items: {
      some: {
        recording: {
          ...PUBLIC_PUBLISHED_RECORDING,
          OR: [...textContainsMatch(q), { tags: { some: tagContainsMatch(q) } }],
        },
      },
    },
  };
}

export function tagContainsMatch(q: string) {
  return {
    tag: {
      OR: [{ name: { contains: q } }, { slug: { contains: q } }],
    },
  };
}

export function searchablePlaylistWhereWithTextMatch(q: string) {
  return {
    AND: [
      SEARCHABLE_PLAYLIST,
      {
        OR: [
          ...playlistTitleOrSlugMatch(q),
          { description: { contains: q } },
          { owner: { OR: [{ displayName: { contains: q } }, { username: { contains: q } }] } },
          { tags: { some: tagContainsMatch(q) } },
          publicPublishedRecordingInPlaylistItemsMatch(q),
        ],
      },
    ],
  };
}
