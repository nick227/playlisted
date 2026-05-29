import { useCallback } from "react";

import type { QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

export type AppendResult = { added: number; skipped: number };

export function useAppendToQueue() {
  const { appendToQueue, queue } = useAudioPlayer();

  const appendTrack = useCallback(
    (track: QueueTrack): AppendResult => {
      if (queue.some((t) => t.id === track.id)) {
        return { added: 0, skipped: 1 };
      }
      appendToQueue(track);
      return { added: 1, skipped: 0 };
    },
    [appendToQueue, queue],
  );

  const appendTracks = useCallback(
    (tracks: QueueTrack[]): AppendResult => {
      const existing = new Set(queue.map((t) => t.id));
      let added = 0;
      let skipped = 0;

      for (const track of tracks) {
        if (existing.has(track.id)) {
          skipped += 1;
          continue;
        }
        appendToQueue(track);
        existing.add(track.id);
        added += 1;
      }

      return { added, skipped };
    },
    [appendToQueue, queue],
  );

  return { appendTrack, appendTracks };
}
