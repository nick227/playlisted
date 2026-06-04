import type { LibrarySong } from "@playlisted/client-sdk";

import {
  artistPath,
  FAVORITES_PATH,
  GENRES_PATH,
  genrePath,
  PLAYLISTS_PATH,
  SONGS_PATH,
  ARTISTS_PATH,
} from "@/lib/browsePaths";
import { playlistPath } from "@/lib/routes";

export { artistPath, genrePath, ARTISTS_PATH, FAVORITES_PATH, GENRES_PATH, PLAYLISTS_PATH, SONGS_PATH };

export function libraryGenrePath(slug: string): string {
  return genrePath(slug);
}

export function libraryRecordingPath(song: LibrarySong): string {
  const base = playlistPath({
    id: song.playlist.id,
    username: song.uploader.username,
    slug: song.playlist.slug,
  });
  return `${base}#track-${song.id}`;
}

export function libraryArtistPath(song: LibrarySong): string {
  return artistPath(song.uploader.username);
}
