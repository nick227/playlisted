import { ChevronDown, ChevronUp, MoreHorizontal, Pause, Play, Plus, X } from "lucide-react";
import { useState } from "react";

import { formatDuration } from "@/lib/format";
import { MediaCover } from "@/components/cards/MediaCover";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { useAuth } from "@/providers/AuthProvider";

interface TrackRowProps {
  recordingId: string;
  index?: number;
  title: string;
  creator?: string | null;
  meta?: string | null;
  durationSeconds?: number | null;
  artworkUrl?: string | null;
  isActive?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  editMode?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function TrackRow({
  recordingId,
  index,
  title,
  creator,
  meta,
  durationSeconds,
  artworkUrl,
  isActive,
  isPlaying,
  onPlay,
  editMode,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TrackRowProps) {
  const { status } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div
        id={`track-${recordingId}`}
        className={`group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg px-3 py-2 transition ${
          isActive ? "bg-white/10" : "hover:bg-[var(--color-surface-hover)]"
        }`}
      >
      <button
        type="button"
        onClick={onPlay}
        className="flex w-10 items-center justify-center"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause size={16} className="text-white" fill="currentColor" />
        ) : (
          <>
            <span className="text-sm text-[var(--color-text-subtle)] group-hover:hidden">
              {index != null ? index + 1 : ""}
            </span>
            <Play size={16} className="hidden text-white group-hover:block" fill="currentColor" />
          </>
        )}
      </button>
      <button type="button" onClick={onPlay} className="flex min-w-0 items-center gap-3 text-left">
        <div className="h-10 w-10 shrink-0">
          <MediaCover title={title} imageUrl={artworkUrl} />
        </div>
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}>
            {title}
          </p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            {[creator, meta].filter(Boolean).join(" • ")}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">{formatDuration(durationSeconds)}</span>
        {editMode ? (
          <>
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              className="rounded p-1 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Move up"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              className="rounded p-1 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Move down"
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-1 text-red-400 hover:bg-red-500/20"
              aria-label="Remove track"
            >
              <X size={16} />
            </button>
          </>
        ) : status === "authenticated" ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded p-1 text-[var(--color-text-muted)] opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
            aria-label="Add to playlist"
          >
            <Plus size={16} />
          </button>
        ) : (
          <MoreHorizontal size={18} className="text-[var(--color-text-subtle)] opacity-0 group-hover:opacity-100" />
        )}
      </div>
    </div>

      <AddToPlaylistDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        recordingIds={[recordingId]}
        title={title}
      />
    </>
  );
}
