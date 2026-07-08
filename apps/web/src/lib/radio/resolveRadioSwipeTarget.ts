import { playlistPath, profilePath } from "@/lib/routes";

export type RadioSwipeTrack = {
  playlist: { id: string; slug: string };
  uploader: { username: string };
};

/**
 * Radio has no real next/previous queue, so a swipe just drops the listener onto a
 * real browsable page for the current track instead. Genre stations always land on
 * the track's own playlist (it's already a coherent, genre-curated destination); the
 * main station has no genre to lean on, so it coin-flips between the track's playlist
 * and the artist's profile to avoid always dead-ending on a possibly thin one-off playlist.
 */
export function resolveRadioSwipeTarget(track: RadioSwipeTrack, stationSlug: string | null): string {
  const playlistHref = playlistPath({
    id: track.playlist.id,
    slug: track.playlist.slug,
    username: track.uploader.username,
  });

  if (stationSlug) return playlistHref;

  return Math.random() < 0.5 ? playlistHref : profilePath(track.uploader.username);
}
