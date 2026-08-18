import type { FocusRecording } from "@/lib/playbackFocus/types";

import { FocusLaneOverlay } from "./FocusLaneOverlay";
import { useFocusLaneArtistMeta } from "./useFocusLaneArtistMeta";

type ArtistVisualProps = {
  artistName?: string;
  imageUrl?: string;
  recording?: FocusRecording | null;
  isPlaying?: boolean;
  withPlayer?: boolean;
  playerCollapsed?: boolean;
};

export function ArtistVisual({
  artistName,
  imageUrl,
  recording,
  isPlaying = false,
  withPlayer = true,
  playerCollapsed = false,
}: ArtistVisualProps) {
  const artistId = recording?.ownerId ?? undefined;
  const { links, displayGenres } = useFocusLaneArtistMeta(artistId, recording);

  return (
    <FocusLaneOverlay
      imageUrl={imageUrl}
      imageAlt={artistName ?? ""}
      imageHref={links.artistHref}
      primary={{ label: artistName ?? "", href: links.artistHref }}
      genres={displayGenres}
      isPlaying={isPlaying}
      recordingId={recording?.id}
      withPlayer={withPlayer}
      playerCollapsed={playerCollapsed}
      position="center-middle"
    />
  );
}
