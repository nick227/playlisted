import type { FocusRecording, FocusArtist } from "@/lib/playbackFocus/types";

import { FocusLaneOverlay } from "./FocusLaneOverlay";

type TitleIntroVisualProps = {
  title: string;
  artistName?: string | null;
  recording?: FocusRecording | null;
  artist?: FocusArtist | null;
};

export function TitleIntroVisual({ title, artistName, recording, artist }: TitleIntroVisualProps) {
  const imageUrl = recording?.artworkUrl ?? artist?.imageUrl ?? undefined;

  return (
    <FocusLaneOverlay
      imageUrl={imageUrl}
      imageAlt={title}
      primary={{ label: title }}
      secondary={artistName ? { label: artistName } : null}
      recordingId={recording?.id}
      artistId={artist?.id}
      position="center-middle"
      withPlayer={false}
    />
  );
}
