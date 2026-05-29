import { X } from "lucide-react";

import { formatDuration } from "@/lib/format";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";

function QueueItem({
  track,
  isActive,
  onPlay,
  onRemove,
}: {
  track: QueueTrack;
  isActive: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? "bg-white/10" : "hover:bg-[var(--color-surface-hover)]"}`}
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

export function QueuePanel() {
  const { queue, currentTrack, queueOpen, setQueueOpen, playTrack, removeFromQueue } =
    useAudioPlayer();

  if (!queueOpen) return null;

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
          <h2 className="font-semibold text-white">Up next</h2>
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
              Queue is empty
            </p>
          ) : (
            queue.map((track) => (
              <QueueItem
                key={track.id}
                track={track}
                isActive={track.id === currentTrack?.id}
                onPlay={() => playTrack(track, queue)}
                onRemove={() => removeFromQueue(track.id)}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}
