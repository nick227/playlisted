import type { LibrarySong } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { libraryRecordingPath } from "@/lib/libraryPaths";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { useLyricSnippet } from "./useLyricSnippet";
import { MuseumBankSection, MuseumPanel } from "./museumUi";

interface MuseumLyricPlacardProps {
  song: LibrarySong;
}

export function MuseumLyricPlacard({ song }: MuseumLyricPlacardProps) {
  const hasReadySubtitle = song.subtitle?.status === "READY";
  const fallback = song.description ?? song.title;
  const line = useLyricSnippet(song.id, hasReadySubtitle, fallback);
  const { playTrack, currentTrack, isPlaying, togglePlay, ensurePlayback } =
    useAudioPlayer();
  const { isActive } = useTrackPlayback(song.id);

  function handlePlay() {
    if (currentTrack?.id === song.id) {
      if (isPlaying) togglePlay();
      else ensurePlayback();
      return;
    }
    playTrack(
      librarySongToQueueTrack(song),
      [librarySongToQueueTrack(song)],
      { sourceContext: "library" },
      {
        segmentLabel: "Library",
      },
    );
  }

  return (
    <MuseumBankSection
      label="Quote"
      href={libraryRecordingPath(song)}
      hrefLabel="Open"
      type="special"
    >
      <MuseumPanel padding="roomy" className="bg-white/[0.045]">
        <blockquote className="w-full text-[clamp(1.35rem,3vw,2.35rem)] font-semibold leading-tight text-white/88">
          {line ? `"${line}"` : "..."}
        </blockquote>

        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePlay}
            className={[
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
              isActive
                ? "border-[var(--color-brand)]/55 bg-[var(--color-brand)]/18 text-white"
                : "border-white/15 text-white/65 hover:border-white/35 hover:text-white",
            ].join(" ")}
          >
            {isActive ? "Playing" : "Listen"}
          </button>
          <Link
            to={libraryRecordingPath(song)}
            className="min-w-0 text-sm text-white/50 transition hover:text-white/80"
          >
            <span className="block truncate">{song.title}</span>
            <span className="block truncate text-white/35">
              {song.uploader.displayName}
            </span>
          </Link>
        </div>
      </MuseumPanel>
    </MuseumBankSection>
  );
}
