import type { FocusRecording } from "@/lib/playbackFocus/types";
import { formatDuration, formatPlayCount } from "@/lib/format";

import { FocusLaneOverlay } from "./FocusLaneOverlay";
import { useFocusLaneArtistMeta } from "./useFocusLaneArtistMeta";

type TitleIntroVisualProps = {
  title: string;
  artistName?: string | null;
  recording?: FocusRecording | null;
  isPlaying?: boolean;
  withPlayer?: boolean;
  playerCollapsed?: boolean;
};

export function TitleIntroVisual({
  title,
  artistName,
  recording,
  isPlaying = false,
  withPlayer = true,
  playerCollapsed = false,
}: TitleIntroVisualProps) {
  const artistId = recording?.ownerId ?? undefined;
  const { links, displayGenres, libraryTrack } = useFocusLaneArtistMeta(artistId, recording);

  const durationLabel =
    recording?.durationSeconds && recording.durationSeconds > 0
      ? formatDuration(recording.durationSeconds)
      : null;
  const playCount = recording?.playCount ?? libraryTrack?.playCount ?? 0;
  const playCountLabel = playCount > 0 ? formatPlayCount(playCount) : null;
  const detail = [artistName, durationLabel, playCountLabel ? `${playCountLabel} plays` : null]
    .filter(Boolean)
    .join(" • ") || null;

  return (
    <FocusLaneOverlay
      imageUrl={recording?.artworkUrl}
      imageAlt={title}
      imageHref={links.songHref}
      primary={{ label: title, href: links.songHref }}
      detail={detail}
      genres={displayGenres}
      recordingId={recording?.id}
      isPlaying={isPlaying}
      withPlayer={withPlayer}
      playerCollapsed={playerCollapsed}
    />
  );
}
