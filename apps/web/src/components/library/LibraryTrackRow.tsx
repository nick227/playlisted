import { Link } from "react-router-dom";
import type { LibrarySong } from "@playlisted/client-sdk";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration, formatPlayCount } from "@/lib/format";
import {
  libraryArtistPath,
  libraryGenrePath,
  libraryRecordingPath,
} from "@/lib/libraryPaths";
import { WaveformTrackRow } from "@/components/tracks/WaveformTrackRow";
import { TrackRowMetaStat, TrackRowPlayCount, trackTitleClassName } from "@/components/tracks/trackRowUi";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";

interface LibraryTrackRowProps {
  song: LibrarySong;
  onPlay: () => void;
}

export function LibraryTrackRow({ song, onPlay }: LibraryTrackRowProps) {
  const { isActive, isPlaying } = useTrackPlayback(song.id);

  const titleSlot = (
    <Link to={libraryRecordingPath(song)} className={trackTitleClassName(isActive)}>
      {song.title}
    </Link>
  );

  const subtitleSlot = (
    <>
      <div className="flex items-end gap-1.5 shrink-0 opacity-80">
        <PlaybackBars active={isActive} playing={isPlaying} variant="row-compact" className="mb-[2px]" />
        <span className="tabular-nums leading-none">{formatDuration(song.durationSeconds)}</span>
      </div>
      <span className="mx-1.5 opacity-50">·</span>
      <Link
        to={libraryArtistPath(song)}
        className="truncate hover:text-white hover:underline"
      >
        {song.uploader.displayName}
      </Link>
      {song.genres.length > 0 ? (
        <>
          <span className="opacity-50">·</span>
          {song.genres.map((genre, index) => (
            <span key={genre.slug}>
              {index > 0 ? <span className="text-white/20">, </span> : null}
              <Link
                to={libraryGenrePath(genre.slug)}
                className="hover:text-white hover:underline"
              >
                {genre.name}
              </Link>
            </span>
          ))}
        </>
      ) : null}
    </>
  );

  const rightSlot = (
    <>
      <TrackRowPlayCount count={song.playCount} />
      <TrackRowMetaStat>{formatPlayCount(song.favoriteCount)} favs</TrackRowMetaStat>

      <FavoriteHeartButton target="recording" id={song.id} variant="inline" inlineAlwaysVisible />
    </>
  );

  return (
    <WaveformTrackRow
      id={song.id}
      audioUrl={song.audioUrl}
      isActive={isActive}
      isPlaying={isPlaying}
      onPlay={onPlay}
      imageUrl={song.artworkUrl}
      titleSlot={titleSlot}
      subtitleSlot={subtitleSlot}
      rightSlot={rightSlot}
    />
  );
}
