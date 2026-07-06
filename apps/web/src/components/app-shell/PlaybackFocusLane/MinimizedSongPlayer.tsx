import { Maximize2 } from "lucide-react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
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
  withPlayer: boolean;
};

export function MinimizedSongPlayer({
  recording,
  artistName,
  artistUsername,
  visible,
  showExpand,
  onExpand,
  withPlayer,
}: MinimizedSongPlayerProps) {
  const links = resolveArtistVisualLinks({
    recording,
    artistUsername: artistUsername ?? recording.ownerUsername,
  });

  return (
    <div
      {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
      className={[
        "focus-lane__mini-player",
        visible ? "is-visible" : "",
        withPlayer ? "" : "focus-lane__mini-player--no-player",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!visible}
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
            title="Expand artist card"
            aria-label="Expand artist card"
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
