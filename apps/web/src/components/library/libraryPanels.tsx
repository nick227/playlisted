import type { LibraryArtist, LibraryGenre, LibrarySong } from "@playlisted/client-sdk";
import { ChevronRight, Pause, Play, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { Skeleton } from "@/components/feedback/Skeleton";
import {
  createLibraryGenreSelectionStore,
  LibraryGenreFilter,
  useLibraryGenreSelection,
  type LibraryGenreSelectionStore,
} from "@/components/library/LibraryGenreFilter";
import {
  EMPTY_LIBRARY_ARTISTS,
  EMPTY_LIBRARY_GENRES,
  EMPTY_LIBRARY_SONGS,
  EMPTY_PLAYLISTS,
  filterArtistsByGenre,
  filterPlaylistsByQuery,
  filterSongsByArtist,
  genresFromArtists,
  genresFromSongs,
  sortLibraryArtists,
  sortLibraryPlaylists,
  sortLibrarySongs,
  topArtistsBySongCount,
  topPlaylistsByItemCount,
  type PlaylistSortKey,
  type SortDirection,
  type SongSortKey,
} from "@/components/library/libraryFilterUtils";
import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import {
  useLibraryArtists,
  useLibraryGenres,
  useLibraryPlaylistGenres,
  useLibraryPlaylists,
  useLibrarySongs,
} from "@/hooks/useLibrary";
import { genrePath } from "@/lib/browsePaths";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

export function PanelSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      <Skeleton className="h-14 w-56 rounded-lg" />
      <Skeleton className="h-4 w-72 rounded" />
      <div className="mt-10 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function PanelHeader({
  label,
  count,
  unit = "item",
}: {
  label: string;
  count?: number;
  unit?: string;
}) {
  return (
    <div>
      <h2 className="text-5xl font-extrabold tracking-tighter leading-none text-white md:text-6xl mt-4">
        {label}
      </h2>
      {count != null && count > 0 && (
        <p className="mt-3 text-sm text-[var(--color-text-subtle)]">
          {count} {unit}{count !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function TracksList({ songs }: { songs: LibrarySong[] }) {
  return <LibraryTrackList songs={songs} />;
}

function GenreSongThumb({ song, queue }: { song: LibrarySong; queue: LibrarySong[] }) {
  const { playTrack, currentTrack, isPlaying, togglePlay, ensurePlayback } = useAudioPlayer();
  const isActive = currentTrack?.id === song.id;

  function handlePlay() {
    if (isActive) {
      if (isPlaying) {
        togglePlay();
      } else {
        ensurePlayback();
      }
      return;
    }
    playTrack(
      librarySongToQueueTrack(song),
      queue.map((s) => librarySongToQueueTrack(s)),
      { sourceContext: "library" },
      { segmentLabel: "Library" },
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      aria-label={`Play ${song.title}`}
      title={`${song.title} by ${song.uploader.displayName}`}
      className="group/thumb relative aspect-square min-w-0 overflow-hidden rounded-lg text-left shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5"
    >
      {song.artworkUrl ? (
        <img
          src={song.artworkUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
        />
      ) : (
        <div className="h-full w-full" style={{ background: coverFallback(song.title) }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur transition-transform group-hover/thumb:scale-105">
        {isActive && isPlaying ? (
          <Pause size={15} fill="currentColor" />
        ) : (
          <Play size={15} className="ml-0.5" fill="currentColor" />
        )}
      </div>
      <div className="absolute inset-x-2 bottom-2 min-w-0 sm:inset-x-3 sm:bottom-3">
        <p className="truncate text-xs font-semibold text-white sm:text-sm">{song.title}</p>
        <p className="truncate text-[10px] text-white/65 sm:text-xs">{song.uploader.displayName}</p>
      </div>
    </button>
  );
}

function GenreCard({ genre }: { genre: LibraryGenre }) {
  const { data, isLoading } = useLibrarySongs(genre.slug, true, 6);
  const { activeStationSlug, setActiveStationSlug, playing, togglePlayback } = useRadioPlayer();
  const previewSongs = data?.data ?? EMPTY_LIBRARY_SONGS;
  const featuredArtistCount = new Set(previewSongs.map((song) => song.uploaderId)).size;
  const stationPlaying = activeStationSlug === genre.slug && playing;
  const stationPending = false;

  const handlePlayStation = () => {
    if (activeStationSlug === genre.slug) {
      void togglePlayback();
    } else {
      setActiveStationSlug(genre.slug);
      if (!playing) void togglePlayback();
    }
  };

  return (
    <article className="group relative overflow-hidden rounded-xl sm:p-5 xl:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70" />
      <div className="flex flex-col gap-6">
        <div className="min-w-0 xl:flex xl:items-end xl:justify-between xl:gap-6">
          <div className="min-w-0">
            <Link
              to={genrePath(genre.slug)}
              className="block max-w-5xl text-[clamp(1.9rem,4vw,3.75rem)] font-extrabold leading-[0.95] tracking-tighter text-white transition-colors group-hover:text-[var(--color-brand)]"
            >
              {genre.name}
            </Link>
            <p className="mt-3 text-xs font-medium uppercase text-white/45">
              {genre.songCount} recording{genre.songCount !== 1 ? "s" : ""}
              {featuredArtistCount > 0
                ? ` · ${featuredArtistCount} featured artist${featuredArtistCount !== 1 ? "s" : ""}`
                : ""}
            </p>
          </div>
          <div className="mt-4 flex shrink-0 items-center gap-2 xl:mt-0">
            <button
              type="button"
              onClick={handlePlayStation}
              disabled={stationPending || genre.songCount <= 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70 transition-colors hover:border-[var(--color-brand)]/45 hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-50"
              aria-label={`${stationPlaying ? "Pause" : "Play"} ${genre.name} radio`}
            >
              {stationPlaying ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <Link
              to={genrePath(genre.slug)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white/65 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              All
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="w-full">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : previewSongs.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {previewSongs.slice(0, 6).map((song) => (
                <GenreSongThumb key={song.id} song={song} queue={previewSongs} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-28 items-center gap-3 rounded-lg border border-white/[0.08] bg-black/15 px-4 text-sm text-[var(--color-text-subtle)]">
              <Sparkles size={16} className="shrink-0 text-white/35" />
              New work will appear here as artists publish it.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function GenresPanel() {
  const { data, isLoading } = useLibraryGenres();
  const genres = data?.data ? data.data.filter((g) => g.songCount > 0) : EMPTY_LIBRARY_GENRES;
  const sortedGenres = useMemo(
    () => [...genres].sort((a, b) => b.songCount - a.songCount || a.name.localeCompare(b.name)),
    [genres],
  );

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label="Genres" count={genres.length} />
      <div className="mt-10 space-y-4">
        {sortedGenres.map((genre) => (
          <GenreCard key={genre.slug} genre={genre} />
        ))}
      </div>
    </div>
  );
}

export function GenreDetailPanel({ slug, name }: { slug: string; name: string }) {
  const { data, isLoading } = useLibrarySongs(slug);
  const songs = data?.data ?? EMPTY_LIBRARY_SONGS;

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label={name} count={songs.length} unit="recording" />
      <div className="mt-10">
        {songs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-subtle)]">No recordings in this genre yet.</p>
        ) : (
          <TracksList songs={songs} />
        )}
      </div>
    </div>
  );
}

export function ArtistsPanel() {
  const genreStore = useMemo(() => createLibraryGenreSelectionStore(), []);
  const { data, isLoading } = useLibraryArtists();
  const allArtists = data?.data ?? EMPTY_LIBRARY_ARTISTS;
  const genres = useMemo(() => genresFromArtists(allArtists), [allArtists]);

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label="Artists" count={allArtists.length} />
      <LibraryGenreFilter genres={genres} store={genreStore} />
      <ArtistResults artists={allArtists} genreStore={genreStore} />
    </div>
  );
}

function ArtistResults({
  artists,
  genreStore,
}: {
  artists: LibraryArtist[];
  genreStore: LibraryGenreSelectionStore;
}) {
  const genreSlug = useLibraryGenreSelection(genreStore);
  const filteredArtists = useMemo(
    () => sortLibraryArtists(filterArtistsByGenre(artists, genreSlug), "name", "asc"),
    [artists, genreSlug],
  );

  if (filteredArtists.length === 0) {
    return (
      <p className="mt-10 text-sm text-[var(--color-text-subtle)]">No artists match these filters.</p>
    );
  }

  return (
    <div className="mt-10 grid grid-cols-3 lg:grid-cols-6 gap-4">
      {filteredArtists.map((artist) => (
        <SmartArtistCard
          key={artist.id}
          id={artist.id}
          username={artist.username}
          displayName={artist.displayName}
          avatarUrl={artist.avatarUrl}
          subtitle={[
            `${artist.songCount} recording${artist.songCount !== 1 ? "s" : ""}`,
            artist.genres[0]?.name,
          ]
            .filter(Boolean)
            .join(" · ")}
          className="w-full gap-3"
        />
      ))}
    </div>
  );
}

export function PlaylistsPanel() {
  const genreStore = useMemo(() => createLibraryGenreSelectionStore(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<PlaylistSortKey>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { data: genresData, isLoading: genresLoading } = useLibraryPlaylistGenres();
  const genres = genresData?.data ?? EMPTY_LIBRARY_GENRES;
  const allPlaylistsQuery = useLibraryPlaylists(null);
  const allPlaylists = allPlaylistsQuery.data?.data ?? EMPTY_PLAYLISTS;
  const suggestedPlaylists = useMemo(() => topPlaylistsByItemCount(allPlaylists, 4), [allPlaylists]);

  if (allPlaylistsQuery.isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label="Playlists" count={allPlaylists.length} />
      {genresLoading ? <GenreFilterSkeleton /> : <LibraryGenreFilter genres={genres} store={genreStore} />}
      <PlaylistResults
        genreStore={genreStore}
        searchQuery={searchQuery}
        sortDirection={sortDirection}
        sortKey={sortKey}
      />
    </div>
  );
}

function GenreFilterSkeleton() {
  return (
    <div className="mt-8">
      <Skeleton className="mb-3 h-3 w-14 rounded" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>
    </div>
  );
}

function ResultGridSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
      ))}
    </div>
  );
}

function PlaylistResults({
  genreStore,
  searchQuery,
  sortDirection,
  sortKey,
}: {
  genreStore: LibraryGenreSelectionStore;
  searchQuery: string;
  sortDirection: SortDirection;
  sortKey: PlaylistSortKey;
}) {
  const genreSlug = useLibraryGenreSelection(genreStore);
  const { data, isLoading } = useLibraryPlaylists(genreSlug);
  const playlists = useMemo(() => {
    const source = data?.data ?? EMPTY_PLAYLISTS;
    const byQuery = filterPlaylistsByQuery(source, searchQuery);
    return sortLibraryPlaylists(byQuery, sortKey, sortDirection);
  }, [data?.data, searchQuery, sortKey, sortDirection]);

  if (isLoading) return <ResultGridSkeleton />;

  if (playlists.length === 0) {
    return <p className="mt-10 text-sm text-[var(--color-text-subtle)]">No playlists match these filters.</p>;
  }

  return (
    <div className="mt-10 grid grid-cols-3 lg:grid-cols-6 gap-4">
      {playlists.map((playlist) => (
        <SmartPlaylistCard
          key={playlist.id}
          id={playlist.id}
          title={playlist.title}
          creatorName={playlist.owner.displayName}
          coverArtUrl={playlist.coverArtUrl}
          ownerUsername={playlist.owner.username}
          slug={playlist.slug}
          meta={playlist.itemCount > 0 ? `${playlist.itemCount} tracks` : undefined}
          className="w-full"
        />
      ))}
    </div>
  );
}

export function SongsPanel() {
  const genreStore = useMemo(() => createLibraryGenreSelectionStore(), []);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SongSortKey>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data: artistsData } = useLibraryArtists();
  const artists = artistsData?.data ?? EMPTY_LIBRARY_ARTISTS;
  const suggestedArtists = useMemo(() => topArtistsBySongCount(artists, 4), [artists]);
  const allSongsQuery = useLibrarySongs(null);
  const genres = useMemo(
    () => genresFromSongs(allSongsQuery.data?.data ?? EMPTY_LIBRARY_SONGS),
    [allSongsQuery.data?.data],
  );

  if (allSongsQuery.isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label="Songs" count={allSongsQuery.data?.data.length ?? 0} unit="recording" />
      <LibraryGenreFilter genres={genres} store={genreStore} />
      <SongResults
        allSongs={allSongsQuery.data?.data ?? EMPTY_LIBRARY_SONGS}
        artistId={artistId}
        genreStore={genreStore}
        sortDirection={sortDirection}
        sortKey={sortKey}
      />
    </div>
  );
}

function SongResults({
  allSongs,
  artistId,
  genreStore,
  sortDirection,
  sortKey,
}: {
  allSongs: LibrarySong[];
  artistId: string | null;
  genreStore: LibraryGenreSelectionStore;
  sortDirection: SortDirection;
  sortKey: SongSortKey;
}) {
  const genreSlug = useLibraryGenreSelection(genreStore);
  const genreSongsQuery = useLibrarySongs(genreSlug, Boolean(genreSlug));
  const sourceSongs = genreSlug ? (genreSongsQuery.data?.data ?? EMPTY_LIBRARY_SONGS) : allSongs;
  const songs = useMemo(() => {
    const filtered = filterSongsByArtist(sourceSongs, artistId);
    return sortLibrarySongs(filtered, sortKey, sortDirection);
  }, [sourceSongs, artistId, sortKey, sortDirection]);

  if (genreSlug && genreSongsQuery.isLoading) {
    return (
      <div className="mt-10 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-10">
      {songs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-subtle)]">No recordings match these filters.</p>
      ) : (
        <TracksList songs={songs} />
      )}
    </div>
  );
}
