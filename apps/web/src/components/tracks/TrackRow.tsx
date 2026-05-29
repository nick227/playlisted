import { ChevronDown, ChevronUp, Pause, Play, X } from "lucide-react";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration } from "@/lib/format";
import { MediaCover } from "@/components/cards/MediaCover";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";

type TrackTag = { id: string; name: string; slug: string; kind: string };

interface TrackRowProps {
  recordingId: string;
  index?: number;
  title: string;
  creator?: string | null;
  meta?: string | null;
  durationSeconds?: number | null;
  artworkUrl?: string | null;
  tags?: TrackTag[];
  onUpdateTags?: (tagSlugs: string[]) => void;
  onPlay?: () => void;
  editMode?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  queueTrack?: QueueTrack;
  shareUrl?: string;
}

export function TrackRow({
  recordingId,
  index,
  title,
  creator,
  meta,
  durationSeconds,
  artworkUrl,
  tags,
  onUpdateTags,
  onPlay,
  editMode,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMoveUp,
  onMoveDown,
  queueTrack,
  shareUrl,
}: TrackRowProps) {
  const { isActive, isPlaying } = useTrackPlayback(editMode ? undefined : recordingId);
  const showActions = !editMode && queueTrack && shareUrl;

  function handleEditTags() {
    if (!onUpdateTags) return;
    const current = (tags ?? []).map((t) => t.slug).join(", ");
    const raw = window.prompt("Tag slugs (comma-separated)", current);
    if (raw === null) return;
    const tagSlugs = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onUpdateTags(tagSlugs);
  }

  return (
    <div
      id={`track-${recordingId}`}
      className={`group/card grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg px-3 py-2 transition ${
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
            <span className="text-sm text-[var(--color-text-subtle)] group-hover/card:hidden">
              {index != null ? index + 1 : ""}
            </span>
            <Play size={16} className="hidden text-white group-hover/card:block" fill="currentColor" />
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
            {onUpdateTags ? (
              <button
                type="button"
                onClick={handleEditTags}
                className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white"
                aria-label="Edit tags"
              >
                Tags
              </button>
            ) : null}
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
        ) : showActions ? (
          <RecordingActionMenu
            recordingId={recordingId}
            title={title}
            queueTrack={queueTrack}
            shareUrl={shareUrl}
          />
        ) : null}
      </div>
    </div>
  );
}
