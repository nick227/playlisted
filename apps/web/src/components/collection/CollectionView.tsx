import type { PlaylistDetail } from "@playlisted/client-sdk";
import { Check, ChevronDown, Library, Pause, Pencil, Play, Plus, Search, Share2, Upload, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { TrackList } from "@/components/tracks/TrackList";
import { coverFallback, studioCollectionEditPath } from "@/lib/routes";
import { artistPath } from "@/lib/browsePaths";
import { libraryGenrePath } from "@/lib/libraryPaths";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { playlistShareUrl, shareContent } from "@/lib/shareContent";
import type { PlaylistTrackContext } from "@/lib/queueTrack";
import { useAuth } from "@/providers/AuthProvider";
import type { GenreOption } from "@/components/studio/studioCollectionUtils";

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
  onGenreCreate?: (name: string) => void;
  genreOptions?: GenreOption[];
  playlistGenreSlug?: string | null;
  genreLoading?: boolean;
  genreSaving?: boolean;
  genreError?: string;
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

function normalizeGenreName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

interface GenreSmartInputProps {
  selectedGenreId?: string | null;
  genreOptions?: GenreOption[];
  genreLoading?: boolean;
  genreSaving?: boolean;
  onGenreChange: (genreId: string | null) => void;
  onGenreCreate?: (name: string) => void;
}

function GenreSmartInput({
  selectedGenreId,
  genreOptions = [],
  genreLoading,
  genreSaving,
  onGenreChange,
  onGenreCreate,
}: GenreSmartInputProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [submittedGenreName, setSubmittedGenreName] = useState<string | null>(null);

  const selectedGenre = genreOptions.find((genre) => genre.id === selectedGenreId) ?? null;
  const normalizedQuery = normalizeGenreName(query);
  const disabled = Boolean(genreLoading || genreSaving);

  const filteredGenres = useMemo(() => {
    if (!normalizedQuery) return genreOptions;
    return genreOptions.filter((genre) => normalizeGenreName(genre.name).includes(normalizedQuery));
  }, [genreOptions, normalizedQuery]);

  const exactMatch = genreOptions.find((genre) => normalizeGenreName(genre.name) === normalizedQuery) ?? null;
  const canCreate = Boolean(onGenreCreate && normalizedQuery && !exactMatch);
  const showDropdown = open && !disabled;
  const optionCount = filteredGenres.length + (canCreate ? 1 : 0);
  const activeDescendant =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (open) return;
    if (selectedGenre) {
      setSubmittedGenreName(null);
      setQuery(selectedGenre.name);
      return;
    }
    setQuery(submittedGenreName ?? "");
  }, [open, selectedGenre, submittedGenreName]);

  useEffect(() => {
    if (!showDropdown) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showDropdown]);

  useEffect(() => {
    if (optionCount === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((index) => (index >= optionCount ? optionCount - 1 : index));
  }, [optionCount]);

  function selectGenre(genre: GenreOption) {
    setSubmittedGenreName(null);
    setQuery(genre.name);
    setOpen(false);
    setActiveIndex(-1);
    if (genre.id !== selectedGenreId) onGenreChange(genre.id);
  }

  function clearGenre() {
    setSubmittedGenreName(null);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    if (selectedGenreId != null) onGenreChange(null);
    inputRef.current?.focus();
  }

  function createGenre() {
    const trimmed = query.trim().replace(/\s+/g, " ");
    if (!trimmed || !onGenreCreate) return;
    setSubmittedGenreName(trimmed);
    setQuery(trimmed);
    setOpen(false);
    setActiveIndex(-1);
    onGenreCreate(trimmed);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (optionCount === 0 ? -1 : (index + 1) % optionCount));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (optionCount === 0 ? -1 : index <= 0 ? optionCount - 1 : index - 1));
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key !== "Enter") return;

    event.preventDefault();
    if (activeIndex >= 0 && activeIndex < filteredGenres.length) {
      selectGenre(filteredGenres[activeIndex]);
      return;
    }
    if (activeIndex === filteredGenres.length && canCreate) {
      createGenre();
      return;
    }
    if (exactMatch) {
      selectGenre(exactMatch);
      return;
    }
    if (filteredGenres.length === 1) {
      selectGenre(filteredGenres[0]);
      return;
    }
    if (canCreate) createGenre();
  }

  return (
    <div ref={rootRef} className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-haspopup="listbox"
        autoComplete="off"
        placeholder={genreLoading ? "Loading genres..." : "Search or create a genre..."}
        disabled={disabled}
        onChange={(event) => {
          setSubmittedGenreName(null);
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-11 pr-20 text-sm text-white placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      {(selectedGenreId || query) && !disabled ? (
        <button
          type="button"
          onClick={clearGenre}
          aria-label="Clear genre"
          className="absolute right-11 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--color-text-subtle)] transition hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((value) => !value);
          inputRef.current?.focus();
        }}
        disabled={disabled}
        aria-label="Show genres"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--color-text-subtle)] transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ChevronDown size={16} />
      </button>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-2xl"
        >
          {filteredGenres.length === 0 && !canCreate ? (
            <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No genres found.</p>
          ) : null}
          {filteredGenres.map((genre, index) => (
            <button
              id={`${listboxId}-option-${index}`}
              key={genre.id}
              type="button"
              role="option"
              aria-selected={genre.id === selectedGenreId}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectGenre(genre)}
              className={[
                "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition",
                index === activeIndex ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5",
              ].join(" ")}
            >
              <span className="min-w-0 flex-1 truncate">{genre.name}</span>
              {genre.id === selectedGenreId ? <Check size={16} className="shrink-0 text-[var(--color-brand)]" /> : null}
            </button>
          ))}
          {canCreate ? (
            <button
              id={`${listboxId}-option-${filteredGenres.length}`}
              type="button"
              role="option"
              aria-selected={activeIndex === filteredGenres.length}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(filteredGenres.length)}
              onClick={createGenre}
              className={[
                "flex w-full items-center gap-3 border-t border-[var(--color-border)] px-4 py-2.5 text-left text-sm transition",
                activeIndex === filteredGenres.length ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5",
              ].join(" ")}
            >
              <Plus size={16} className="shrink-0 text-[var(--color-brand)]" />
              <span className="min-w-0 flex-1 truncate">Create "{query.trim().replace(/\s+/g, " ")}"</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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
  onGenreCreate,
  genreOptions,
  playlistGenreSlug,
  genreLoading,
  genreSaving,
  genreError,
  editToolbar,
  uploadProgress,
}: CollectionViewProps) {
  const { user } = useAuth();
  const isEdit = mode === "edit";
  const isOwner = Boolean(user?.id && user.id === playlist.ownerId);
  const coverArtClassName =
    "aspect-square w-full min-w-0 max-w-[180px] overflow-hidden rounded-lg object-cover sm:h-[180px] sm:w-[180px] sm:max-w-[180px]";
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
    <div className={`mx-auto flex ${isEdit ? "max-w-3xl" : "w-full"} flex-col justify-center`}>
      {isEdit && editToolbar ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">{editToolbar}</div>
      ) : null}

      <div className="flex flex-col gap-8 md:flex-row md:items-end">
        <div className="mx-auto shrink-0 md:mx-0">
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
                className={coverArtClassName}
              />
            ) : (
              <div className={`${coverArtClassName} shadow-2xl`} style={coverStyle} />
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
              maxLength={300}
              placeholder="Enter a title for this collection…"
              onChange={(e) => onTitleChange?.(e.target.value)}
              className="mt-2 w-full border-0 bg-transparent text-3xl font-bold tracking-tight text-white outline-none focus:ring-0 md:text-5xl"
            />
          ) : (
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{playlist.title}</h1>
          )}
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            <Link to={artistPath(playlist.owner.username)} className="font-medium text-white hover:underline">
              {playlist.owner.displayName}
            </Link>
            {playlist.itemCount > 0 ? ` • ${playlist.itemCount} tracks` : null}
            {playlist.tags?.filter((t) => t.kind === "GENRE").map((tag) => (
              <span key={tag.id}>
                {" • "}
                <Link to={libraryGenrePath(tag.slug)} className="hover:underline hover:text-white transition-colors">
                  {tag.name}
                </Link>
              </span>
            ))}
          </p>
          {isEdit ? (
            <>
              <textarea
                value={playlist.description ?? ""}
                onChange={(e) => onDescriptionChange?.(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Describe this collection…"
                className="mt-4 w-full max-w-2xl resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-brand)]"
              />
              {onGenreChange ? (
                <div className="mt-4 max-w-2xl">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Primary playlist genre
                  </label>
                  <GenreSmartInput
                    selectedGenreId={selectedGenreId}
                    onGenreChange={onGenreChange}
                    onGenreCreate={onGenreCreate}
                    genreOptions={genreOptions}
                    genreLoading={genreLoading}
                    genreSaving={genreSaving}
                  />
                  <p className="mt-2 min-h-5 text-sm text-[var(--color-text-muted)]">
                    {genreError
                      ? genreError
                      : genreSaving
                        ? "Saving genre…"
                        : genreLoading
                          ? "Loading genres…"
                          : genreOptions?.length === 0
                            ? "No genres available."
                            : ""}
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
            <div className="mt-6 flex flex-nowrap items-center gap-3 overflow-x-auto collection-controls">
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
                onClick={handleShare}
                className="inline-flex h-10 w-20 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
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
                  aria-label={
                    collectionAdded
                      ? "In collections"
                      : collectionAddPending
                        ? "Adding to collections"
                        : "Add to collections"
                  }
                  aria-pressed={collectionAdded}
                  title={
                    collectionAdded
                      ? "In collections"
                      : collectionAddPending
                        ? "Adding…"
                        : "Add to collections"
                  }
                  className={[
                    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10",
                    collectionAdded ? "bg-white/10" : "",
                  ].join(" ")}
                >
                  {collectionAdded ? <Library size={18} /> : <Plus size={18} />}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex w-full justify-center">
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

      <div className="mt-10 max-w-3xl">
        {isEdit ? (
          <div className="min-h-[16px]">
            {uploadProgress ? <div className="py-2">{uploadProgress}</div> : null}
          </div>
        ) : null}

        {recordings.length === 0 ? (
          <EmptyState
            title="No tracks yet"
            description={isEdit ? "Upload or add tracks to build this collection." : "This collection is empty."}
          />
        ) : isEdit ? (
          <div className="space-y-3">
            <TrackList
              recordings={recordings}
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
              genreOptions={genreOptions}
              playlistGenreSlug={playlistGenreSlug}
              genreLoading={genreLoading}
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
