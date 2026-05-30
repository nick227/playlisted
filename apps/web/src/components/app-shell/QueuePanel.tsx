import { Pause, Play, X } from "lucide-react";
import { Link } from "react-router-dom";

import { formatDuration } from "@/lib/format";
import { coverFallback, playlistIdPath, profilePath } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";

function QueueItem({
  track,
  isActive,
  isPast,
  isPlaying,
  onPlay,
}: {
  track: QueueTrack;
  isActive: boolean;
  isPast: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const artStyle = track.artworkUrl ? undefined : { background: coverFallback(track.title) };

  const songHref =
    track.ownerUsername && track.playlistSlug
      ? `/@/${encodeURIComponent(track.ownerUsername)}/${encodeURIComponent(track.playlistSlug)}#track-${track.id}`
      : `${playlistIdPath(track.publishedPlaylistId)}#track-${track.id}`;

  const artistHref = track.ownerUsername ? profilePath(track.ownerUsername) : null;
  const artistLabel = track.ownerName ?? track.playlistTitle ?? "";

  const showOverlay = isActive && isPlaying;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
        isActive ? "bg-white/10" : isPast ? "opacity-50" : "hover:bg-[var(--color-surface-hover)]"
      }`}
    >
      <button
        type="button"
        onClick={onPlay}
        className="group/avatar relative h-10 w-10 shrink-0 overflow-hidden rounded"
        aria-label={isActive && isPlaying ? "Pause" : "Play"}
      >
        {track.artworkUrl ? (
          <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={artStyle} />
        )}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
            showOverlay ? "opacity-100" : "opacity-0 group-hover/avatar:opacity-100"
          }`}
        >
          {isActive && isPlaying ? (
            <Pause size={14} fill="currentColor" className="text-white" />
          ) : (
            <Play size={14} fill="currentColor" className="ml-0.5 text-white" />
          )}
        </div>
      </button>

      <div className="min-w-0 flex-1">
        <Link
          to={songHref}
          className={`block truncate text-sm hover:underline ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}
        >
          {track.title}
        </Link>
        {artistHref ? (
          <Link
            to={artistHref}
            className="block truncate text-xs text-[var(--color-text-muted)] hover:underline"
          >
            {artistLabel}
          </Link>
        ) : (
          <p className="truncate text-xs text-[var(--color-text-muted)]">{artistLabel}</p>
        )}
      </div>

      <span className="shrink-0 text-xs text-[var(--color-text-subtle)]">
        {formatDuration(track.durationSeconds)}
      </span>
    </div>
  );
}

function PipelineItem({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[var(--color-text-muted)]">
      <p className="truncate text-sm">{label}</p>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-[var(--color-text-subtle)] hover:text-white"
        aria-label="Remove from up next"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function QueuePanel() {
  const {
    queue,
    currentTrack,
    isPlaying,
    queueIndex,
    upNextPipeline,
    segmentLabel,
    autoplayNextSegment,
    autoplayEnabled,
    setAutoplayEnabled,
    queueOpen,
    setQueueOpen,
    playTrack,
    togglePlay,
    skipToUpNext,
    removeUpNextSegment,
  } = useAudioPlayer();

  if (!queueOpen) return null;

  const showThen = upNextPipeline.length > 0 || (autoplayEnabled && autoplayNextSegment);

  return (
    <aside className="fixed bottom-[var(--spacing-player-safe-mobile)] right-0 top-[var(--spacing-topbar)] z-[70] flex w-full max-w-sm flex-col border-l border-[var(--color-border)] bg-[var(--color-canvas-alt)] shadow-xl md:bottom-[var(--spacing-player)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <h2 className="font-semibold text-white">Playing</h2>
          {segmentLabel ? (
            <p className="truncate text-xs text-[var(--color-text-muted)]">Now · {segmentLabel}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setQueueOpen(false)}
          className="rounded p-1 text-[var(--color-text-muted)] hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {queue.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">
            Nothing queued
          </p>
        ) : (
          queue.map((track, index) => (
            <QueueItem
              key={`${track.id}-${index}`}
              track={track}
              isActive={track.id === currentTrack?.id}
              isPast={index < queueIndex}
              isPlaying={isPlaying && track.id === currentTrack?.id}
              onPlay={() => {
                if (track.id === currentTrack?.id) {
                  togglePlay();
                  return;
                }
                playTrack(track, queue);
              }}
            />
          ))
        )}

        {showThen ? (
          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
              Up next
            </p>
            {upNextPipeline.map((segment) => (
              <PipelineItem
                key={segment.id}
                label={segment.label}
                onRemove={() => removeUpNextSegment(segment.id)}
              />
            ))}
            {autoplayEnabled && autoplayNextSegment ? (
              <button
                type="button"
                onClick={skipToUpNext}
                className="block w-full truncate px-3 py-2 text-left text-sm text-[var(--color-text-subtle)] hover:text-white hover:underline"
              >
                {autoplayNextSegment.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[var(--color-text-muted)]">
          <span>Keep playing after this playlist</span>
          <input
            type="checkbox"
            checked={autoplayEnabled}
            onChange={(e) => setAutoplayEnabled(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
        </label>
      </div>
    </aside>
  );
}
