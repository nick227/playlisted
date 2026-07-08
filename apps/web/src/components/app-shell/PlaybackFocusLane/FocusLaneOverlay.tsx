import type { ProfileLink } from "@playlisted/client-sdk";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { getProfileLinkPlatform } from "@/components/profile/profileLinks";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { PLAYBACK_FOCUS_INTERACTIVE_ATTR, stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";

import { FocusLaneGenreLink, FocusLaneLink, type GenreLink } from "./artistVisualLinks";
import { PlaybackFocusReactionBar } from "./PlaybackFocusReactionBar";

const CONTROLS_IDLE_MS = 4000;

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
  eyebrow?: string | null;
  primary: FocusLaneOverlayLink;
  secondary?: FocusLaneOverlayLink | null;
  meta?: string | null;
  genres?: GenreLink[];
  isPlaying?: boolean;
  recordingId?: string;
  artistId?: string;
  profileLinks?: ProfileLink[];
  profileLinksAriaLabel?: string;
};

function OverlayLinkText({ label, href, className }: FocusLaneOverlayLink & { className: string }) {
  if (href) {
    return (
      <FocusLaneLink to={href} title={label} className={`${className} block truncate`}>
        {label}
      </FocusLaneLink>
    );
  }
  return <span className={`${className} block truncate`}>{label}</span>;
}

export function FocusLaneOverlay({
  imageUrl,
  imageAlt,
  imageHref,
  eyebrow,
  primary,
  secondary,
  meta,
  genres = [],
  isPlaying = false,
  recordingId,
  artistId,
  profileLinks = [],
  profileLinksAriaLabel = "Social links",
}: FocusLaneOverlayProps) {
  const reveal = useFocusLaneOverlayReveal(recordingId ?? primary.label);

  const clusterClassName = `focus-lane__overlay-cluster${reveal.visible ? "" : " is-dimmed"}`;

  const art = imageUrl ? (
    <img key={imageUrl} src={imageUrl} alt={imageAlt} className="focus-lane__overlay-art" />
  ) : (
    <div className="focus-lane__overlay-art focus-lane__overlay-art--fallback" aria-hidden />
  );

  return (
    <div
      className="focus-lane__overlay"
      onPointerDownCapture={reveal.handlePointerDownCapture}
      onClickCapture={reveal.handleClickCapture}
      onFocusCapture={reveal.handleFocusCapture}
    >
      <div
        className={`${clusterClassName} focus-lane__overlay-media`}
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
          {eyebrow || isPlaying ? (
            <div className="flex min-w-0 items-center gap-1.5">
              {isPlaying ? (
                <PlaybackBars active playing className="origin-left shrink-0 scale-[0.5] sm:scale-[0.7]" />
              ) : null}
              {eyebrow ? <span className="focus-lane__overlay-eyebrow truncate">{eyebrow}</span> : null}
            </div>
          ) : null}
          <OverlayLinkText {...primary} className="focus-lane__overlay-primary" />
          {secondary ? <OverlayLinkText {...secondary} className="focus-lane__overlay-secondary" /> : null}
          {meta ? <span className="focus-lane__overlay-meta truncate">{meta}</span> : null}
          {genres.length > 0 ? (
            <div className="focus-lane__overlay-genres">
              {genres.map((genre) => (
                <FocusLaneGenreLink key={genre.slug} genre={genre} className="focus-lane__overlay-genre" />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {recordingId || artistId ? (
        <div
          className={`${clusterClassName} focus-lane__overlay-reactions`}
          onPointerDown={stopPlaybackFocusBubble}
          onClick={stopPlaybackFocusBubble}
          {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
        >
          <PlaybackFocusReactionBar recordingId={recordingId} artistId={artistId} />
        </div>
      ) : null}

      {profileLinks.length > 0 ? (
        <nav
          aria-label={profileLinksAriaLabel}
          className={`${clusterClassName} focus-lane__overlay-links`}
          {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
        >
          {profileLinks.map((link) => {
            const platform = getProfileLinkPlatform(link.platform);
            const Icon = platform.icon;
            const label = link.label || platform.label;
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                title={label}
                aria-label={label}
                className="focus-lane__overlay-link"
                onPointerDown={stopPlaybackFocusBubble}
                onClick={stopPlaybackFocusBubble}
              >
                <Icon size={16} className="sm:size-5" aria-hidden />
              </a>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
