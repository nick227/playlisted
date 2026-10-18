import type { LibrarySong } from "@playlisted/client-sdk";

import { MediaCover } from "@/components/cards/MediaCover";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

interface MuseumSongThumbProps {
  song: LibrarySong;
  queue: LibrarySong[];
  showMeta?: boolean;
  variant?: "square" | "cinematic";
}

export function MuseumSongThumb({
  song,
  queue,
  showMeta = false,
  variant = "square",
}: MuseumSongThumbProps) {
  const { playTrack, currentTrack, isPlaying, togglePlay, ensurePlayback } =
    useAudioPlayer();
  const { isActive, isPlaying: playing } = useTrackPlayback(song.id);
  const aspectClass =
    variant === "cinematic" ? "aspect-video" : "aspect-square";

  function handlePlay() {
    if (currentTrack?.id === song.id) {
      if (isPlaying) togglePlay();
      else ensurePlayback();
      return;
    }
    playTrack(
      librarySongToQueueTrack(song),
      queue.map((item) => librarySongToQueueTrack(item)),
      { sourceContext: "library" },
      { segmentLabel: "Library" },
    );
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div
        className={`relative w-full overflow-hidden rounded-lg ${aspectClass}`}
      >
        <MediaCover
          title={song.title}
          imageUrl={song.artworkUrl}
          aspectClass="h-full w-full"
          onPlay={handlePlay}
          isActive={isActive}
          isPlaying={playing}
          showPlaybackBars
        />
      </div>
      {showMeta ? (
        <>
          <p className="mt-2.5 truncate text-sm font-medium leading-5 text-white/90">
            {song.title}
          </p>
          <p className="mt-0.5 truncate text-xs leading-4 text-white/50">
            {song.uploader.displayName}
          </p>
        </>
      ) : null}
    </div>
  );
}
