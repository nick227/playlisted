import { PUBLIC_PUBLISHED_RECORDING } from "./publicRecordingFilter.js";

/** Case-sensitive substring match fields for titles and descriptions. */
export function textContainsMatch(q: string) {
  return [{ title: { contains: q } }, { description: { contains: q } }] as const;
}

export function playlistTitleOrSlugMatch(q: string) {
  return [{ title: { contains: q } }, { slug: { contains: q } }] as const;
}

export function publicPublishedPlaylistTitleMatch(q: string) {
  return {
    visibility: "PUBLIC" as const,
    status: "PUBLISHED" as const,
    OR: [...playlistTitleOrSlugMatch(q)],
  };
}

/** Songs belonging to a public published playlist matched by title or slug. */
export function songInPublicPlaylistTitleMatch(q: string) {
  return {
    playlistItems: {
      some: {
        playlist: publicPublishedPlaylistTitleMatch(q),
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
