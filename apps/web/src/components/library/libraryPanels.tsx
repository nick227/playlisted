import type { LibraryArtist, LibraryGenre, LibrarySong, PlaylistListResponse } from "@playlisted/client-sdk";
import { ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/feedback/Skeleton";
import { LibraryArtistFilter } from "@/components/library/LibraryArtistFilter";
import { LibraryGenreFilter } from "@/components/library/LibraryGenreFilter";
import {
  EMPTY_LIBRARY_ARTISTS,
  EMPTY_LIBRARY_GENRES,
  EMPTY_LIBRARY_SONGS,
  EMPTY_PLAYLISTS,
  filterArtistsByGenre,
  filterPlaylistsByGenre,
  filterSongsByArtist,
  sortLibrarySongs,
  topArtistsBySongCount,
  type SortDirection,
  type SongSortKey,
} from "@/components/library/libraryFilterUtils";
import { LibrarySongSortBar } from "@/components/library/LibrarySongSortBar";
import { LibraryTrackRow } from "@/components/library/LibraryTrackRow";
import {
  useLibraryArtists,
  useLibraryGenres,
  useLibraryPlaylists,
  useLibrarySongs,
} from "@/hooks/useLibrary";
import {
  artistPath,
  ARTISTS_PATH,
  genrePath,
  GENRES_PATH,
  PLAYLISTS_PATH,
  SONGS_PATH,
} from "@/lib/browsePaths";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback, playlistPath } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

type PlaylistPreview = PlaylistListResponse["data"][number];

export interface RootPreviewData {
  genres: LibraryGenre[];
  artists: LibraryArtist[];
  playlists: PlaylistPreview[];
  songs: LibrarySong[];
}

function PanelSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      <Skeleton className="h-14 w-56 rounded-lg" />
      <Skeleton className="h-4 w-72 rounded" />
      <div className="mt-10 space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
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
      <h2 className="text-5xl font-extrabold tracking-tighter leading-none text-white md:text-6xl">
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

function ArtworkPreview({ song }: { song: LibrarySong | null }) {
  const [displaySong, setDisplaySong] = useState<LibrarySong | null>(null);
  const [opacity, setOpacity] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!song) {
      setOpacity(0);
      timerRef.current = setTimeout(() => setDisplaySong(null), 300);
      return;
    }
    setOpacity(0);
    timerRef.current = setTimeout(() => {
      setDisplaySong(song);
      setOpacity(1);
    }, 120);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [song?.id]);

  return (
    <div className="hidden w-52 shrink-0 xl:block">
      <div className="sticky top-24">
        <div
          className="aspect-square w-full overflow-hidden rounded-xl shadow-2xl"
          style={{
            opacity,
            transform: `scale(${opacity === 1 ? 1 : 0.96})`,
            transition: "opacity 300ms ease, transform 300ms ease",
          }}
        >
          {displaySong?.artworkUrl ? (
            <img src={displaySong.artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: coverFallback(displaySong?.title ?? "") }}
            />
          )}
        </div>
        {displaySong && (
          <div className="mt-4 space-y-0.5" style={{ opacity, transition: "opacity 300ms ease" }}>
            <p className="text-sm font-semibold leading-tight text-white">{displaySong.title}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{displaySong.uploader.displayName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TracksWithPreview({ songs }: { songs: LibrarySong[] }) {
  const [hoveredSong, setHoveredSong] = useState<LibrarySong | null>(null);
  const { playTrack, currentTrack, togglePlay } = useAudioPlayer();

  function handlePlay(song: LibrarySong) {
    if (currentTrack?.id === song.id) {
      togglePlay();
      return;
    }
    const queue = songs.map((s) => librarySongToQueueTrack(s));
    playTrack(librarySongToQueueTrack(song), queue, { sourceContext: "library" }, {
      segmentLabel: "Library",
    });
  }

  return (
    <div className="flex gap-10">
      <div className="min-w-0 flex-1">
        {songs.map((song) => (
          <div
            key={song.id}
            onMouseEnter={() => setHoveredSong(song)}
            onMouseLeave={() => setHoveredSong(null)}
          >
            <LibraryTrackRow
              song={song}
              onPlay={() => handlePlay(song)}
              queueTrack={librarySongToQueueTrack(song)}
            />
          </div>
        ))}
      </div>
      <ArtworkPreview song={hoveredSong} />
    </div>
  );
}

function SongPreviewChip({ song, queue }: { song: LibrarySong; queue: LibrarySong[] }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudioPlayer();
  const isActive = currentTrack?.id === song.id;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isActive) {
      togglePlay();
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
      onClick={handleClick}
      className="group/chip flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-xs transition-colors hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-sm">
        {song.artworkUrl ? (
          <img src={song.artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: coverFallback(song.title) }} />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/chip:opacity-100">
          {isActive && isPlaying ? (
            <Pause size={8} className="text-white" fill="currentColor" />
          ) : (
            <Play size={8} className="ml-px text-white" fill="currentColor" />
          )}
        </div>
      </div>
      <span className="max-w-[140px] truncate text-white/60 transition-colors group-hover/chip:text-white/90">
        {song.title}
      </span>
      <span className="shrink-0 text-white/25 transition-colors group-hover/chip:text-white/40">
        {song.uploader.displayName}
      </span>
    </button>
  );
}

function GenrePreviewChip({ genre }: { genre: LibraryGenre }) {
  return (
    <Link
      to={genrePath(genre.slug)}
      onClick={(e) => e.stopPropagation()}
      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90"
    >
      {genre.name}
    </Link>
  );
}

function ArtistPreviewChip({ artist }: { artist: LibraryArtist }) {
  return (
    <Link
      to={artistPath(artist.username)}
      onClick={(e) => e.stopPropagation()}
      className="group/chip flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-xs transition-colors hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full">
        {artist.avatarUrl ? (
          <img src={artist.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: coverFallback(artist.displayName) }} />
        )}
      </div>
      <span className="max-w-[140px] truncate text-white/60 transition-colors group-hover/chip:text-white/90">
        {artist.displayName}
      </span>
    </Link>
  );
}

function PlaylistPreviewChip({ playlist }: { playlist: PlaylistPreview }) {
  return (
    <Link
      to={playlistPath({ id: playlist.id, href: playlist.href })}
      onClick={(e) => e.stopPropagation()}
      className="group/chip flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-xs transition-colors hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="h-5 w-5 shrink-0 overflow-hidden rounded-sm">
        {playlist.coverArtUrl ? (
          <img src={playlist.coverArtUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: coverFallback(playlist.title) }} />
        )}
      </div>
      <span className="max-w-[140px] truncate text-white/60 transition-colors group-hover/chip:text-white/90">
        {playlist.title}
      </span>
    </Link>
  );
}

const SECTION_PATHS = {
  Songs: SONGS_PATH,
  Genres: GENRES_PATH,
  Artists: ARTISTS_PATH,
  Playlists: PLAYLISTS_PATH,
} as const;

export function RootPanel({
  genreCount,
  artistCount,
  playlistCount,
  songCount,
  previews,
}: {
  genreCount: number;
  artistCount: number;
  playlistCount: number;
  songCount: number;
  previews: RootPreviewData;
}) {
  const entries = [
    {
      label: "Songs" as const,
      description: "Every public recording in the catalog.",
      count: songCount,
      chips: previews.songs.map((s) => <SongPreviewChip key={s.id} song={s} queue={previews.songs} />),
    },
    {
      label: "Genres" as const,
      description: "All sounds, organized by texture and tradition.",
      count: genreCount,
      chips: previews.genres.map((g) => <GenrePreviewChip key={g.slug} genre={g} />),
    },
    {
      label: "Artists" as const,
      description: "The voices and makers behind the catalog.",
      count: artistCount,
      chips: previews.artists.map((a) => <ArtistPreviewChip key={a.id} artist={a} />),
    },
    {
      label: "Playlists" as const,
      description: "Curated collections from the community.",
      count: playlistCount,
      chips: previews.playlists.map((p) => <PlaylistPreviewChip key={p.id} playlist={p} />),
    },
  ];

  return (
    <div className="py-2">
      {entries.map((entry, i) => (
        <div key={entry.label} className={i > 0 ? "border-t border-white/[0.06]" : ""}>
          <Link to={SECTION_PATHS[entry.label]} className="group block w-full text-left">
            <div className="flex items-start justify-between gap-6 pt-10 pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-[clamp(2.8rem,6vw,4.5rem)] font-extrabold leading-none tracking-tighter text-white transition-colors group-hover:text-[var(--color-brand)]">
                  {entry.label}
                </p>
                <p className="mt-3 max-w-sm text-sm text-[var(--color-text-subtle)]">{entry.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 pt-2">
                <span className="tabular-nums text-3xl font-bold text-white/20 transition-colors group-hover:text-white/40">
                  {entry.count}
                </span>
                <ChevronRight
                  size={22}
                  className="text-white/20 transition-all group-hover:translate-x-1 group-hover:text-white/70"
                />
              </div>
            </div>
          </Link>
          {entry.chips.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-8">{entry.chips}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function GenresPanel() {
  const { data, isLoading } = useLibraryGenres();
  const genres = data?.data ? data.data.filter((g) => g.songCount > 0) : EMPTY_LIBRARY_GENRES;

  if (isLoading) return <PanelSkeleton />;

  const byLetter = genres.reduce<Record<string, typeof genres>>((acc, g) => {
    const letter = g.name[0].toUpperCase();
    (acc[letter] ??= []).push(g);
    return acc;
  }, {});

  return (
    <div>
      <PanelHeader label="Genres" count={genres.length} />
      <div className="mt-10 space-y-8">
        {Object.entries(byLetter)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([letter, items]) => (
            <div key={letter}>
              <div className="mb-4 flex items-center gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25">
                  {letter}
                </span>
                <div className="flex-1 border-t border-white/[0.05]" />
              </div>
              {items.map((genre) => (
                <Link
                  key={genre.slug}
                  to={genrePath(genre.slug)}
                  className="group flex w-full items-center justify-between gap-4 py-3 text-left"
                >
                  <span className="text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold leading-none tracking-tighter text-[var(--color-text-muted)] transition-colors group-hover:text-white">
                    {genre.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular-nums text-2xl font-bold text-white/20 transition-colors group-hover:text-white/40">
                      {genre.songCount}
                    </span>
                    <ChevronRight
                      size={20}
                      className="text-white/20 transition-all group-hover:translate-x-1 group-hover:text-white/70"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

export function GenreDetailPanel({ slug, name }: { slug: string; name: string }) {
  const { data, isLoading } = useLibrarySongs(slug);
  const songs = data?.data ?? EMPTY_LIBRARY_SONGS;

  const curatorNote = useMemo(() => {
    if (!songs.length) return null;
    const artists = [...new Set(songs.map((s) => s.uploader.displayName))];
    const topArtists = artists.slice(0, 3).join(", ");
    const suffix = artists.length > 3 ? ` and ${artists.length - 3} more` : "";
    return `${songs.length} recording${songs.length !== 1 ? "s" : ""} · artists include ${topArtists}${suffix}`;
  }, [songs]);

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label={name} count={songs.length} unit="recording" />
      {curatorNote && (
        <p className="mt-3 max-w-2xl text-sm italic leading-relaxed text-[var(--color-text-muted)]">
          {curatorNote}
        </p>
      )}
      <div className="mt-10">
        {songs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-subtle)]">No recordings in this genre yet.</p>
        ) : (
          <TracksWithPreview songs={songs} />
        )}
      </div>
    </div>
  );
}

export function ArtistsPanel() {
  const [genreSlug, setGenreSlug] = useState<string | null>(null);
  const { data: genresData } = useLibraryGenres();
  const genres = genresData?.data ? genresData.data.filter((g) => g.songCount > 0) : EMPTY_LIBRARY_GENRES;
  const { data, isLoading } = useLibraryArtists();
  const artists = filterArtistsByGenre(data?.data ?? EMPTY_LIBRARY_ARTISTS, genreSlug);

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label="Artists" count={artists.length} />
      <LibraryGenreFilter genres={genres} value={genreSlug} onChange={setGenreSlug} />
      {artists.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--color-text-subtle)]">No artists match this genre.</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              to={artistPath(artist.username)}
              className="group rounded-xl p-3 text-left transition-colors hover:bg-white/5"
            >
              <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg">
                {artist.avatarUrl ? (
                  <img
                    src={artist.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{ background: coverFallback(artist.displayName) }}
                  />
                )}
              </div>
              <p className="truncate font-semibold text-white">{artist.displayName}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                {artist.songCount} recording{artist.songCount !== 1 ? "s" : ""}
                {artist.genres.length > 0 ? ` · ${artist.genres[0].name}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ArtistDetailPanel({
  artistId,
  artistName,
  artistGenres,
  yearRange,
}: {
  artistId: string;
  artistName: string;
  artistGenres: { name: string }[];
  yearRange: { earliest: number | null; latest: number | null };
}) {
  const { data, isLoading } = useLibrarySongs();
  const songs = (data?.data ?? EMPTY_LIBRARY_SONGS).filter((s) => s.uploaderId === artistId);

  const curatorNote = useMemo(() => {
    if (!songs.length && !artistGenres.length) return null;
    const parts: string[] = [];
    if (songs.length) parts.push(`${songs.length} recording${songs.length !== 1 ? "s" : ""}`);
    if (artistGenres.length) parts.push(artistGenres.map((g) => g.name).join(", "));
    if (yearRange.earliest && yearRange.latest) {
      parts.push(
        yearRange.earliest === yearRange.latest
          ? `${yearRange.earliest}`
          : `${yearRange.earliest}–${yearRange.latest}`,
      );
    }
    return parts.join(" · ");
  }, [songs, artistGenres, yearRange]);

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label={artistName} count={songs.length} unit="recording" />
      {curatorNote && (
        <p className="mt-3 max-w-2xl text-sm italic leading-relaxed text-[var(--color-text-muted)]">
          {curatorNote}
        </p>
      )}
      <div className="mt-10">
        {songs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-subtle)]">No recordings found.</p>
        ) : (
          <TracksWithPreview songs={songs} />
        )}
      </div>
    </div>
  );
}

export function PlaylistsPanel() {
  const [genreSlug, setGenreSlug] = useState<string | null>(null);
  const { data: genresData } = useLibraryGenres();
  const genres = genresData?.data ? genresData.data.filter((g) => g.songCount > 0) : EMPTY_LIBRARY_GENRES;
  const { data, isLoading } = useLibraryPlaylists();
  const playlists = filterPlaylistsByGenre(data?.data ?? EMPTY_PLAYLISTS, genreSlug);

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label="Playlists" count={playlists.length} />
      <LibraryGenreFilter genres={genres} value={genreSlug} onChange={setGenreSlug} />
      {playlists.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--color-text-subtle)]">No playlists match this genre.</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              to={playlistPath({ id: playlist.id, href: playlist.href })}
              className="group block"
            >
              <div className="mb-3 aspect-square overflow-hidden rounded-lg">
                {playlist.coverArtUrl ? (
                  <img
                    src={playlist.coverArtUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{ background: coverFallback(playlist.title) }}
                  />
                )}
              </div>
              <p className="truncate text-sm font-semibold text-white">{playlist.title}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                {playlist.owner.displayName}
                {playlist.itemCount > 0 ? ` · ${playlist.itemCount} tracks` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SongsPanel() {
  const [genreSlug, setGenreSlug] = useState<string | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SongSortKey>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: genresData } = useLibraryGenres();
  const genres = genresData?.data ? genresData.data.filter((g) => g.songCount > 0) : EMPTY_LIBRARY_GENRES;
  const { data: artistsData } = useLibraryArtists();
  const artists = artistsData?.data ?? EMPTY_LIBRARY_ARTISTS;
  const suggestedArtists = useMemo(() => topArtistsBySongCount(artists, 4), [artists]);
  const { data, isLoading } = useLibrarySongs(genreSlug);

  const songs = useMemo(() => {
    const filtered = filterSongsByArtist(data?.data ?? EMPTY_LIBRARY_SONGS, artistId);
    return sortLibrarySongs(filtered, sortKey, sortDirection);
  }, [data?.data, artistId, sortKey, sortDirection]);

  if (isLoading) return <PanelSkeleton />;

  const curatorNote =
    songs.length > 0
      ? `${songs.length} recording${songs.length !== 1 ? "s" : ""} from ${new Set(songs.map((s) => s.uploaderId)).size} artists`
      : null;

  return (
    <div>
      <PanelHeader label="Songs" count={songs.length} unit="recording" />
      {curatorNote && (
        <p className="mt-3 max-w-2xl text-sm italic leading-relaxed text-[var(--color-text-muted)]">
          {curatorNote}
        </p>
      )}
      <LibraryGenreFilter genres={genres} value={genreSlug} onChange={setGenreSlug} />
      <LibraryArtistFilter
        artists={artists}
        suggestedArtists={suggestedArtists}
        selectedArtistId={artistId}
        onSelect={setArtistId}
      />
      <LibrarySongSortBar
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortKeyChange={setSortKey}
        onSortDirectionChange={setSortDirection}
      />
      <div className="mt-10">
        {songs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-subtle)]">No recordings match these filters.</p>
        ) : (
          <TracksWithPreview songs={songs} />
        )}
      </div>
    </div>
  );
}
