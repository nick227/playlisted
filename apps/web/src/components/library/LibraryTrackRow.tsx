import { Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { LibrarySong } from "@playlisted/client-sdk";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { coverFallback } from "@/lib/routes";
import {
  libraryArtistPath,
  libraryGenrePath,
  libraryRecordingPath,
} from "@/lib/libraryPaths";
import { recordingShareUrl } from "@/lib/shareContent";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";

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
    username: song.uploader.username,
    slug: song.playlist.slug,
  });

  return (
    <div
      id={`track-${song.id}`}
      className={[
        "group/card flex items-center gap-3 rounded-lg px-3 py-2 transition",
        isActive ? "bg-white/10" : "hover:bg-[var(--color-surface-hover)]",
      ].join(" ")}
    >
      <PlaybackBars active={isActive} playing={isPlaying} />
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
        {song.artworkUrl ? (
          <img src={song.artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: coverFallback(song.title) }}
            aria-hidden
          />
        )}
        <button
          type="button"
          onClick={onPlay}
          className={[
            "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
            isActive ? "opacity-100" : "opacity-0 group-hover/card:opacity-100",
          ].join(" ")}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={14} className="text-white" fill="currentColor" />
          ) : (
            <Play size={14} className="ml-px text-white" fill="currentColor" />
          )}
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <Link
          to={libraryRecordingPath(song)}
          className={[
            "block truncate text-sm font-medium hover:underline",
            isActive ? "text-[var(--color-brand)]" : "text-white",
          ].join(" ")}
        >
          {song.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
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
        </p>
      </div>

      {song.playCount > 0 ? (
        <span className="hidden w-20 shrink-0 text-right text-xs text-[var(--color-text-subtle)] sm:inline">
          {formatPlayCount(song.playCount)} plays
        </span>
      ) : null}
      <span className="hidden w-16 shrink-0 text-right text-xs text-[var(--color-text-subtle)] md:inline">
        {formatPlayCount(song.favoriteCount)} favs
      </span>
      <span className="w-10 shrink-0 text-right text-xs text-[var(--color-text-muted)]">
        {formatDuration(song.durationSeconds)}
      </span>

      <FavoriteHeartButton target="recording" id={song.id} variant="inline" inlineAlwaysVisible />
      <RecordingActionMenu
        recordingId={song.id}
        title={song.title}
        queueTrack={queueTrack}
        shareUrl={shareUrl}
      />
    </div>
  );
}
