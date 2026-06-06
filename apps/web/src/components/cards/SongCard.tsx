import { Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { LibrarySong } from "@playlisted/client-sdk";

import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { coverFallback, profilePath } from "@/lib/routes";

interface SongCardProps {
  song: LibrarySong;
  isPlaying: boolean;
  isActive?: boolean;
  onPlay: () => void;
}

export function SongCard({ song, isPlaying, isActive = isPlaying, onPlay }: SongCardProps) {
  const playback = useTrackPlayback(song.id);
  const active = isActive || playback.isActive;
  const playing = active && (isPlaying || playback.isPlaying);

  return (
    <div className="group flex w-40 shrink-0 flex-col gap-2">
      <div
        className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
        onClick={onPlay}
      >
        {song.artworkUrl ? (
          <img
            src={song.artworkUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: coverFallback(song.title) }}
            aria-hidden
          />
        )}
        <span
          className={[
            "playback-thumb-glow rounded-lg",
            active ? "is-active" : "",
            playing ? "is-playing" : "",
          ].join(" ")}
          aria-hidden="true"
        />
        <PlaybackBars variant="thumb" active={active} playing={playing} />
        <div
          className={[
            "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          ].join(" ")}
        >
          {playing
            ? <Pause size={28} className="text-white" fill="currentColor" />
            : <Play size={28} className="ml-1 text-white" fill="currentColor" />}
        </div>
        {active && (
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-[var(--color-brand)]" />
        )}
      </div>
      <div className="min-w-0">
        <button
          type="button"
          onClick={onPlay}
          className={[
            "block w-full truncate text-left text-sm font-medium transition",
            active ? "text-[var(--color-brand)]" : "text-white hover:text-white/80",
          ].join(" ")}
        >
          {song.title}
        </button>
        <Link
          to={profilePath(song.uploader.username)}
          onClick={(e) => e.stopPropagation()}
          className="truncate text-xs text-[var(--color-text-muted)] transition hover:text-white"
        >
          {song.uploader.displayName}
        </Link>
      </div>
    </div>
  );
}
