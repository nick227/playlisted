import type { LibrarySong } from "@playlisted/client-sdk";
import { Pause, Play } from "lucide-react";
import { useEffect } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration, formatPlayCount, formatProfileDate } from "@/lib/format";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback } from "@/lib/routes";
import { recordingShareUrl } from "@/lib/shareContent";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

type ArtistProfileTracksProps = {
  tracks: LibrarySong[];
  artistName: string;
  scrollToId?: string | null;
  onScrolled?: () => void;
};

export function ArtistProfileTracks({
  tracks,
  artistName,
  scrollToId,
  onScrolled,
}: ArtistProfileTracksProps) {
  const { playTrack, togglePlay, currentTrack } = useAudioPlayer();

  function handlePlay(song: LibrarySong) {
    if (currentTrack?.id === song.id) {
      togglePlay();
      return;
    }
    const queue = tracks.map((item) => librarySongToQueueTrack(item, item.playlist.title));
    const index = tracks.findIndex((item) => item.id === song.id);
    if (index < 0) return;

    playTrack(librarySongToQueueTrack(song, song.playlist.title), queue.slice(index), {
      sourceContext: "artist-profile",
      playlistId: song.playlist.id,
      playlistOwnerUsername: song.uploader.username,
      playlistSlug: song.playlist.slug,
    });
  }

  if (tracks.length === 0) return null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">All tracks</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {tracks.length} recording{tracks.length !== 1 ? "s" : ""} · stream without leaving the profile
        </p>
      </div>

      <div className="divide-y divide-white/6 overflow-hidden rounded-2xl border border-white/6 bg-[var(--color-surface)]/60">
        {tracks.map((song, index) => (
          <ArtistProfileTrackRow
            key={song.id}
            song={song}
            index={index}
            artistName={artistName}
            onPlay={() => handlePlay(song)}
            highlight={scrollToId === song.id}
            onHighlightSeen={onScrolled}
          />
        ))}
      </div>
    </section>
  );
}

function ArtistProfileTrackRow({
  song,
  index,
  artistName,
  onPlay,
  highlight,
  onHighlightSeen,
}: {
  song: LibrarySong;
  index: number;
  artistName: string;
  onPlay: () => void;
  highlight?: boolean;
  onHighlightSeen?: () => void;
}) {
  const { isActive, isPlaying } = useTrackPlayback(song.id);
  const queueTrack = librarySongToQueueTrack(song, song.playlist.title);
  const shareUrl = recordingShareUrl({
    playlistId: song.playlist.id,
    recordingId: song.id,
    username: song.uploader.username,
    slug: song.playlist.slug,
  });

  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`track-${song.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    onHighlightSeen?.();
  }, [highlight, onHighlightSeen, song.id]);

  return (
    <div
      id={`track-${song.id}`}
      className={[
        "group/card grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 transition md:px-6",
        isActive || highlight ? "bg-white/8" : "hover:bg-white/4",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onPlay}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 transition group-hover/card:bg-[var(--color-brand)]/20"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause size={18} className="text-white" fill="currentColor" />
        ) : (
          <>
            <span className="text-sm font-bold text-white/40 group-hover/card:hidden">{index + 1}</span>
            <Play size={18} className="hidden text-white group-hover/card:block" fill="currentColor" />
          </>
        )}
      </button>

      <button type="button" onClick={onPlay} className="flex min-w-0 items-center gap-4 text-left">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          {song.artworkUrl ? (
            <img src={song.artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: coverFallback(song.title) }} />
          )}
        </div>
        <div className="min-w-0">
          <p className={`truncate text-base font-semibold ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}>
            {song.title}
          </p>
          <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">
            {artistName} · {song.playlist.title} · {formatProfileDate(song.createdAt)}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-3">
        {song.playCount > 0 ? (
          <span className="hidden text-xs text-[var(--color-text-subtle)] md:inline">
            {formatPlayCount(song.playCount)} streams
          </span>
        ) : null}
        <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
          {formatDuration(song.durationSeconds)}
        </span>
        <FavoriteHeartButton target="recording" id={song.id} variant="inline" />
        <RecordingActionMenu recordingId={song.id} title={song.title} queueTrack={queueTrack} shareUrl={shareUrl} />
      </div>
    </div>
  );
}
