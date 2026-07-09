import { Maximize2 } from "lucide-react";
import { useCallback } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import type { SwipeDirection } from "@/lib/browseNavigation/types";
import {
  SWIPE_CLICK_SUPPRESS_MS,
  armTheatreSwipeSuppress,
  isGestureExcludedTarget,
} from "@/lib/gestures/swipeGesture";
import { PLAYBACK_FOCUS_INTERACTIVE_ATTR, stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";
import type { FocusRecording } from "@/lib/playbackFocus/types";

import { FocusLaneLink, resolveArtistVisualLinks } from "./artistVisualLinks";

type MinimizedSongPlayerProps = {
  recording: FocusRecording;
  artistName?: string;
  artistUsername?: string | null;
  visible: boolean;
  showExpand: boolean;
  onExpand?: () => void;
  onSkip?: (direction: SwipeDirection) => void;
  expandLabel?: string;
  withPlayer: boolean;
  snapReveal?: boolean;
};

function isMiniPlayerGestureExcludedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(".focus-lane__mini-player-expand, .focus-lane__mini-player-favorite")) return true;
  if (target.closest(".focus-lane__mini-player-card")) return false;
  return isGestureExcludedTarget(target);
}

export function MinimizedSongPlayer({
  recording,
  artistName,
  artistUsername,
  visible,
  showExpand,
  onExpand,
  onSkip,
  expandLabel = "Expand artist card",
  withPlayer,
  snapReveal = false,
}: MinimizedSongPlayerProps) {
  const links = resolveArtistVisualLinks({
    recording,
    artistUsername: artistUsername ?? recording.ownerUsername,
  });

  const handleHorizontalSwipe = useCallback(
    (direction: SwipeDirection) => {
      armTheatreSwipeSuppress(SWIPE_CLICK_SUPPRESS_MS);
      onSkip?.(direction);
    },
    [onSkip],
  );

  const gestureHandlers = useSwipeGesture({
    enabled: visible && Boolean(onSkip),
    axis: "horizontal",
    isExcludedTarget: isMiniPlayerGestureExcludedTarget,
    onIntentStart: axis => {
      if (axis === "horizontal") armTheatreSwipeSuppress(SWIPE_CLICK_SUPPRESS_MS);
    },
    onHorizontalSwipe: handleHorizontalSwipe,
  });

  return (
    <div
      {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
      className={[
        "focus-lane__mini-player",
        visible ? "is-visible" : "",
        withPlayer ? "" : "focus-lane__mini-player--no-player",
        snapReveal ? "is-play-focus-revealing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!visible}
      onPointerDown={gestureHandlers.onPointerDown}
      onPointerMove={gestureHandlers.onPointerMove}
      onPointerUp={gestureHandlers.onPointerUp}
      onPointerCancel={gestureHandlers.onPointerCancel}
      onLostPointerCapture={gestureHandlers.onLostPointerCapture}
      onClickCapture={gestureHandlers.onClick}
    >
      <div className="focus-lane__mini-player-card">
        {links.songHref ? (
          <FocusLaneLink
            to={links.songHref}
            title={`Open ${recording.title}`}
            className="focus-lane__mini-player-art shrink-0"
          >
            {recording.artworkUrl ? (
              <img src={recording.artworkUrl} alt={recording.title} className="h-8 w-8 rounded object-cover" />
            ) : (
              <div className="h-8 w-8 rounded bg-white/10" aria-hidden />
            )}
          </FocusLaneLink>
        ) : recording.artworkUrl ? (
          <img
            src={recording.artworkUrl}
            alt={recording.title}
            className="focus-lane__mini-player-art h-8 w-8 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="focus-lane__mini-player-art h-8 w-8 shrink-0 rounded bg-white/10" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          {links.songHref ? (
            <FocusLaneLink
              to={links.songHref}
              title={`Open ${recording.title}`}
              className="focus-lane__mini-player-title block truncate text-xs font-semibold text-white transition hover:text-[var(--color-brand)]"
            >
              {recording.title}
            </FocusLaneLink>
          ) : (
            <p className="focus-lane__mini-player-title truncate text-xs font-semibold text-white">
              {recording.title}
            </p>
          )}
          {artistName ? (
            links.artistHref ? (
              <FocusLaneLink
                to={links.artistHref}
                title={`View ${artistName}`}
                className="focus-lane__mini-player-artist mt-0.5 block truncate text-[10px] font-medium text-white/55 transition hover:text-white"
              >
                {artistName}
              </FocusLaneLink>
            ) : (
              <p className="focus-lane__mini-player-artist mt-0.5 truncate text-[10px] font-medium text-white/55">
                {artistName}
              </p>
            )
          ) : null}
        </div>

        <div
          className="focus-lane__mini-player-favorite shrink-0"
          onPointerDown={stopPlaybackFocusBubble}
          onClick={stopPlaybackFocusBubble}
        >
          <FavoriteHeartButton
            target="recording"
            id={recording.id}
            variant="inline"
            inlineAlwaysVisible
            className="focus-lane__mini-player-heart h-7 w-7"
          />
        </div>

        {showExpand && onExpand ? (
          <button
            type="button"
            className="focus-lane__mini-player-expand"
            title={expandLabel}
            aria-label={expandLabel}
            onPointerDown={stopPlaybackFocusBubble}
            onClick={(event) => {
              stopPlaybackFocusBubble(event);
              onExpand();
            }}
          >
            <Maximize2 size={14} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
