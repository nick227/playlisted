import type { LibrarySong } from "@playlisted/client-sdk";

import { MediaCover } from "@/components/cards/MediaCover";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

interface MuseumSongThumbProps {
  song: LibrarySong;
  queue: LibrarySong[];
  showMeta?: boolean;
}

export function MuseumSongThumb({ song, queue, showMeta = false }: MuseumSongThumbProps) {
  const { playTrack, currentTrack, isPlaying, togglePlay, ensurePlayback } = useAudioPlayer();
  const { isActive, isPlaying: playing } = useTrackPlayback(song.id);

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
      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
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
          <p className="mt-2 truncate text-xs font-medium text-white/80">{song.title}</p>
          <p className="truncate text-[10px] text-white/35">{song.uploader.displayName}</p>
        </>
      ) : null}
    </div>
  );
}
