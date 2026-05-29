import type { LibrarySong } from "@playlisted/client-sdk";

import { playlistPath, profilePath } from "@/lib/routes";

export function libraryGenrePath(slug: string): string {
  return `/library?${new URLSearchParams({ genre: slug }).toString()}`;
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
  return profilePath(song.uploader.username);
}
