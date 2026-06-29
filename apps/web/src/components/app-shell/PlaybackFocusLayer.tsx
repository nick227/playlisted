import { Maximize2 } from "lucide-react";
import { Link } from "react-router-dom";

import { coverFallback, playlistPath, playlistRecordingPath, profilePath } from "@/lib/routes";

export type PlaybackFocusTrack = {
  id: string;
  title: string;
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

export function PlaybackFocusLayer({
  visible,
  track,
  onReturn,
  withPlayer,
  snapReveal,
}: PlaybackFocusLayerProps) {
  if (!track) return null;

  const artistHref = track.ownerUsername ? profilePath(track.ownerUsername) : null;
  const playlistHref = track.playlistId
    ? playlistPath({
      id: track.playlistId,
      username: track.ownerUsername ?? undefined,
      slug: track.playlistSlug ?? undefined,
    })
    : null;
  const songHref = track.playlistId
    ? playlistRecordingPath(
      {
        id: track.playlistId,
        username: track.ownerUsername ?? undefined,
        slug: track.playlistSlug ?? undefined,
      },
      track,
    )
    : null;

  const artworkStyle = track.artworkUrl
    ? { backgroundImage: `url(${track.artworkUrl})` }
    : { background: coverFallback(track.title) };

  return (
    <section
      className={`play-focus-layer${visible ? " is-visible" : ""}${withPlayer ? "" : " play-focus-layer--no-player"}${snapReveal ? " is-play-focus-revealing" : ""}`}
      aria-hidden={!visible}
    >
      <div className="play-focus-now-playing">
        <div
          className="h-10 w-10 shrink-0 rounded bg-cover bg-center"
          style={artworkStyle}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            {track.sourceHref && track.sourceLabel ? (
              <Link
                to={track.sourceHref}
                className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand)] transition hover:text-white"
              >
                {track.sourceLabel}
              </Link>
            ) : null}
            <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Now playing
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {songHref ? (
              <Link
                to={songHref}
                className="truncate text-sm font-semibold text-white transition hover:text-[var(--color-brand)]"
              >
                {track.title}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold text-white">{track.title}</p>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
            {track.ownerName ? (
              artistHref ? (
                <Link to={artistHref} className="hover:text-white hover:underline">
                  {track.ownerName}
                </Link>
              ) : (
                track.ownerName
              )
            ) : null}
            {track.ownerName && track.playlistTitle ? (
              <span className="mx-1 text-white/25" aria-hidden>
                ·
              </span>
            ) : null}
            {track.playlistTitle ? (
              playlistHref ? (
                <Link to={playlistHref} className="hover:text-white hover:underline">
                  {track.playlistTitle}
                </Link>
              ) : (
                track.playlistTitle
              )
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onReturn();
          }}
          onClick={onReturn}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-white/30 hover:bg-white/18"
          aria-label="Return to page"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </section>
  );
}
