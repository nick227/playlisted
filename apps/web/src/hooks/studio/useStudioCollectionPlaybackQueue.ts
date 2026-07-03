import { useMemo } from "react";

import { withQueueTrackSubtitleStyle } from "@/lib/queueTrack";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";

import type { PlaylistDetailWithTags } from "./types";

export function useStudioCollectionPlaybackQueue(collection: PlaylistDetailWithTags | null | undefined) {
  const { setQueue, currentTrack, togglePlay } = useAudioPlayer();

  const queueTracks: QueueTrack[] = useMemo(
    () =>
      collection?.recordings.map((recording) =>
        withQueueTrackSubtitleStyle({
          ...recording,
          playlistTitle: collection.title,
          ownerName: collection.owner.displayName,
        }),
      ) ?? [],
    [collection?.recordings, collection?.title, collection?.owner.displayName],
  );

  function playRecording(recordingId: string) {
    if (!collection) return;

    const index = queueTracks.findIndex((track) => track.id === recordingId);
    if (index < 0) return;

    if (currentTrack?.id === recordingId) {
      togglePlay();
      return;
    }

    setQueue(queueTracks, index, {
      playlistId: collection.id,
      playlistOwnerUsername: collection.owner.username,
      playlistSlug: collection.slug,
      sourceContext: "studio-editor",
    });
  }

  return {
    playRecording,
  };
}
