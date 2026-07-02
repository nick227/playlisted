import { useQuery } from "@tanstack/react-query";
import { Captions, ChevronDown, ChevronUp, CircleSlash, ImagePlus, Loader2, Pause, Play, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { SongVisualEditorModal, SongVisualStatusBadge } from "@/components/song-visual-editor";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { fetchSongVisualAttachments } from "@/lib/visualMediaApi";
import { SubtitleEditorModal } from "./SubtitleEditorModal";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { MediaCover } from "@/components/cards/MediaCover";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Link } from "react-router-dom";

import type { GenreOption } from "@/components/studio/studioCollectionUtils";
import { recordingGenreSlug } from "@/components/studio/studioCollectionUtils";

type TrackTag = { id: string; name: string; slug: string; kind: string };
type SubtitleSummary = QueueTrack["subtitle"];

interface TrackRowProps {
  recordingId: string;
  index?: number;
  title: string;
  creator?: string | null;
  meta?: string | null;
  playCount?: number | null;
  durationSeconds?: number | null;
  audioUrl?: string | null;
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
  subtitle?: SubtitleSummary | null;
  shareUrl?: string;
}

function SubtitleStatusBadge({ subtitle }: { subtitle?: SubtitleSummary | null }) {
  const status = subtitle?.status ?? "NOT_SET";
  const baseClass =
    "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded border px-1.5 text-[10px] font-semibold uppercase leading-none";

  if (status === "READY") {
    return (
      <span className={`${baseClass} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`} title="Transcript ready">
        <Captions size={13} />
        <span className="ml-1 hidden sm:inline">CC</span>
      </span>
    );
  }

  if (status === "QUEUED" || status === "PROCESSING") {
    return (
      <span className={`${baseClass} border-amber-300/30 bg-amber-300/10 text-amber-200`} title="Transcript processing">
        <Loader2 size={13} className="animate-spin" />
        <span className="ml-1 hidden sm:inline">CC</span>
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className={`${baseClass} border-red-400/30 bg-red-400/10 text-red-200`} title="Transcript failed">
        <TriangleAlert size={13} />
        <span className="ml-1 hidden sm:inline">CC</span>
      </span>
    );
  }

  return (
    <span className={`${baseClass} border-white/10 bg-white/[0.03] text-[var(--color-text-subtle)]`} title="Transcript not set">
      <CircleSlash size={13} />
      <span className="ml-1 hidden sm:inline">CC</span>
    </span>
  );
}

export function TrackRow({
  recordingId,
  title,
  creator,
  meta,
  playCount,
  durationSeconds,
  audioUrl,
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
  subtitle,
  shareUrl,
}: TrackRowProps) {
  const { accessToken } = useAuth();
  const { isActive, isPlaying } = useTrackPlayback(recordingId, playbackOrigin);
  const showActions = !editMode && queueTrack && shareUrl;
  const [isSubtitleModalOpen, setSubtitleModalOpen] = useState(false);
  const [isVisualEditorOpen, setVisualEditorOpen] = useState(false);

  const visualAttachmentsQuery = useQuery({
    queryKey: ["song-visual-media", recordingId],
    queryFn: () => fetchSongVisualAttachments(recordingId, accessToken),
    enabled: editMode && Boolean(accessToken),
    staleTime: 30_000,
  });
  const visualAttachmentCount =
    visualAttachmentsQuery.data?.attachments.filter((attachment) => attachment.enabled).length ?? 0;
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
      className={`group/card grid w-full ${
        editMode && onPlay ? "grid-cols-[auto_auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)_auto]"
      } items-center gap-2 rounded-lg px-2 py-1.5 transition ${
        isActive ? "bg-[var(--color-surface)]/80" : "hover:bg-[var(--color-surface-hover)]"
      }${onPlay && !editMode ? " cursor-pointer" : ""}`}
      onClick={(e) => {
        if (!onPlay || editMode) return;
        if ((e.target as HTMLElement).closest("button, a, input, select")) return;
        onPlay();
      }}
    >
      <PlaybackBars active={isActive} playing={isPlaying} />
      {editMode && onPlay ? (
        <button
          type="button"
          onClick={onPlay}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition ${
            isActive
              ? "bg-transparent text-white"
              : "text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white"
          }`}
          aria-label={isPlaying ? "Pause track" : "Play track"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} className="ml-px" fill="currentColor" />
          )}
        </button>
      ) : null}
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
        {editMode ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSubtitleModalOpen(true);
              }}
              className="rounded focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-transform hover:scale-105"
              title="Edit Subtitles"
            >
              <SubtitleStatusBadge subtitle={subtitle ?? queueTrack?.subtitle} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setVisualEditorOpen(true);
              }}
              className="rounded focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-transform hover:scale-105"
              title="Edit Visuals"
            >
              <SongVisualStatusBadge attachmentCount={visualAttachmentCount} />
            </button>
          </>
        ) : null}
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

      {isSubtitleModalOpen && (
        <SubtitleEditorModal
          recordingId={recordingId}
          recordingTitle={title}
          onClose={() => setSubtitleModalOpen(false)}
        />
      )}
      {isVisualEditorOpen && accessToken ? (
        <SongVisualEditorModal
          recording={{
            id: recordingId,
            title,
            audioUrl,
            durationSeconds,
            artworkUrl,
          }}
          onClose={() => setVisualEditorOpen(false)}
        />
      ) : null}
    </div>
  );
}
