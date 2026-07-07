import type { LibrarySong } from "@playlisted/client-sdk";

import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { LibraryTrackRow } from "./LibraryTrackRow";

interface LibraryTrackListProps {
  songs: LibrarySong[];
  className?: string;
}

export function LibraryTrackList({ songs, className }: LibraryTrackListProps) {
  const { playTrack, currentTrack, isPlaying, togglePlay, ensurePlayback } = useAudioPlayer();

  function handlePlay(song: LibrarySong) {
    if (currentTrack?.id === song.id) {
      if (isPlaying) togglePlay();
      else ensurePlayback();
      return;
    }
    const queue = songs.map((item) => librarySongToQueueTrack(item));
    playTrack(librarySongToQueueTrack(song), queue, { sourceContext: "library" }, {
      segmentLabel: "Library",
    });
  }

  if (songs.length === 0) return null;

  return (
    <div className={className ?? "min-w-0"}>
      {songs.map((song) => (
        <LibraryTrackRow
          key={song.id}
          song={song}
          onPlay={() => handlePlay(song)}
        />
      ))}
    </div>
  );
}
