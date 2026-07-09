import type { FocusRecording } from "@/lib/playbackFocus/types";
import { formatDuration, formatPlayCount } from "@/lib/format";

import { FocusLaneOverlay } from "./FocusLaneOverlay";
import { useFocusLaneArtistMeta } from "./useFocusLaneArtistMeta";

type TitleIntroVisualProps = {
  title: string;
  artistName?: string | null;
  recording?: FocusRecording | null;
  withPlayer?: boolean;
  playerCollapsed?: boolean;
};

export function TitleIntroVisual({
  title,
  artistName,
  recording,
  withPlayer = true,
  playerCollapsed = false,
}: TitleIntroVisualProps) {
  const artistId = recording?.ownerId ?? undefined;
  const { links, displayGenres, profileLinks, libraryTrack } = useFocusLaneArtistMeta(artistId, recording);

  const durationLabel =
    recording?.durationSeconds && recording.durationSeconds > 0
      ? formatDuration(recording.durationSeconds)
      : null;
  const playCount = recording?.playCount ?? libraryTrack?.playCount ?? 0;
  const playCountLabel = playCount > 0 ? formatPlayCount(playCount) : null;
  const meta = [durationLabel, playCountLabel ? `${playCountLabel} plays` : null].filter(Boolean).join(" · ") || null;

  return (
    <FocusLaneOverlay
      imageUrl={recording?.artworkUrl}
      imageAlt={title}
      imageHref={links.songHref}
      primary={{ label: title, href: links.songHref }}
      secondary={artistName ? { label: artistName, href: links.artistHref } : null}
      meta={meta}
      genres={displayGenres}
      recordingId={recording?.id}
      artistId={artistId}
      profileLinks={profileLinks}
      profileLinksAriaLabel={artistName ? `${artistName} social links` : "Artist social links"}
      position="center-middle"
      withPlayer={withPlayer}
      playerCollapsed={playerCollapsed}
    />
  );
}
