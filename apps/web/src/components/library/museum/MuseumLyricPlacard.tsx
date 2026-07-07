import type { LibrarySong } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { libraryRecordingPath } from "@/lib/libraryPaths";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { useLyricSnippet } from "./useLyricSnippet";
import { MuseumArtBackdrop, MuseumPanel } from "./museumUi";

interface MuseumLyricPlacardProps {
  song: LibrarySong;
}

export function MuseumLyricPlacard({ song }: MuseumLyricPlacardProps) {
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

  return (
    <article className="relative overflow-hidden rounded-[1.35rem]">
      <MuseumArtBackdrop imageUrl={song.artworkUrl} title={song.title} intensity="medium" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/88 to-[var(--color-canvas)]/80" />

      <div className="relative grid gap-0 md:grid-cols-[minmax(0,13rem)_1fr]">
        <div className="relative hidden min-h-full md:block">
          {song.artworkUrl ? (
            <img src={song.artworkUrl} alt="" className="h-full min-h-[18rem] w-full object-cover" />
          ) : (
            <div className="min-h-[18rem] w-full" style={{ background: coverFallback(song.title) }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--color-canvas)]/90" />
        </div>

        <MuseumPanel padding="roomy" className="rounded-none border-0 bg-transparent shadow-none md:min-h-[18rem]">
          <blockquote className="max-w-2xl font-serif text-[clamp(1.45rem,3.4vw,2.5rem)] font-light italic leading-[1.15] tracking-tight text-white/82">
            {line ? `“${line}”` : "…"}
          </blockquote>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handlePlay}
              className={[
                "rounded-full border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition",
                isActive
                  ? "border-[var(--color-brand)]/55 bg-[var(--color-brand)]/15 text-white shadow-[0_0_24px_rgba(124,77,255,0.22)]"
                  : "border-white/15 text-white/55 hover:border-white/35 hover:text-white/90",
              ].join(" ")}
            >
              {isActive ? "Playing" : "Listen"}
            </button>
            <Link
              to={libraryRecordingPath(song)}
              className="text-sm text-white/45 transition hover:text-white/80"
            >
              {song.title}
              <span className="text-white/25"> · </span>
              {song.uploader.displayName}
            </Link>
          </div>
        </MuseumPanel>
      </div>
    </article>
  );
}
