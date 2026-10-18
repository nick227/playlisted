import type { LibrarySong } from "@playlisted/client-sdk";
import type { MuseumExhibit, MuseumPools } from "./museumTypes";

type SectionBase = {
  id: string;
  title: string;
  count: number;
  repeat?: "never" | "allow";
  firstBatchOnly?: boolean;
};
export type MuseumSection = SectionBase & (
  | { kind: "showcase" | "artist-feature" | "artist-grid"; source: "artists" }
  | { kind: "playlist-grid" | "listening-room"; source: "playlists" }
  | { kind: "song-grid" | "square-grid" | "song-tracklist" | "lyric-placard";
      source: "songs" | "recent-songs" | "lesser-known-songs" | "most-favorited-songs" | "lyrics" }
);

// Move entries to reorder; duplicate with a new id to reuse a presentation.
// Selection priority follows this order. Counts are maxima, never padding targets.
export const LIBRARY_SECTIONS: readonly MuseumSection[] = [
  { id: "collections", kind: "playlist-grid", title: "Collections", source: "playlists", count: 8 },
  { id: "spotlight", kind: "showcase", title: "Spotlight", source: "artists", count: 5, firstBatchOnly: true },
  { id: "featured-artists", kind: "artist-feature", title: "Featured Artists", source: "artists", count: 4 },
  { id: "specials", kind: "listening-room", title: "Specials", source: "playlists", count: 1 },
  { id: "artists", kind: "artist-grid", title: "Artists", source: "artists", count: 12 },
  { id: "quote", kind: "lyric-placard", title: "Quote", source: "lyrics", count: 1 },
  { id: "discoveries", kind: "song-grid", title: "New Discoveries", source: "recent-songs", count: 6 },
  { id: "hidden-gems", kind: "song-grid", title: "Hidden Gems", source: "lesser-known-songs", count: 6 },
  { id: "recordings", kind: "song-tracklist", title: "Recordings", source: "songs", count: 6 },
  { id: "favorites", kind: "square-grid", title: "Community Favorites", source: "most-favorited-songs", count: 10 },
];

export function createMuseumSelection() {
  return { songs: new Set<string>(), artists: new Set<string>(), playlists: new Set<string>() };
}
export type MuseumSelection = ReturnType<typeof createMuseumSelection>;

function take<T extends { id: string }>(pool: T[], count: number, used: Set<string>, allowRepeat = false): T[] {
  const selected: T[] = [];
  const local = new Set<string>();
  for (const item of pool) {
    if (selected.length >= count) break;
    if (local.has(item.id) || (!allowRepeat && used.has(item.id))) continue;
    local.add(item.id);
    used.add(item.id);
    selected.push(item);
  }
  return selected;
}

function lyricCandidates(songs: LibrarySong[]) {
  return songs.filter(song => song.subtitle?.status === "READY" || Boolean(song.description?.trim()));
}

function songSource(source: MuseumSection["source"], songs: LibrarySong[]) {
  switch (source) {
    case "recent-songs": return [...songs].sort((a, b) =>
      (Date.parse(b.publishedAt ?? b.createdAt) || 0) - (Date.parse(a.publishedAt ?? a.createdAt) || 0));
    case "lesser-known-songs": return [...songs].sort((a, b) => a.playCount - b.playCount);
    case "most-favorited-songs": return songs.filter(song => song.favoriteCount > 0).sort((a, b) => b.favoriteCount - a.favoriteCount);
    case "lyrics": return lyricCandidates(songs);
    default: return songs;
  }
}

export function buildMuseumBatch(
  batchIndex: number,
  pools: MuseumPools,
  used: MuseumSelection = createMuseumSelection(),
  sections: readonly MuseumSection[] = LIBRARY_SECTIONS,
): MuseumExhibit[] {
  const exhibits: MuseumExhibit[] = [];
  for (const [step, section] of sections.entries()) {
    if (section.firstBatchOnly && batchIndex !== 0) continue;
    if (!Number.isInteger(section.count) || section.count <= 0) continue;
    const repeat = section.repeat === "allow";
    const base = { id: `${section.id}-${batchIndex}-${step}`, title: section.title };
    const takeSongs = (songs: LibrarySong[], count: number) => take(songs, count, used.songs, repeat);
    switch (section.kind) {
      case "showcase": {
        const artists = take(pools.artists, section.count, used.artists, repeat);
        if (!artists.length) break;
        const artist = artists[0];
        const songs = takeSongs(pools.songs.filter(song => song.uploaderId === artist.id), 3);
        const lyricSong = takeSongs(lyricCandidates(pools.songs).filter(song => !songs.some(selected => selected.id === song.id)), 1)[0];
        const playlists = take(pools.playlists, 5, used.playlists, repeat);
        exhibits.push({ ...base, kind: section.kind, artist, peers: artists.slice(1), songs, playlists, lyricSong });
        break;
      }
      case "artist-feature":
      case "artist-grid": {
        const artists = take(pools.artists, section.count, used.artists, repeat);
        if (!artists.length) break;
        if (section.kind === "artist-grid") exhibits.push({ ...base, kind: section.kind, artists });
        else exhibits.push({ ...base, kind: section.kind, artist: artists[0], artists,
          songs: takeSongs(pools.songs.filter(song => song.uploaderId === artists[0].id), 3) });
        break;
      }
      case "playlist-grid":
      case "listening-room": {
        const playlists = take(pools.playlists, section.count, used.playlists, repeat);
        if (!playlists.length) break;
        if (section.kind === "playlist-grid") exhibits.push({ ...base, kind: section.kind, playlists });
        else for (const playlist of playlists) exhibits.push({ ...base, id: `${base.id}-${playlist.id}`, kind: section.kind, playlist,
          songs: takeSongs(pools.songs.filter(song => song.publishedPlaylistId === playlist.id), 6) });
        break;
      }
      case "lyric-placard": {
        const songs = takeSongs(lyricCandidates(songSource(section.source, pools.songs)), section.count);
        for (const song of songs) exhibits.push({ ...base, id: `${base.id}-${song.id}`, kind: section.kind, song });
        break;
      }
      default: {
        const songs = takeSongs(songSource(section.source, pools.songs), section.count);
        if (songs.length) exhibits.push({ ...base, kind: section.kind, songs });
      }
    }
  }
  return exhibits;
}

// Rebuild with one context across all batches: safe for React memo recomputation.
export function buildMuseumFeed(pools: MuseumPools, batchCount: number, sections = LIBRARY_SECTIONS) {
  const used = createMuseumSelection();
  const exhibits: MuseumExhibit[] = [];
  for (let batch = 0; batch < batchCount; batch += 1) {
    const next = buildMuseumBatch(batch, pools, used, sections);
    exhibits.push(...next);
    if (!next.length && batch > 0) break;
  }
  const hasMore = buildMuseumBatch(batchCount, pools, used, sections).length > 0;
  return { exhibits, hasMore };
}

export function shuffleMuseumPools(
  pools: MuseumPools,
  seed = Date.now(),
): MuseumPools {
  let state = seed >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  const shuffle = <T>(items: T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  return {
    artists: shuffle(pools.artists),
    songs: shuffle(pools.songs),
    playlists: shuffle(pools.playlists),
  };
}
