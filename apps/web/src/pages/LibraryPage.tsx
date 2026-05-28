import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { LibrarySong } from "@playlisted/client-sdk";

import { TrackRow } from "@/components/tracks/TrackRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useLibraryGenres, useLibrarySongs } from "@/hooks/useLibrary";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

// ── helpers ──────────────────────────────────────────────────────────────────

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function firstLetter(title: string): string {
  const ch = title.trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(ch) ? ch : "#";
}

function toQueueTrack(song: LibrarySong) {
  return librarySongToQueueTrack(song);
}

// ── view toggle ───────────────────────────────────────────────────────────────

type View = "az" | "genres";

// ── letter nav ────────────────────────────────────────────────────────────────

function LetterNav({
  available,
  active,
  onSelect,
}: {
  available: Set<string>;
  active: string | null;
  onSelect: (l: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {[...ALPHABET, "#"].map((l) => {
        const has = available.has(l);
        const isActive = active === l;
        return (
          <button
            key={l}
            type="button"
            disabled={!has}
            onClick={() => has && onSelect(l)}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold transition",
              isActive
                ? "bg-white text-black"
                : has
                ? "text-white hover:bg-white/10"
                : "text-white/20 cursor-default",
            ].join(" ")}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ── genre chip ────────────────────────────────────────────────────────────────

function GenreChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        active
          ? "bg-[var(--color-brand)] text-white"
          : "border border-white/[0.12] text-[var(--color-text-muted)] hover:border-white/25 hover:text-white",
      ].join(" ")}
    >
      {label}
      {count != null && (
        <span className={active ? "text-white/70" : "text-white/30"}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── section divider ───────────────────────────────────────────────────────────

function LetterDivider({ letter }: { letter: string }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-4 first:mt-0" id={`letter-${letter}`}>
      <span className="text-3xl font-extrabold tracking-tight text-white/20">{letter}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

// ── track list ────────────────────────────────────────────────────────────────

function TrackList({ songs }: { songs: LibrarySong[] }) {
  const { playTrack, currentTrack, state, togglePlay } = useAudioPlayer();

  function handlePlay(song: LibrarySong) {
    const queue = songs.map(toQueueTrack);
    const idx = songs.findIndex((s) => s.id === song.id);
    if (currentTrack?.id === song.id) {
      togglePlay();
    } else {
      playTrack(toQueueTrack(song), queue.slice(idx), { sourceContext: "library" });
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      {songs.map((song, i) => (
        <TrackRow
          key={song.id}
          recordingId={song.id}
          index={i}
          title={song.title}
          creator={song.uploader.displayName}
          meta={song.genres.map((g) => g.name).join(", ") || null}
          durationSeconds={song.durationSeconds}
          artworkUrl={song.artworkUrl}
          isActive={currentTrack?.id === song.id}
          isPlaying={currentTrack?.id === song.id && state === "playing"}
          onPlay={() => handlePlay(song)}
        />
      ))}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function LibraryPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<View>(() =>
    searchParams.get("view") === "genres" ? "genres" : "az"
  );
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(() =>
    searchParams.get("genre") ?? null
  );

  const songsQuery = useLibrarySongs();
  const genresQuery = useLibraryGenres();

  const allSongs = songsQuery.data?.data ?? [];
  const allGenres = genresQuery.data?.data ?? [];

  // A-Z grouping
  const { grouped, available } = useMemo(() => {
    const map = new Map<string, LibrarySong[]>();
    for (const song of allSongs) {
      const l = firstLetter(song.title);
      if (!map.has(l)) map.set(l, []);
      map.get(l)!.push(song);
    }
    return { grouped: map, available: new Set(map.keys()) };
  }, [allSongs]);

  const azLetters = useMemo(
    () => [...ALPHABET, "#"].filter((l) => available.has(l)),
    [available],
  );

  const visibleAzGroups = useMemo(() => {
    if (activeLetter) {
      const songs = grouped.get(activeLetter) ?? [];
      return [[activeLetter, songs]] as [string, LibrarySong[]][];
    }
    return azLetters.map((l) => [l, grouped.get(l) ?? []] as [string, LibrarySong[]]);
  }, [activeLetter, grouped, azLetters]);

  // Genre filtering
  const genreFilteredSongs = useMemo(() => {
    if (!activeGenre) return allSongs;
    return allSongs.filter((s) => s.genres.some((g) => g.slug === activeGenre));
  }, [allSongs, activeGenre]);

  const isLoading = songsQuery.isLoading || genresQuery.isLoading;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Library</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {allSongs.length > 0 ? `${allSongs.length} songs` : "All public songs"}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-full border border-white/[0.12] bg-[var(--color-surface)] p-1">
          <button
            type="button"
            onClick={() => setView("az")}
            className={[
              "rounded-full px-5 py-1.5 text-sm font-medium transition",
              view === "az" ? "bg-white text-black" : "text-[var(--color-text-muted)] hover:text-white",
            ].join(" ")}
          >
            A–Z
          </button>
          <button
            type="button"
            onClick={() => setView("genres")}
            className={[
              "rounded-full px-5 py-1.5 text-sm font-medium transition",
              view === "genres" ? "bg-white text-black" : "text-[var(--color-text-muted)] hover:text-white",
            ].join(" ")}
          >
            Genres
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : allSongs.length === 0 ? (
        <EmptyState
          title="No songs yet"
          description="Published tracks will appear here once artists upload them."
        />
      ) : view === "az" ? (
        <>
          {/* Alphabet nav */}
          <div className="mb-6">
            <LetterNav
              available={available}
              active={activeLetter}
              onSelect={(l) => setActiveLetter((prev) => (prev === l ? null : l))}
            />
          </div>

          {/* Grouped list */}
          {visibleAzGroups.map(([letter, songs]) => (
            <div key={letter}>
              <LetterDivider letter={letter} />
              <TrackList songs={songs} />
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Genre chips */}
          <div className="mb-6 flex flex-wrap gap-2">
            <GenreChip
              label="All genres"
              count={allSongs.length}
              active={activeGenre === null}
              onClick={() => setActiveGenre(null)}
            />
            {allGenres
              .filter((g) => g.songCount > 0)
              .map((genre) => (
                <GenreChip
                  key={genre.slug}
                  label={genre.name}
                  count={genre.songCount}
                  active={activeGenre === genre.slug}
                  onClick={() => setActiveGenre((prev) => (prev === genre.slug ? null : genre.slug))}
                />
              ))}
          </div>

          {/* Genre-filtered list */}
          {genreFilteredSongs.length === 0 ? (
            <EmptyState title="No songs in this genre" description="Try selecting a different genre." />
          ) : (
            <TrackList songs={genreFilteredSongs} />
          )}
        </>
      )}
    </div>
  );
}
