import type { PlaylistDetail } from "@playlisted/client-sdk";
import { Pause, Play, Plus, Share2, Shuffle, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { TrackList } from "@/components/tracks/TrackList";
import { coverFallback, profilePath } from "@/lib/routes";
import {
  mergeForPlayback,
  partitionRecordings,
  type CollectionRecording,
} from "./partitionRecordings";

export type CollectionViewMode = "view" | "edit";

export interface CollectionViewProps {
  playlist: PlaylistDetail;
  mode?: CollectionViewMode;
  activeTrackId?: string | null;
  playerState?: "idle" | "loading" | "playing" | "paused" | "error";
  onPlayAll?: (shuffle: boolean) => void;
  onPlayTrack?: (recording: CollectionRecording, index: number) => void;
  playlistIsPlaying?: boolean;
  playlistIsPaused?: boolean;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onCoverClick?: () => void;
  onAddTracks?: () => void;
  onAddCollectionToPlaylist?: () => void;
  onRemoveTrack?: (recordingId: string) => void;
  onMoveTrackUp?: (recordingId: string) => void;
  onMoveTrackDown?: (recordingId: string) => void;
  editToolbar?: React.ReactNode;
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
  activeTrackId,
  playerState,
  onPlayAll,
  onPlayTrack,
  playlistIsPlaying,
  playlistIsPaused,
  onTitleChange,
  onDescriptionChange,
  onCoverClick,
  onAddTracks,
  onAddCollectionToPlaylist,
  onRemoveTrack,
  onMoveTrackUp,
  onMoveTrackDown,
  editToolbar,
}: CollectionViewProps) {
  const isEdit = mode === "edit";
  const isPodcast = playlist.type === "PODCAST_CHANNEL";
  const { ownUploads, fromOthers } = partitionRecordings(
    playlist.recordings as CollectionRecording[],
    playlist.ownerId,
  );
  const playbackOrder = mergeForPlayback(ownUploads, fromOthers);

  const coverStyle = playlist.coverArtUrl
    ? undefined
    : { background: coverFallback(playlist.title) };

  function handlePlayRecording(recording: CollectionRecording, _index: number) {
    const globalIndex = playbackOrder.findIndex((r) => r.id === recording.id);
    onPlayTrack?.(recording, globalIndex >= 0 ? globalIndex : 0);
  }

  return (
    <div className="mx-auto max-w-6xl">
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
            {isEdit ? (
              <span className="mt-2 block text-xs font-medium text-[var(--color-brand)]">
                Change cover art
              </span>
            ) : null}
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
            <textarea
              value={playlist.description ?? ""}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
              rows={3}
              placeholder="Describe this collection…"
              className="mt-4 w-full max-w-2xl resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-brand)]"
            />
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
                aria-label="Share"
              >
                <Share2 size={18} />
              </button>
              {onAddCollectionToPlaylist ? (
                <button
                  type="button"
                  onClick={onAddCollectionToPlaylist}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  <Plus size={18} />
                  Add to playlist
                </button>
              ) : null}
            </div>
          ) : null}
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
      </div>

      <div className={isPodcast ? "mt-10 lg:col-span-2" : "mt-10"}>
        {playbackOrder.length === 0 ? (
          <EmptyState
            title="No tracks yet"
            description={isEdit ? "Upload or add tracks to build this collection." : "This collection is empty."}
          />
        ) : isEdit ? (
          <div className="space-y-3">
            {onAddTracks ? (
              <button
                type="button"
                onClick={onAddTracks}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left transition hover:border-white/20"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Upload size={18} />
                  Add Tracks
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">Upload audio files</span>
              </button>
            ) : null}
            <TrackList
              recordings={playlist.recordings as CollectionRecording[]}
              activeId={activeTrackId}
              playerState={playerState}
              ownerName={playlist.owner.displayName}
              onPlay={handlePlayRecording}
              editMode
              onRemove={onRemoveTrack}
              onMoveUp={onMoveTrackUp}
              onMoveDown={onMoveTrackDown}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {ownUploads.length > 0 ? (
              <section>
                <h2 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">
                  Your uploads
                </h2>
                <TrackList
                  recordings={ownUploads}
                  activeId={activeTrackId}
                  playerState={playerState}
                  ownerName={playlist.owner.displayName}
                  onPlay={handlePlayRecording}
                />
              </section>
            ) : null}
            {fromOthers.length > 0 ? (
              <section>
                <h2 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                  From the community
                </h2>
                <TrackList
                  recordings={fromOthers}
                  activeId={activeTrackId}
                  playerState={playerState}
                  onPlay={handlePlayRecording}
                />
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
