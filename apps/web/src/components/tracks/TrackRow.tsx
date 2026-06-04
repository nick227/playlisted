import { ChevronDown, ChevronUp, ImagePlus, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { MediaCover } from "@/components/cards/MediaCover";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";
import { Link } from "react-router-dom";

import type { GenreOption } from "@/components/studio/studioCollectionUtils";
import { recordingGenreSlug } from "@/components/studio/studioCollectionUtils";

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
  genreOptions?: GenreOption[];
  playlistGenreSlug?: string | null;
  genreLoading?: boolean;
  saving?: boolean;
  error?: string;
  onPlay?: () => void;
  playbackOrigin?: string;
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
  genreOptions,
  playlistGenreSlug,
  genreLoading,
  saving,
  error,
  onPlay,
  playbackOrigin,
  editMode,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMoveUp,
  onMoveDown,
  queueTrack,
  shareUrl,
}: TrackRowProps) {
  const { isActive, isPlaying } = useTrackPlayback(recordingId, playbackOrigin);
  const showActions = !editMode && queueTrack && shareUrl;
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const [draftTitle, setDraftTitle] = useState(title);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  const overrideGenreSlug = recordingGenreSlug(tags);
  const genreSelectValue = overrideGenreSlug ?? "";

  function handleGenreSelect(nextSlug: string) {
    if (!onUpdateTags || nextSlug === genreSelectValue) return;
    onUpdateTags(nextSlug ? [nextSlug] : []);
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
      className={`group/card grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 transition ${
        isActive ? "bg-white/10" : "hover:bg-[var(--color-surface-hover)]"
      }${onPlay && !editMode ? " cursor-pointer" : ""}`}
      onClick={(e) => {
        if (!onPlay || editMode) return;
        if ((e.target as HTMLElement).closest("button, a, input, select")) return;
        onPlay();
      }}
    >
      <PlaybackBars active={isActive} playing={isPlaying} />
      <div className="flex min-w-0 items-center gap-2 text-left">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md">
          {editMode && onUpdateArtwork ? (
            <>
              <button
                type="button"
                onClick={() => artworkInputRef.current?.click()}
                disabled={saving}
                className="group/art relative block h-9 w-9 overflow-hidden rounded-md text-left disabled:opacity-60"
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
            <>
              <MediaCover title={title} imageUrl={artworkUrl} />
              {onPlay && (
                <button
                  type="button"
                  onClick={onPlay}
                  className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
                  }`}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause size={14} className="text-white" fill="currentColor" />
                  ) : (
                    <Play size={14} className="ml-px text-white" fill="currentColor" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
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
      <div className="flex shrink-0 items-center gap-1.5">
        {playCount != null && playCount > 0 && (
          <span className="hidden text-xs text-[var(--color-text-subtle)] sm:inline">
            {formatPlayCount(playCount)} plays
          </span>
        )}
        <span className="text-xs text-[var(--color-text-muted)]">{formatDuration(durationSeconds)}</span>
        {editMode ? (
          <>
            {onUpdateTags && genreOptions ? (
              <select
                value={genreSelectValue}
                onChange={(event) => handleGenreSelect(event.target.value)}
                disabled={saving || genreLoading}
                title={
                  genreSelectValue
                    ? "Custom genre for this track"
                    : playlistGenreSlug
                      ? `Uses playlist genre (${genreOptions.find((g) => g.slug === playlistGenreSlug)?.name ?? playlistGenreSlug})`
                      : "Uses playlist genre"
                }
                aria-label="Track genre"
                className="max-w-[6.5rem] truncate rounded border border-white/10 bg-black px-1.5 py-0.5 text-xs text-white outline-none focus:border-[var(--color-brand)] disabled:opacity-50"
              >
                <option value="">Default</option>
                {genreOptions.map((genre) => (
                  <option key={genre.id} value={genre.slug}>
                    {genre.name}
                  </option>
                ))}
              </select>
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
            <FavoriteHeartButton target="recording" id={recordingId} variant="inline" inlineAlwaysVisible />
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
