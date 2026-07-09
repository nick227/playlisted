import type { FocusRecording } from "@/lib/playbackFocus/types";

import { MinimizedSongPlayer } from "./PlaybackFocusLane/MinimizedSongPlayer";

export type PlaybackFocusTrack = {
  id: string;
  title: string;
  source: "site" | "radio";
  artworkUrl?: string | null;
  ownerName?: string | null;
  ownerUsername?: string | null;
  playlistId?: string | null;
  playlistTitle?: string | null;
  playlistSlug?: string | null;
  sourceLabel?: string;
  sourceHref?: string;
};

type PlaybackFocusLayerProps = {
  visible: boolean;
  track: PlaybackFocusTrack | null;
  onReturn: () => void;
  withPlayer: boolean;
  snapReveal: boolean;
};

function toFocusRecording(track: PlaybackFocusTrack): FocusRecording {
  return {
    id: track.id,
    title: track.title,
    artworkUrl: track.artworkUrl,
    ownerName: track.ownerName,
    ownerUsername: track.ownerUsername,
    playlistTitle: track.playlistTitle,
    playlistId: track.playlistId,
    playlistSlug: track.playlistSlug,
  };
}

export function PlaybackFocusLayer({
  visible,
  track,
  onReturn,
  withPlayer,
  snapReveal,
}: PlaybackFocusLayerProps) {
  if (!track) return null;

  return (
    <MinimizedSongPlayer
      recording={toFocusRecording(track)}
      artistName={track.ownerName ?? undefined}
      artistUsername={track.ownerUsername}
      visible={visible}
      showExpand
      onExpand={onReturn}
      expandLabel="Return to page"
      withPlayer={withPlayer}
      snapReveal={snapReveal}
    />
  );
}
