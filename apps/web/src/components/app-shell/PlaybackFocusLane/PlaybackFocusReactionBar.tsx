import { useCallback, useEffect, useRef, useState } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useRecordingReactions } from "@/hooks/useRecordingReactions";
import {
  canToggleRecordingReaction,
  reactionButtonTitle,
  RECORDING_REACTIONS,
  type RecordingReactionId,
} from "@/lib/reactions/recordingReactions";
import { stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";

const POP_MS = 420;
const TRACK_REACTIONS = RECORDING_REACTIONS.filter((reaction) => reaction.id !== "love");

type PlaybackFocusReactionBarProps = {
  recordingId?: string;
  artistId?: string;
};

export function PlaybackFocusReactionBar({ recordingId, artistId }: PlaybackFocusReactionBarProps) {
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
      aria-label="Artist and track reactions"
      onPointerDown={stopPlaybackFocusBubble}
      onClick={stopPlaybackFocusBubble}
    >
      {artistId ? (
        <FavoriteHeartButton
          target="artist"
          id={artistId}
          variant="inline"
          inlineAlwaysVisible
          className="focus-lane__reaction !h-8 !w-8 !rounded-full !border !border-white/12 !bg-white/[0.06] !p-0 !opacity-100 hover:!border-white/24 hover:!bg-white/12"
        />
      ) : null}
      {TRACK_REACTIONS.map((reaction) => {
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
