import type { FocusRecording } from "@/lib/playbackFocus/types";

import { FocusLaneOverlay } from "./FocusLaneOverlay";
import { useFocusLaneArtistMeta } from "./useFocusLaneArtistMeta";

type ArtistVisualProps = {
  artistName?: string;
  imageUrl?: string;
  artistBio?: string | null;
  recording?: FocusRecording | null;
  isPlaying?: boolean;
  withPlayer?: boolean;
  playerCollapsed?: boolean;
};

export function ArtistVisual({
  artistName,
  imageUrl,
  artistBio,
  recording,
  isPlaying = false,
  withPlayer = true,
  playerCollapsed = false,
}: ArtistVisualProps) {
  const artistId = recording?.ownerId ?? undefined;
  const { links, displayGenres, profileLinks } = useFocusLaneArtistMeta(artistId, recording);

  return (
    <FocusLaneOverlay
      imageUrl={imageUrl}
      imageAlt={artistName ?? ""}
      imageHref={links.artistHref}
      primary={{ label: artistName ?? "", href: links.artistHref }}
      secondary={artistBio ? { label: artistBio } : null}
      genres={displayGenres}
      isPlaying={isPlaying}
      recordingId={recording?.id}
      artistId={artistId}
      profileLinks={profileLinks}
      profileLinksAriaLabel={artistName ? `${artistName} social links` : "Artist social links"}
      withPlayer={withPlayer}
      playerCollapsed={playerCollapsed}
    />
  );
}
