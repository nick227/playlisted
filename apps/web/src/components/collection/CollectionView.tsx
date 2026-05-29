import type { PlaylistDetail } from "@playlisted/client-sdk";
import { Pause, Pencil, Play, Plus, Share2, Shuffle, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { TrackList } from "@/components/tracks/TrackList";
import { coverFallback, profilePath, studioCollectionEditPath } from "@/lib/routes";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { playlistShareUrl, shareContent } from "@/lib/shareContent";
import type { PlaylistTrackContext } from "@/lib/queueTrack";
import { useAuth } from "@/providers/AuthProvider";
import type { CollectionRecording } from "./collectionTypes";

export type CollectionViewMode = "view" | "edit";

export interface CollectionViewProps {
  playlist: PlaylistDetail;
  mode?: CollectionViewMode;
  onPlayAll?: (shuffle: boolean) => void;
  onPlayTrack?: (recording: CollectionRecording, index: number) => void;
  playlistIsPlaying?: boolean;
  playlistIsPaused?: boolean;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onCoverClick?: () => void;
  onAddTracks?: () => void;
  onAddCollection?: () => void;
  collectionAddPending?: boolean;
  collectionAdded?: boolean;
  onRemoveTrack?: (recordingId: string) => void;
  onMoveTrackUp?: (recordingId: string) => void;
  onMoveTrackDown?: (recordingId: string) => void;
  onUpdateTrackTitle?: (recordingId: string, title: string) => void;
  onUpdateTrackArtwork?: (recordingId: string, file: File) => void;
  onUpdateTrackTags?: (recordingId: string, tagSlugs: string[]) => void;
  trackSavingById?: Record<string, boolean>;
  trackErrorById?: Record<string, string | undefined>;
  selectedGenreId?: string | null;
  onGenreChange?: (genreId: string | null) => void;
  genreOptions?: { id: string; name: string }[];
  genreLoading?: boolean;
  genreSaving?: boolean;
  editToolbar?: React.ReactNode;
  uploadProgress?: React.ReactNode;
}

const typeLabels: Record<string, string> = {
  PLAYLIST: "Playlist",
  ALBUM: "Album",
  PODCAST_CHANNEL: "Podcast",
  RELEASE: "Release",
  MIX: "Mix",
};

export function CollectionView({
  playlist,
  mode = "view",
  onPlayAll,
  onPlayTrack,
  playlistIsPlaying,
  playlistIsPaused,
  onTitleChange,
  onDescriptionChange,
  onCoverClick,
  onAddTracks,
  onAddCollection,
  collectionAddPending = false,
  collectionAdded = false,
  onRemoveTrack,
  onMoveTrackUp,
  onMoveTrackDown,
  onUpdateTrackTitle,
  onUpdateTrackArtwork,
  onUpdateTrackTags,
  trackSavingById,
  trackErrorById,
  selectedGenreId,
  onGenreChange,
  genreOptions,
  genreLoading,
  genreSaving,
  editToolbar,
  uploadProgress,
}: CollectionViewProps) {
  const { user } = useAuth();
  const isEdit = mode === "edit";
  const isPodcast = playlist.type === "PODCAST_CHANNEL";
  const isOwner = Boolean(user?.id && user.id === playlist.ownerId);
  const recordings = playlist.recordings as CollectionRecording[];

  const coverStyle = playlist.coverArtUrl
    ? undefined
    : { background: coverFallback(playlist.title) };

  const playlistContext: PlaylistTrackContext = {
    playlistId: playlist.id,
    playlistTitle: playlist.title,
    ownerUsername: playlist.owner.username,
    ownerDisplayName: playlist.owner.displayName,
    slug: playlist.slug,
  };

  function handleShare() {
    void shareContent(
      playlistShareUrl({
        id: playlist.id,
        username: playlist.owner.username,
        slug: playlist.slug,
      }),
      playlist.title,
    );
  }

  function handlePlayRecording(recording: CollectionRecording, _index: number) {
    const globalIndex = recordings.findIndex((r) => r.id === recording.id);
    onPlayTrack?.(recording, globalIndex >= 0 ? globalIndex : 0);
  }

  return (
    <div className="mx-auto max-w-4xl">
      {isEdit && editToolbar ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">{editToolbar}</div>
      ) : null}

      <div
        className={
          isPodcast
            ? "grid gap-10 lg:grid-cols-[minmax(280px,360px)_1fr]"
            : "flex flex-col gap-8 md:flex-row md:items-end"
        }
      >
        <div className={isPodcast ? "" : "shrink-0"}>
          <button
            type="button"
            onClick={isEdit ? onCoverClick : undefined}
            className={`block text-left ${isEdit ? "cursor-pointer ring-offset-2 hover:ring-2 hover:ring-[var(--color-brand)]" : ""}`}
            disabled={!isEdit}
            title="Change cover art"
          >
            {playlist.coverArtUrl ? (
              <img
                src={playlist.coverArtUrl}
                alt=""
                className={`object-cover shadow-2xl ${isPodcast ? "aspect-square w-full max-w-[360px] rounded-lg" : "h-56 w-56 rounded-lg md:h-64 md:w-64"}`}
              />
            ) : (
              <div
                className={`rounded-lg shadow-2xl ${isPodcast ? "aspect-square w-full max-w-[360px]" : "h-56 w-56 md:h-64 md:w-64"}`}
                style={coverStyle}
              />
            )}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {typeLabels[playlist.type] ?? "Collection"}
            {isEdit ? (
              <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200">
                Editing
              </span>
            ) : null}
          </p>
          {isEdit ? (
            <input
              value={playlist.title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              className="mt-2 w-full border-0 bg-transparent text-3xl font-bold tracking-tight text-white outline-none focus:ring-0 md:text-5xl"
            />
          ) : (
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{playlist.title}</h1>
          )}
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            <Link to={profilePath(playlist.owner.username)} className="font-medium text-white hover:underline">
              {playlist.owner.displayName}
            </Link>
            {playlist.itemCount > 0 ? ` • ${playlist.itemCount} tracks` : null}
          </p>
          {isEdit ? (
            <>
              <textarea
                value={playlist.description ?? ""}
                onChange={(e) => onDescriptionChange?.(e.target.value)}
                rows={3}
                placeholder="Describe this collection…"
                className="mt-4 w-full max-w-2xl resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-brand)]"
              />
              {onGenreChange ? (
                <div className="mt-4 max-w-2xl">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Primary playlist genre
                  </label>
                  <select
                    value={selectedGenreId ?? ""}
                    onChange={(event) => onGenreChange(event.target.value || null)}
                    disabled={genreLoading}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-brand)]"
                  >
                    <option value="">
                      No genre selected
                    </option>
                    {genreOptions?.map((genre) => (
                      <option
                        key={genre.id}
                        value={genre.id}
                      >
                        {genre.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 min-h-5 text-sm text-[var(--color-text-muted)]">
                    {genreSaving
                      ? "Saving genre…"
                      : genreLoading
                        ? "Loading genres…"
                        : genreOptions?.length === 0
                          ? "No genres available."
                          : "Optional primary genre for this playlist."}
                  </p>
                </div>
              ) : null}
            </>
          ) : playlist.description ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
              {playlist.description}
            </p>
          ) : null}
          {!isEdit && onPlayAll ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onPlayAll(false)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black"
              >
                {playlistIsPlaying ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
                {playlistIsPlaying ? "Playing" : playlistIsPaused ? "Resume" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => onPlayAll(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                <Shuffle size={18} />
                Shuffle
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
                aria-label="Share"
              >
                <Share2 size={18} />
              </button>
              <FavoriteHeartButton
                target="playlist"
                id={playlist.id}
                variant="inline"
                className="!h-10 !w-10 !rounded-full !border !border-white/20 !bg-transparent !opacity-100"
              />
              {isOwner ? (
                <Link
                  to={studioCollectionEditPath(playlist.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
                  aria-label="Edit playlist"
                  title="Edit"
                >
                  <Pencil size={18} />
                </Link>
              ) : null}
              {onAddCollection ? (
                <button
                  type="button"
                  onClick={onAddCollection}
                  disabled={collectionAddPending || collectionAdded}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  <Plus size={18} />
                  {collectionAdded ? "In collections" : collectionAddPending ? "Adding..." : "Add to collections"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="w-full flex justify-center">
          {isEdit && onAddTracks ? (
            <button
              type="button"
              onClick={onAddTracks}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black"
            >
              <Upload size={18} />
              Add tracks
            </button>
          ) : null}
      </div>

      <div className={isPodcast ? "mt-10 lg:col-span-2" : "mt-10"}>
        {recordings.length === 0 ? (
          <EmptyState
            title="No tracks yet"
            description={isEdit ? "Upload or add tracks to build this collection." : "This collection is empty."}
          />
        ) : isEdit ? (
          <div className="space-y-3">

            <div className="min-h-[16px]">
              {uploadProgress ? <div className="py-2">{uploadProgress}</div> : null}
            </div>

            <TrackList
              recordings={playlist.recordings as CollectionRecording[]}
              ownerName={playlist.owner.displayName}
              playlistContext={playlistContext}
              onPlay={handlePlayRecording}
              editMode
              onRemove={onRemoveTrack}
              onMoveUp={onMoveTrackUp}
              onMoveDown={onMoveTrackDown}
              onUpdateTitle={onUpdateTrackTitle}
              onUpdateArtwork={onUpdateTrackArtwork}
              onUpdateTags={onUpdateTrackTags}
              fallbackArtworkUrl={playlist.coverArtUrl}
              savingById={trackSavingById}
              errorById={trackErrorById}
            />
          </div>
        ) : (
          <TrackList
            recordings={recordings}
            ownerName={playlist.owner.displayName}
            playlistContext={playlistContext}
            onPlay={handlePlayRecording}
          />
        )}
      </div>
    </div>
  );
}
