import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { SongVisualEditorModal } from "@/components/song-visual-editor";
import { fetchSongVisualAttachments } from "@/lib/visualMediaApi";
import { SubtitleEditorModal } from "./SubtitleEditorModal";
import { TrackEditActionMenu } from "./TrackEditActionMenu";
import { normalizeSubtitlePosition, normalizeSubtitleStyleId } from "@/lib/subtitleStylePresets";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { Link } from "react-router-dom";

import type { GenreOption } from "@/components/studio/studioCollectionUtils";
import { recordingGenreSlug } from "@/components/studio/studioCollectionUtils";
import { WaveformTrackRow } from "./WaveformTrackRow";
import { TrackRowPlayCount } from "./trackRowUi";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";

type TrackTag = { id: string; name: string; slug: string; kind: string };
type SubtitleSummary = { status: string; id: string; [key: string]: any } | any;

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
  activeWhenTrackMatches?: boolean;
  editMode?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  queueTrack?: any;
  subtitle?: SubtitleSummary | null;
  shareUrl?: string;
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
  activeWhenTrackMatches,
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
  const { isActive, trackMatches, trackIsPlaying } = useTrackPlayback(recordingId, playbackOrigin);
  const rowIsActive = isActive || Boolean(activeWhenTrackMatches && trackMatches);
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

  function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
    return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  function handlePlaybackIntent() {
    if (!onPlay) return;
    onPlay();
  }

  function handleRecordingLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!onPlay || editMode) return;
    if (!isPlainLeftClick(event)) return;

    event.preventDefault();
    event.stopPropagation();
    handlePlaybackIntent();
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

  const imageOverlay = editMode && onUpdateArtwork ? (
    <>
      {onPlay ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePlaybackIntent();
          }}
          className={`absolute left-1/2 top-1/2 z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 ${
            rowIsActive ? "text-[var(--color-brand)]" : ""
          }`}
          aria-label={trackIsPlaying ? "Pause track" : "Play track"}
          title={trackIsPlaying ? "Pause" : "Play"}
        >
          {trackIsPlaying ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} className="ml-px" fill="currentColor" />
          )}
        </button>
      ) : null}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); artworkInputRef.current?.click(); }}
        disabled={saving}
        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition hover:opacity-100 disabled:opacity-60"
        aria-label="Change track artwork"
        title="Change track artwork"
      >
        <ImagePlus size={16} className="text-white" />
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
  ) : undefined;

  const titleSlot = (
    <>
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
            onClick={handleRecordingLinkClick}
            className={`block truncate text-sm font-medium hover:underline ${
              rowIsActive ? "text-[var(--color-brand)]" : "text-white"
            }`}
          >
            {title}
          </Link>
        ) : (
          <p className={`truncate text-sm font-medium ${rowIsActive ? "text-[var(--color-brand)]" : "text-white"}`}>
            {title}
          </p>
        )
      )}
      {editMode && (saving || localError || error) ? (
        <p className={`truncate text-xs ${localError || error ? "text-red-300" : "text-amber-300"}`}>
          {localError ?? error ?? "Saving..."}
        </p>
      ) : null}
    </>
  );

  const rightSlot = (
    <>
      <TrackRowPlayCount count={playCount ?? 0} />

      {editMode ? (
        <TrackEditActionMenu
          title={title}
          subtitle={subtitle ?? queueTrack?.subtitle}
          visualAttachmentCount={visualAttachmentCount}
          genreOptions={genreOptions}
          genreSelectValue={genreSelectValue}
          playlistGenreSlug={playlistGenreSlug}
          genreLoading={genreLoading}
          saving={saving}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onChangeImage={onUpdateArtwork ? () => artworkInputRef.current?.click() : undefined}
          onEditSubtitles={() => setSubtitleModalOpen(true)}
          onEditVisuals={() => setVisualEditorOpen(true)}
          onGenreSelect={onUpdateTags ? handleGenreSelect : undefined}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      ) : showActions ? (
        <FavoriteHeartButton target="recording" id={recordingId} variant="inline" inlineAlwaysVisible />
      ) : null}
    </>
  );



  return (
    <>
      <WaveformTrackRow
        id={recordingId}
        audioUrl={audioUrl}
        isActive={rowIsActive}
        isPlaying={trackIsPlaying}
        onPlay={onPlay ? handlePlaybackIntent : undefined}
        imageUrl={artworkUrl}
        titleSlot={titleSlot}
        subtitleSlot={
          <>
            <div className="flex items-end gap-1.5 shrink-0 opacity-80">
              <PlaybackBars active={isActive} playing={trackIsPlaying} variant="row-compact" className="mb-[2px]" />
              <span className="tabular-nums leading-none">{formatDuration(durationSeconds)}</span>
            </div>
            {(creator ?? meta) ? (
              <>
                <span className="mx-1.5 opacity-50 wf-span">·</span>
                <span className="truncate">{creator ?? meta}</span>
              </>
            ) : null}
          </>
        }
        rightSlot={rightSlot}
        imageOverlay={imageOverlay}
        className={editMode ? "" : (onPlay ? "cursor-pointer" : "")}
      />

      {isSubtitleModalOpen && (
        <SubtitleEditorModal
          recordingId={recordingId}
          recordingTitle={title}
          initialSubtitlesDisabled={(subtitle ?? queueTrack?.subtitle)?.status === "DISABLED"}
          initialSubtitlePosition={normalizeSubtitlePosition(queueTrack?.subtitlePosition)}
          initialSubtitleStyleId={normalizeSubtitleStyleId(queueTrack?.subtitleStyleId)}
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
            ownerName: queueTrack?.ownerName ?? creator,
            ownerUsername: queueTrack?.ownerUsername,
            artworkUrl,
            description: queueTrack?.description,
            playlistTitle: queueTrack?.playlistTitle ?? playlistTitle,
            publishedPlaylistId: queueTrack?.publishedPlaylistId,
            recordingType: queueTrack?.recordingType,
            hasSubtitleTrack: subtitle != null,
            subtitlePosition: normalizeSubtitlePosition(queueTrack?.subtitlePosition),
            subtitleStyleId: normalizeSubtitleStyleId(queueTrack?.subtitleStyleId),
          }}
          onClose={() => setVisualEditorOpen(false)}
        />
      ) : null}
    </>
  );
}
