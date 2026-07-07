import { Link } from "react-router-dom";
import type { LibrarySong } from "@playlisted/client-sdk";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration, formatPlayCount } from "@/lib/format";
import {
  libraryArtistPath,
  libraryGenrePath,
  libraryRecordingPath,
} from "@/lib/libraryPaths";
import { recordingShareUrl } from "@/lib/shareContent";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";
import { WaveformTrackRow } from "@/components/tracks/WaveformTrackRow";

interface LibraryTrackRowProps {
  song: LibrarySong;
  onPlay: () => void;
  queueTrack: QueueTrack;
}

export function LibraryTrackRow({ song, onPlay, queueTrack }: LibraryTrackRowProps) {
  const { isActive, isPlaying } = useTrackPlayback(song.id);
  const shareUrl = recordingShareUrl({
    playlistId: song.playlist.id,
    recordingId: song.id,
    title: song.title,
    username: song.uploader.username,
    slug: song.playlist.slug,
  });

  const titleSlot = (
    <Link
      to={libraryRecordingPath(song)}
      className={[
        "block truncate text-sm font-medium hover:underline",
        isActive ? "text-[var(--color-brand)]" : "text-white",
      ].join(" ")}
    >
      {song.title}
    </Link>
  );

  const subtitleSlot = (
    <>
      <span className="tabular-nums text-[var(--color-text-muted)]">{formatDuration(song.durationSeconds)}</span>
      <span className="mx-1.5 opacity-50">·</span>
      <Link
        to={libraryArtistPath(song)}
        className="hover:text-white hover:underline"
      >
        {song.uploader.displayName}
      </Link>
      {song.genres.length > 0 ? (
        <>
          <span className="mx-1.5 text-white/20">·</span>
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
      {song.playCount > 0 ? (
        <span className="hidden w-16 shrink-0 text-right text-xs text-[var(--color-text-subtle)] sm:inline">
          {formatPlayCount(song.playCount)} plays
        </span>
      ) : null}
      <span className="hidden w-12 shrink-0 text-right text-xs text-[var(--color-text-subtle)] md:inline mr-2">
        {formatPlayCount(song.favoriteCount)} favs
      </span>

      <RecordingActionMenu
        recordingId={song.id}
        title={song.title}
        queueTrack={queueTrack}
        shareUrl={shareUrl}
        transcriptAvailable={song.subtitle?.status === "READY"}
      />
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
