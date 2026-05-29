import { ChevronDown, ChevronUp, ImagePlus, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { MediaCover } from "@/components/cards/MediaCover";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";
import { Link } from "react-router-dom";

type TrackTag = { id: string; name: string; slug: string; kind: string };

interface TrackRowProps {
  recordingId: string;
  index?: number;
  title: string;
  creator?: string | null;
  meta?: string | null;
  playCount?: number | null;
  durationSeconds?: number | null;
  artworkUrl?: string | null;
  recordingHref?: string;
  playlistHref?: string;
  playlistTitle?: string;
  tags?: TrackTag[];
  onUpdateTitle?: (title: string) => void;
  onUpdateArtwork?: (file: File) => void;
  onUpdateTags?: (tagSlugs: string[]) => void;
  saving?: boolean;
  error?: string;
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
  playCount,
  durationSeconds,
  artworkUrl,
  recordingHref,
  playlistHref,
  playlistTitle,
  tags,
  onUpdateTitle,
  onUpdateArtwork,
  onUpdateTags,
  saving,
  error,
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
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const [draftTitle, setDraftTitle] = useState(title);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

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

  function saveTitleDraft() {
    if (!onUpdateTitle) return;

    const nextTitle = draftTitle.trim();
    if (nextTitle === title) return;

    if (!nextTitle) {
      setDraftTitle(title);
      setLocalError("Title cannot be blank.");
      return;
    }

    setLocalError(null);
    onUpdateTitle(nextTitle);
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
      <div className="flex min-w-0 items-center gap-3 text-left">
        <div className="h-10 w-10 shrink-0">
          {editMode && onUpdateArtwork ? (
            <>
              <button
                type="button"
                onClick={() => artworkInputRef.current?.click()}
                disabled={saving}
                className="group/art relative block h-10 w-10 overflow-hidden rounded-lg text-left disabled:opacity-60"
                aria-label="Change track artwork"
                title="Change track artwork"
              >
                <MediaCover title={title} imageUrl={artworkUrl} />
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover/art:opacity-100">
                  <ImagePlus size={16} className="text-white" />
                </span>
              </button>
              <input
                ref={artworkInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpdateArtwork(file);
                  event.currentTarget.value = "";
                }}
              />
            </>
          ) : (
            <MediaCover title={title} imageUrl={artworkUrl} />
          )}
        </div>
        <div className="min-w-0">
          {editMode && onUpdateTitle ? (
            <input
              value={draftTitle}
              onChange={(event) => {
                setDraftTitle(event.target.value);
                setLocalError(null);
              }}
              onBlur={saveTitleDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setDraftTitle(title);
                  setLocalError(null);
                  event.currentTarget.blur();
                }
              }}
              disabled={saving}
              className="w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-white outline-none hover:border-white/10 focus:border-[var(--color-brand)] focus:bg-black/20 disabled:opacity-70"
            />
          ) : (
            recordingHref ? (
              <Link
                to={recordingHref}
                className={`block truncate text-sm font-medium hover:underline ${
                  isActive ? "text-[var(--color-brand)]" : "text-white"
                }`}
              >
                {title}
              </Link>
            ) : (
              <button type="button" onClick={onPlay} className="block min-w-0 text-left">
                <p className={`truncate text-sm font-medium ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}>
                  {title}
                </p>
              </button>
            )
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs text-[var(--color-text-muted)]">
            {creator ? <span className="truncate">{creator}</span> : null}
            {creator && (playlistTitle || meta) ? <span aria-hidden>•</span> : null}
            {playlistHref && playlistTitle ? (
              <Link to={playlistHref} className="min-w-0 truncate hover:text-white hover:underline">
                {playlistTitle}
              </Link>
            ) : playlistTitle ? (
              <span className="truncate">{playlistTitle}</span>
            ) : null}
            {(creator || playlistTitle) && meta ? <span aria-hidden>•</span> : null}
            {meta ? <span className="truncate">{meta}</span> : null}
          </div>
          {editMode && (saving || localError || error) ? (
            <p className={`truncate text-xs ${localError || error ? "text-red-300" : "text-amber-300"}`}>
              {localError ?? error ?? "Saving..."}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {playCount != null && playCount > 0 && (
          <span className="hidden text-xs text-[var(--color-text-subtle)] sm:inline">
            {formatPlayCount(playCount)} plays
          </span>
        )}
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
          <>
            <FavoriteHeartButton target="recording" id={recordingId} variant="inline" />
            <RecordingActionMenu
              recordingId={recordingId}
              title={title}
              queueTrack={queueTrack}
              shareUrl={shareUrl}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
