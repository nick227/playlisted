import { useSearchParams } from "react-router-dom";
import type { LibrarySong } from "@playlisted/client-sdk";

import { LibraryTrackRow } from "@/components/library/LibraryTrackRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useLibraryGenres, useLibrarySongs } from "@/hooks/useLibrary";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

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
        <span className={active ? "text-white/70" : "text-white/30"}>{count}</span>
      )}
    </button>
  );
}

function LibraryTrackList({ songs }: { songs: LibrarySong[] }) {
  const { playTrack, currentTrack, togglePlay } = useAudioPlayer();

  function handlePlay(song: LibrarySong) {
    if (currentTrack?.id === song.id) {
      togglePlay();
      return;
    }
    const queue = songs.map((s) => librarySongToQueueTrack(s));
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx < 0) return;
    playTrack(librarySongToQueueTrack(song), queue.slice(idx), { sourceContext: "library" });
  }

  return (
    <div className="flex flex-col gap-0.5">
      {songs.map((song) => (
        <LibraryTrackRow
          key={song.id}
          song={song}
          onPlay={() => handlePlay(song)}
          queueTrack={librarySongToQueueTrack(song)}
        />
      ))}
    </div>
  );
}

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeGenre = searchParams.get("genre");

  const songsQuery = useLibrarySongs(activeGenre);
  const genresQuery = useLibraryGenres();

  const songs = songsQuery.data?.data ?? [];
  const genres = genresQuery.data?.data ?? [];
  const isLoading = songsQuery.isLoading || genresQuery.isLoading;

  function setGenre(slug: string | null) {
    if (slug) {
      setSearchParams({ genre: slug }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">Library</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {songs.length > 0 || activeGenre
            ? `${songs.length} song${songs.length !== 1 ? "s" : ""}`
            : "All public songs"}
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <GenreChip
              label="All genres"
              active={!activeGenre}
              onClick={() => setGenre(null)}
            />
            {genres
              .filter((g) => g.songCount > 0)
              .map((genre) => (
                <GenreChip
                  key={genre.slug}
                  label={genre.name}
                  count={genre.songCount}
                  active={activeGenre === genre.slug}
                  onClick={() => setGenre(activeGenre === genre.slug ? null : genre.slug)}
                />
              ))}
          </div>

          {songs.length === 0 ? (
            <EmptyState
              title={activeGenre ? "No songs in this genre" : "No songs yet"}
              description={
                activeGenre
                  ? "Try selecting a different genre."
                  : "Published tracks will appear here once artists upload them."
              }
            />
          ) : (
            <LibraryTrackList songs={songs} />
          )}
        </>
      )}
    </div>
  );
}
