import type { LibrarySong } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { libraryRecordingPath } from "@/lib/libraryPaths";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { useLyricSnippet } from "./useLyricSnippet";
import {
  MUSEUM_COL_LEFT,
  MUSEUM_COL_RIGHT,
  MUSEUM_EXHIBIT_RADIUS,
  MUSEUM_GRID,
  MuseumArtBackdrop,
  MuseumExhibitFrame,
  MuseumPanel,
  MuseumSectionHeader,
} from "./museumUi";

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
    <article className={`relative min-w-0 overflow-hidden ${MUSEUM_EXHIBIT_RADIUS}`}>
      <MuseumArtBackdrop imageUrl={song.artworkUrl} title={song.title} intensity="medium" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/88 to-[var(--color-canvas)]/80" />

      <MuseumExhibitFrame className="relative">
        <div className={MUSEUM_GRID}>
          <div className={`${MUSEUM_COL_LEFT} hidden md:block`}>
            <MuseumSectionHeader label="Recording" />
          </div>
          <div className={MUSEUM_COL_RIGHT}>
            <MuseumSectionHeader label="Lyrics" />
          </div>

          <div className={`${MUSEUM_COL_LEFT} hidden md:block`}>
            <div className="relative min-h-[16rem] overflow-hidden rounded-2xl border border-white/[0.08]">
              {song.artworkUrl ? (
                <img src={song.artworkUrl} alt="" className="h-full min-h-[16rem] w-full object-cover" />
              ) : (
                <div className="min-h-[16rem] w-full" style={{ background: coverFallback(song.title) }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            </div>
          </div>

          <div className={MUSEUM_COL_RIGHT}>
            {song.artworkUrl ? (
              <div className="mb-4 overflow-hidden rounded-xl border border-white/[0.08] md:hidden">
                <img src={song.artworkUrl} alt="" className="aspect-[16/10] w-full object-cover" />
              </div>
            ) : null}

            <MuseumPanel padding="roomy" className="border-0 bg-black/15 shadow-none">
              <blockquote className="max-w-2xl font-serif text-[clamp(1.35rem,3.2vw,2.35rem)] font-light italic leading-[1.15] tracking-tight text-white/82">
                {line ? `“${line}”` : "…"}
              </blockquote>

              <div className="mt-6 flex flex-wrap items-center gap-4">
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
                  className="min-w-0 text-sm text-white/45 transition hover:text-white/80"
                >
                  <span className="block truncate">{song.title}</span>
                  <span className="block truncate text-white/30">{song.uploader.displayName}</span>
                </Link>
              </div>
            </MuseumPanel>
          </div>
        </div>
      </MuseumExhibitFrame>
    </article>
  );
}
