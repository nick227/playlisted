import type { LibrarySong, UserDetail } from "@playlisted/client-sdk";

import { formatDurationLong } from "@/lib/format";

export type ArtistProfileStats = {
  totalStreams: number;
  totalTracks: number;
  totalCollections: number;
  totalDurationSeconds: number;
  totalDurationLabel: string;
  memberSince: string;
  firstUpload: string | null;
  latestUpload: string | null;
};

export type UploadMilestone = {
  id: string;
  title: string;
  date: string;
  playCount: number;
  playlistTitle: string;
};

export function computeArtistStats(user: UserDetail, tracks: LibrarySong[]): ArtistProfileStats {
  const totalStreams = tracks.reduce((sum, track) => sum + (track.playCount ?? 0), 0);
  const totalDurationSeconds = user.publicPlaylists.reduce(
    (sum, playlist) => sum + playlist.totalDurationSeconds,
    0,
  );
  const dates = tracks.map((track) => track.createdAt).filter(Boolean).sort();

  return {
    totalStreams,
    totalTracks: tracks.length,
    totalCollections: user.publicPlaylists.length,
    totalDurationSeconds,
    totalDurationLabel: formatDurationLong(totalDurationSeconds),
    memberSince: user.createdAt,
    firstUpload: dates[0] ?? null,
    latestUpload: dates.at(-1) ?? null,
  };
}

export function buildUploadMilestones(tracks: LibrarySong[], limit = 8): UploadMilestone[] {
  return [...tracks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((track) => ({
      id: track.id,
      title: track.title,
      date: track.createdAt,
      playCount: track.playCount ?? 0,
      playlistTitle: track.playlist.title,
    }));
}

export function profileAccentHue(seed: string): number {
  const hues = [258, 285, 312, 198, 168, 24];
  return hues[seed.charCodeAt(0) % hues.length];
}
