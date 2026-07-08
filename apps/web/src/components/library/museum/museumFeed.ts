import type { LibrarySong } from "@playlisted/client-sdk";

import type { MuseumExhibit, MuseumPools } from "./museumTypes";

const BATCH_PATTERN = [
  "artist-feature",
  "song-tracklist",
  "lyric-placard",
  "song-grid",
  "artist-grid",
  "listening-room",
  "playlist-grid",
] as const;

function pick<T>(pool: T[], count: number, offset: number): T[] {
  if (pool.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pool[(offset + i) % pool.length]);
  }
  return out;
}

function songsForArtist(songs: LibrarySong[], artistId: string, limit: number): LibrarySong[] {
  return songs.filter((song) => song.uploaderId === artistId).slice(0, limit);
}

function lyricCandidates(songs: LibrarySong[]): LibrarySong[] {
  const ready = songs.filter((song) => song.subtitle?.status === "READY");
  if (ready.length > 0) return ready;
  return songs.filter((song) => Boolean(song.description?.trim()));
}

export function buildMuseumBatch(batchIndex: number, pools: MuseumPools): MuseumExhibit[] {
  const { artists, songs, playlists } = pools;
  if (artists.length === 0 && songs.length === 0 && playlists.length === 0) return [];

  const exhibits: MuseumExhibit[] = [];
  const baseOffset = batchIndex * BATCH_PATTERN.length;

  if (batchIndex === 0 && artists.length > 0) {
    const artist = artists[0];
    const artistSongs = songsForArtist(songs, artist.id, 5);
    const lyricPool = lyricCandidates(artistSongs.length > 0 ? artistSongs : songs);
    exhibits.push({
      id: `showcase-${artist.id}`,
      kind: "showcase",
      artist,
      songs: artistSongs.length > 0 ? artistSongs : pick(songs, 5, 0),
      playlist: playlists[0],
      lyricSong: lyricPool[0],
      peers: pick(artists, 4, 1),
    });
  }

  for (let step = 0; step < BATCH_PATTERN.length; step += 1) {
    const slot = BATCH_PATTERN[step];
    const offset = baseOffset + step;

    if (slot === "artist-feature" && artists.length > 0) {
      const artist = artists[(offset + 1) % artists.length];
      exhibits.push({
        id: `artist-feature-${batchIndex}-${artist.id}`,
        kind: "artist-feature",
        artist,
        songs: songsForArtist(songs, artist.id, 5),
      });
      continue;
    }

    if (slot === "song-tracklist" && songs.length > 0) {
      exhibits.push({
        id: `song-tracklist-${batchIndex}-${offset}`,
        kind: "song-tracklist",
        songs: pick(songs, 6, offset * 2),
      });
      continue;
    }

    if (slot === "song-grid" && songs.length > 0) {
      exhibits.push({
        id: `song-grid-${batchIndex}-${offset}`,
        kind: "song-grid",
        songs: pick(songs, 4, offset * 2),
      });
      continue;
    }

    if (slot === "lyric-placard") {
      const candidates = lyricCandidates(songs);
      if (candidates.length === 0) continue;
      const song = candidates[offset % candidates.length];
      exhibits.push({
        id: `lyric-${batchIndex}-${song.id}`,
        kind: "lyric-placard",
        song,
      });
      continue;
    }

    if (slot === "artist-grid" && artists.length > 0) {
      exhibits.push({
        id: `artist-grid-${batchIndex}-${offset}`,
        kind: "artist-grid",
        artists: pick(artists, 4, offset + 2),
      });
      continue;
    }

    if (slot === "listening-room" && playlists.length > 0) {
      const playlist = playlists[offset % playlists.length];
      exhibits.push({
        id: `listening-${batchIndex}-${playlist.id}`,
        kind: "listening-room",
        playlist,
      });
      continue;
    }

    if (slot === "playlist-grid" && playlists.length > 0) {
      exhibits.push({
        id: `playlist-grid-${batchIndex}-${offset}`,
        kind: "playlist-grid",
        playlists: pick(playlists, 3, offset + 1),
      });
      continue;
    }
  }

  return exhibits;
}

export function shuffleMuseumPools(pools: MuseumPools, seed = Date.now()): MuseumPools {
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
