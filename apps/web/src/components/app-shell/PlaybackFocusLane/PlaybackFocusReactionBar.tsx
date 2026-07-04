import { Flame, Heart, Sparkles, ThumbsUp, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";

type ReactionId = "love" | "fire" | "sparkle" | "thumbs";

type ReactionDef = {
  id: ReactionId;
  label: string;
  icon: LucideIcon;
};

const REACTIONS: ReactionDef[] = [
  { id: "love", label: "Love", icon: Heart },
  { id: "fire", label: "Fire", icon: Flame },
  { id: "sparkle", label: "Sparkle", icon: Sparkles },
  { id: "thumbs", label: "Thumbs up", icon: ThumbsUp },
];

const POP_MS = 420;

export function PlaybackFocusReactionBar() {
  const [activeReaction, setActiveReaction] = useState<ReactionId | null>(null);
  const [popReaction, setPopReaction] = useState<ReactionId | null>(null);
  const popTimerRef = useRef<number | null>(null);

  const clearPopTimer = useCallback(() => {
    if (popTimerRef.current === null) return;
    window.clearTimeout(popTimerRef.current);
    popTimerRef.current = null;
  }, []);

  useEffect(() => clearPopTimer, [clearPopTimer]);

  const handleReactionClick = (reactionId: ReactionId) => {
    setActiveReaction((current) => (current === reactionId ? null : reactionId));
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
      {REACTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = activeReaction === id;
        const isPopping = popReaction === id;

        return (
          <button
            key={id}
            type="button"
            className={[
              "focus-lane__reaction",
              isActive ? "is-active" : "",
              isPopping ? "is-pop" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => handleReactionClick(id)}
          >
            <Icon size={16} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
