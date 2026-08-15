import { Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { PLAYBACK_FOCUS_INTERACTIVE_ATTR, stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";
import { usePlaybackVolume } from "@/providers/PlaybackVolumeProvider";

import { FocusLaneLink, type GenreLink } from "./artistVisualLinks";
import { PlaybackFocusReactionBar } from "./PlaybackFocusReactionBar";

const CONTROLS_IDLE_MS = 4000;
const ART_RELOAD_MS = 2000;

// Auto-hide is disabled while overlay positioning is still being dialed in —
// flip this back on once layout is settled. The reveal/capture plumbing below
// stays intact so re-enabling is just this flag.
const CONTROLS_AUTO_HIDE_ENABLED = false;

/**
 * Controls fade out after a period of inactivity. While faded, the first tap only
 * reveals them again and is swallowed so it can't blindly trigger whatever was underneath.
 */
function useFocusLaneOverlayReveal(resetKey: unknown) {
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);
  const hideTimerRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const armHideTimer = useCallback(() => {
    clearHideTimer();
    if (!CONTROLS_AUTO_HIDE_ENABLED) return;
    hideTimerRef.current = window.setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      hideTimerRef.current = null;
    }, CONTROLS_IDLE_MS);
  }, [clearHideTimer]);

  const reveal = useCallback(() => {
    visibleRef.current = true;
    setVisible(true);
    armHideTimer();
  }, [armHideTimer]);

  useEffect(() => {
    reveal();
    return clearHideTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handlePointerDownCapture = useCallback(
    (event: ReactPointerEvent) => {
      if (!visibleRef.current) {
        suppressNextClickRef.current = true;
        event.preventDefault();
        event.stopPropagation();
      }
      reveal();
    },
    [reveal],
  );

  const handleClickCapture = useCallback((event: ReactMouseEvent) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return {
    visible,
    handlePointerDownCapture,
    handleClickCapture,
    handleFocusCapture: reveal,
  };
}

type FocusLaneOverlayLink = {
  label: string;
  href?: string | null;
};

export type FocusLaneOverlayProps = {
  imageUrl?: string | null;
  imageAlt: string;
  imageHref?: string | null;
  primary: FocusLaneOverlayLink;
  detail?: string | null;
  className?: string;
  genres?: GenreLink[];
  isPlaying?: boolean;
  recordingId?: string;
  /** False when no docked media bar (radio page, dismissed player). */
  withPlayer?: boolean;
  /** True while the site bottom player is focus-collapsed to a thin peek. */
  playerCollapsed?: boolean;
};

type FocusLanePersistentControlsProps = {
  recordingId: string;
  withPlayer?: boolean;
  playerCollapsed?: boolean;
};

function OverlayLinkText({ label, href, className }: FocusLaneOverlayLink & { className: string }) {
  if (href) {
    return (
      <FocusLaneLink to={href} title={label} className={`${className} block`}>
        {label}
      </FocusLaneLink>
    );
  }
  return <span className={`${className} block`}>{label}</span>;
}

/** Brief brand spinner on track-skip so chrome stays put while art/meta refresh. */
function useOverlayArtReload(recordingId?: string) {
  const [reloading, setReloading] = useState(false);
  const lastRecordingIdRef = useRef<string | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!recordingId) return;

    const previousRecordingId = lastRecordingIdRef.current;
    if (previousRecordingId === recordingId) return;

    if (previousRecordingId === null) {
      lastRecordingIdRef.current = recordingId;
      return;
    }

    const generation = ++generationRef.current;
    setReloading(true);

    const timeout = window.setTimeout(() => {
      if (generationRef.current !== generation) return;
      setReloading(false);
      lastRecordingIdRef.current = recordingId;
    }, ART_RELOAD_MS);

    return () => window.clearTimeout(timeout);
  }, [recordingId]);

  return reloading;
}

export function FocusLaneOverlay({
  imageUrl,
  imageAlt,
  imageHref,
  primary,
  detail,
  genres = [],
  isPlaying = false,
  recordingId,
  className,
  withPlayer = true,
  playerCollapsed = false,
}: FocusLaneOverlayProps) {
  const reveal = useFocusLaneOverlayReveal(recordingId ?? primary.label);
  const artReloading = useOverlayArtReload(recordingId);

  const clusterClassName = `focus-lane__overlay-cluster${reveal.visible ? "" : " is-dimmed"}`;
  const overlayClassName = [
    "focus-lane__overlay",
    "focus-lane__overlay--center-middle",
    withPlayer ? "" : "focus-lane__overlay--no-player",
    withPlayer && playerCollapsed ? "focus-lane__overlay--player-collapsed" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const art = (
    <div className="focus-lane__overlay-art-frame">
      {artReloading ? (
        <div className="focus-lane__overlay-art-loading" aria-busy="true" aria-label="Loading track">
          <Loader2 className="focus-lane__overlay-art-spinner" aria-hidden />
        </div>
      ) : imageUrl ? (
        <img key={imageUrl} src={imageUrl} alt={imageAlt} className="focus-lane__overlay-art" />
      ) : (
        <div className="focus-lane__overlay-art focus-lane__overlay-art--fallback" aria-hidden />
      )}
    </div>
  );

  return (
    <div
      className={overlayClassName}
      onPointerDownCapture={reveal.handlePointerDownCapture}
      onClickCapture={reveal.handleClickCapture}
      onFocusCapture={reveal.handleFocusCapture}
    >
      <div
        className={`${clusterClassName} ${className || ""} focus-lane__overlay-media`}
        {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
      >
        {imageHref ? (
          <FocusLaneLink to={imageHref} title={primary.label} className="focus-lane__overlay-art-link shrink-0">
            {art}
          </FocusLaneLink>
        ) : (
          art
        )}
        <div className="focus-lane__overlay-body">
          <div className="min-w-0">
            <OverlayLinkText {...primary} className="focus-lane__overlay-primary min-w-0" />
          </div>
          <span className="focus-lane__overlay-detail">{detail || "\u00a0"}</span>
          <div className="focus-lane__overlay-status-row">
            <span className="focus-lane__overlay-bars-slot" aria-hidden={!isPlaying}>
              {isPlaying ? <PlaybackBars active playing className="focus-lane__overlay-playback-bars" /> : null}
            </span>
            {genres[0] ? <span className="focus-lane__overlay-genre-text">{genres[0].name}</span> : null}
          </div>
        </div>
      </div>

    </div>
  );
}

/** Persistent focus-mode chrome, intentionally independent of center content. */
export function FocusLanePersistentControls({
  recordingId,
  withPlayer = true,
  playerCollapsed = false,
}: FocusLanePersistentControlsProps) {
  const { volume, setVolume } = usePlaybackVolume();
  const overlayClassName = [
    "focus-lane__overlay",
    withPlayer ? "" : "focus-lane__overlay--no-player",
    withPlayer && playerCollapsed ? "focus-lane__overlay--player-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={overlayClassName}>
      <div
        className="focus-lane__overlay-cluster focus-lane__overlay-reactions"
        onPointerDown={stopPlaybackFocusBubble}
        onClick={stopPlaybackFocusBubble}
        {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
      >
        <PlaybackFocusReactionBar recordingId={recordingId} />
      </div>
    </div>
  );
}
