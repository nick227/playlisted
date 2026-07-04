import { useCallback, useEffect, useRef, useState } from "react";

import { useRecordingReactions } from "@/hooks/useRecordingReactions";
import {
  canToggleRecordingReaction,
  reactionButtonTitle,
  RECORDING_REACTIONS,
  type RecordingReactionId,
} from "@/lib/reactions/recordingReactions";
import { stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";

const POP_MS = 420;

type PlaybackFocusReactionBarProps = {
  recordingId?: string;
};

export function PlaybackFocusReactionBar({ recordingId }: PlaybackFocusReactionBarProps) {
  const { activeIds, isAuthenticated, toggleReaction } = useRecordingReactions(recordingId);
  const [popReaction, setPopReaction] = useState<RecordingReactionId | null>(null);
  const popTimerRef = useRef<number | null>(null);

  const clearPopTimer = useCallback(() => {
    if (popTimerRef.current === null) return;
    window.clearTimeout(popTimerRef.current);
    popTimerRef.current = null;
  }, []);

  useEffect(() => clearPopTimer, [clearPopTimer]);

  const handleReactionClick = (reactionId: RecordingReactionId) => {
    toggleReaction(reactionId);
    setPopReaction(reactionId);
    clearPopTimer();
    popTimerRef.current = window.setTimeout(() => {
      setPopReaction(null);
      popTimerRef.current = null;
    }, POP_MS);
  };

  return (
    <div
      className="focus-lane__reactions"
      role="toolbar"
      aria-label="Track reactions"
      onPointerDown={stopPlaybackFocusBubble}
      onClick={stopPlaybackFocusBubble}
    >
      {RECORDING_REACTIONS.map((reaction) => {
        const { id, icon: Icon } = reaction;
        const isActive = activeIds.has(id);
        const isPopping = popReaction === id;
        const canToggle = canToggleRecordingReaction(reaction, {
          isAuthenticated,
          hasRecording: Boolean(recordingId),
        });
        const title = reactionButtonTitle(reaction, { isAuthenticated, isActive });

        return (
          <button
            key={id}
            type="button"
            className={[
              "focus-lane__reaction",
              isActive ? "is-active" : "",
              isPopping ? "is-pop" : "",
              !canToggle ? "is-disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={title}
            aria-label={title}
            aria-pressed={isActive}
            aria-disabled={!canToggle}
            disabled={!canToggle}
            onClick={() => {
              if (!canToggle) return;
              handleReactionClick(id);
            }}
          >
            <Icon size={16} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
