import { X } from "lucide-react";

import { formatDuration } from "@/lib/format";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";

function QueueItem({
  track,
  isActive,
  isPast,
  onPlay,
  onRemove,
}: {
  track: QueueTrack;
  isActive: boolean;
  isPast: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
        isActive
          ? "bg-white/10"
          : isPast
            ? "opacity-50"
            : "hover:bg-[var(--color-surface-hover)]"
      }`}
    >
      <button type="button" onClick={onPlay} className="min-w-0 flex-1 text-left">
        <p className={`truncate text-sm ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}>
          {track.title}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          {track.ownerName ?? track.playlistTitle ?? ""}
        </p>
      </button>
      <span className="text-xs text-[var(--color-text-subtle)]">
        {formatDuration(track.durationSeconds)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-[var(--color-text-subtle)] hover:text-white"
        aria-label="Remove from queue"
      >
        <X size={16} />
      </button>
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
    removeFromQueue,
    removeUpNextSegment,
  } = useAudioPlayer();

  if (!queueOpen) return null;

  const showThen = upNextPipeline.length > 0 || (autoplayEnabled && autoplayNextSegment);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-transparent"
        onClick={() => setQueueOpen(false)}
        aria-label="Close queue"
      />
      <aside className="fixed bottom-[var(--spacing-player)] right-0 top-[var(--spacing-topbar)] z-[70] flex w-full max-w-sm flex-col border-l border-[var(--color-border)] bg-[var(--color-canvas-alt)] shadow-xl">
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
                onPlay={() => {
                  if (track.id === currentTrack?.id) {
                    togglePlay();
                    return;
                  }
                  playTrack(track, queue);
                }}
                onRemove={() => removeFromQueue(track.id)}
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
    </>
  );
}
