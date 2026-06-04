import type { LibrarySong } from "@playlisted/client-sdk";

import {
  artistPath,
  genrePath,
  ARTISTS_PATH,
  GENRES_PATH,
  PLAYLISTS_PATH,
  SONGS_PATH,
} from "@/lib/browsePaths";
import { playlistPath, profilePath } from "@/lib/routes";

export { artistPath, genrePath, ARTISTS_PATH, GENRES_PATH, PLAYLISTS_PATH, SONGS_PATH };

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

/** @deprecated Use artistPath for library browse; profilePath for public profile links. */
export function libraryArtistProfilePath(song: LibrarySong): string {
  return profilePath(song.uploader.username);
}
