import type { LibrarySong } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { libraryRecordingPath } from "@/lib/libraryPaths";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { useLyricSnippet } from "./useLyricSnippet";
import { MuseumPanel } from "./museumUi";

interface MuseumLyricSnippetProps {
  song: LibrarySong;
  variant?: "inline" | "showcase";
}

export function MuseumLyricSnippet({ song, variant = "inline" }: MuseumLyricSnippetProps) {
  const hasReadySubtitle = song.subtitle?.status === "READY";
  const fallback = song.description ?? song.title;
  const line = useLyricSnippet(song.id, hasReadySubtitle, fallback);
  const { playTrack, currentTrack, isPlaying, togglePlay, ensurePlayback } = useAudioPlayer();
  const { isActive } = useTrackPlayback(song.id);

  function handlePlay() {
    if (currentTrack?.id === song.id) {
      if (isPlaying) togglePlay();
      else ensurePlayback();
      return;
    }
    playTrack(librarySongToQueueTrack(song), [librarySongToQueueTrack(song)], { sourceContext: "library" }, {
      segmentLabel: "Library",
    });
  }

  if (variant === "showcase") {
    return (
      <MuseumPanel padding="roomy" className="relative overflow-hidden bg-black/25">
        {song.artworkUrl ? (
          <img
            src={song.artworkUrl}
            alt=""
            className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 rounded-2xl object-cover opacity-25 blur-[1px] md:h-48 md:w-48"
          />
        ) : (
          <div
            className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 rounded-2xl opacity-20 md:h-48 md:w-48"
            style={{ background: coverFallback(song.title) }}
          />
        )}
        <blockquote className="relative max-w-xl font-serif text-xl font-light italic leading-relaxed text-white/78 md:text-2xl">
          {line ? `“${line}”` : "…"}
        </blockquote>
        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePlay}
            className={[
              "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition",
              isActive
                ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/10 text-white"
                : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/85",
            ].join(" ")}
          >
            {isActive ? "Playing" : "Play"}
          </button>
          <Link to={libraryRecordingPath(song)} className="truncate text-xs text-white/45 hover:text-white/75">
            {song.title} · {song.uploader.displayName}
          </Link>
        </div>
      </MuseumPanel>
    );
  }

  return (
    <MuseumPanel padding="roomy" className="bg-black/20">
      <blockquote className="font-serif text-lg font-light italic leading-relaxed text-white/72 md:text-xl">
        {line ? `“${line}”` : "…"}
      </blockquote>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          className={[
            "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
            isActive
              ? "border-[var(--color-brand)]/50 text-white"
              : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/80",
          ].join(" ")}
        >
          {isActive ? "Playing" : "Play"}
        </button>
        <Link to={libraryRecordingPath(song)} className="truncate text-xs text-white/45 hover:text-white/70">
          {song.title} · {song.uploader.displayName}
        </Link>
      </div>
    </MuseumPanel>
  );
}
