import type { LibraryArtist, LibraryGenre, LibrarySong, PlaylistListResponse } from "@playlisted/client-sdk";
import { ChevronRight, Pause, Play } from "lucide-react";

type PlaylistPreview = PlaylistListResponse["data"][number];
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/feedback/Skeleton";
import { LibraryTrackRow } from "@/components/library/LibraryTrackRow";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import {
  useLibraryArtists,
  useLibraryGenres,
  useLibraryPlaylists,
  useLibrarySongs,
} from "@/hooks/useLibrary";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback, playlistPath } from "@/lib/routes";

// ─── Panel descriptor types ───────────────────────────────────────────────────

type PanelDescriptor =
  | { type: "root" }
  | { type: "genres" }
  | { type: "genre"; slug: string; name: string }
  | { type: "artists" }
  | {
      type: "artist";
      id: string;
      displayName: string;
      username: string;
      genres: { name: string }[];
      yearRange: { earliest: number | null; latest: number | null };
    }
  | { type: "playlists" }
  | { type: "songs" };

function labelFor(panel: PanelDescriptor): string {
  switch (panel.type) {
    case "root": return "Library";
    case "genres": return "Genres";
    case "genre": return panel.name;
    case "artists": return "Artists";
    case "artist": return panel.displayName;
    case "playlists": return "Playlists";
    case "songs": return "Songs";
  }
}

interface RootPreviewData {
  genres: LibraryGenre[];
  artists: LibraryArtist[];
  playlists: PlaylistPreview[];
  songs: LibrarySong[];
}

// ─── Shared micro-components ──────────────────────────────────────────────────

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

function PanelHeader({
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

// ─── Artwork preview sidebar ──────────────────────────────────────────────────

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
            <img
              src={displaySong.artworkUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: coverFallback(displaySong?.title ?? "") }}
            />
          )}
        </div>
        {displaySong && (
          <div
            className="mt-4 space-y-0.5"
            style={{
              opacity,
              transition: "opacity 300ms ease",
            }}
          >
            <p className="text-sm font-semibold leading-tight text-white">{displaySong.title}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {displaySong.uploader.displayName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Track list with artwork preview ─────────────────────────────────────────

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

// ─── Root panel preview chips ─────────────────────────────────────────────────

function SongPreviewChip({ song, queue }: { song: LibrarySong; queue: LibrarySong[] }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudioPlayer();
  const isActive = currentTrack?.id === song.id;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isActive) { togglePlay(); return; }
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

function GenrePreviewChip({
  genre,
  push,
}: {
  genre: LibraryGenre;
  push: (p: PanelDescriptor) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); push({ type: "genre", slug: genre.slug, name: genre.name }); }}
      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90"
    >
      {genre.name}
    </button>
  );
}

function ArtistPreviewChip({
  artist,
  push,
}: {
  artist: LibraryArtist;
  push: (p: PanelDescriptor) => void;
}) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    push({ type: "artist", id: artist.id, displayName: artist.displayName, username: artist.username, genres: artist.genres, yearRange: artist.yearRange });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
    </button>
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

// ─── Root panel ───────────────────────────────────────────────────────────────

function RootPanel({
  push,
  genreCount,
  artistCount,
  playlistCount,
  songCount,
  previews,
}: {
  push: (p: PanelDescriptor) => void;
  genreCount: number;
  artistCount: number;
  playlistCount: number;
  songCount: number;
  previews: RootPreviewData;
}) {
  const entries = [
    {
      label: "Songs",
      description: "Every public recording in the catalog.",
      count: songCount,
      panel: { type: "songs" as const },
      chips: previews.songs.map((s) => (
        <SongPreviewChip key={s.id} song={s} queue={previews.songs} />
      )),
    },
    {
      label: "Genres",
      description: "All sounds, organized by texture and tradition.",
      count: genreCount,
      panel: { type: "genres" as const },
      chips: previews.genres.map((g) => (
        <GenrePreviewChip key={g.slug} genre={g} push={push} />
      )),
    },
    {
      label: "Artists",
      description: "The voices and makers behind the catalog.",
      count: artistCount,
      panel: { type: "artists" as const },
      chips: previews.artists.map((a) => (
        <ArtistPreviewChip key={a.id} artist={a} push={push} />
      )),
    },
    {
      label: "Playlists",
      description: "Curated collections from the community.",
      count: playlistCount,
      panel: { type: "playlists" as const },
      chips: previews.playlists.map((p) => (
        <PlaylistPreviewChip key={p.id} playlist={p} />
      )),
    },
  ];

  return (
    <div className="py-2">
      {entries.map((entry, i) => (
        <div
          key={entry.label}
          className={i > 0 ? "border-t border-white/[0.06]" : ""}
        >
          {/* Header row — clicking this navigates into the section */}
          <button
            type="button"
            onClick={() => push(entry.panel)}
            className="group w-full text-left"
          >
            <div className="flex items-start justify-between gap-6 pt-10 pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-[clamp(2.8rem,6vw,4.5rem)] font-extrabold leading-none tracking-tighter text-white transition-colors group-hover:text-[var(--color-brand)]">
                  {entry.label}
                </p>
                <p className="mt-3 max-w-sm text-sm text-[var(--color-text-subtle)]">
                  {entry.description}
                </p>
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
          </button>

          {/* Preview chips — separate row, own click handlers */}
          {entry.chips.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-8">
              {entry.chips}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Genres panel ─────────────────────────────────────────────────────────────

function GenresPanel({ push }: { push: (p: PanelDescriptor) => void }) {
  const { data, isLoading } = useLibraryGenres();
  const genres = (data?.data ?? []).filter((g) => g.songCount > 0);

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
                <button
                  key={genre.slug}
                  type="button"
                  onClick={() => push({ type: "genre", slug: genre.slug, name: genre.name })}
                  className="group flex w-full items-center justify-between gap-4 py-3 text-left"
                >
                  <span className="text-xl font-semibold tracking-tight text-[var(--color-text-muted)] transition-colors group-hover:text-white">
                    {genre.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular-nums text-sm text-white/20">{genre.songCount}</span>
                    <ChevronRight
                      size={15}
                      className="text-white/15 transition group-hover:text-white/50"
                    />
                  </div>
                </button>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Genre detail panel ───────────────────────────────────────────────────────

function GenreDetailPanel({ slug, name }: { slug: string; name: string }) {
  const { data, isLoading } = useLibrarySongs(slug);
  const songs = data?.data ?? [];

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

// ─── Artists panel ────────────────────────────────────────────────────────────

function ArtistsPanel({ push }: { push: (p: PanelDescriptor) => void }) {
  const { data, isLoading } = useLibraryArtists();
  const artists = data?.data ?? [];

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label="Artists" count={artists.length} />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {artists.map((artist) => (
          <button
            key={artist.id}
            type="button"
            onClick={() =>
              push({
                type: "artist",
                id: artist.id,
                displayName: artist.displayName,
                username: artist.username,
                genres: artist.genres,
                yearRange: artist.yearRange,
              })
            }
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
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Artist detail panel ──────────────────────────────────────────────────────

function ArtistDetailPanel({
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
  const songs = (data?.data ?? []).filter((s) => s.uploaderId === artistId);

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

// ─── Playlists panel ──────────────────────────────────────────────────────────

function PlaylistsPanel() {
  const { data, isLoading } = useLibraryPlaylists();
  const playlists = data?.data ?? [];

  if (isLoading) return <PanelSkeleton />;

  return (
    <div>
      <PanelHeader label="Playlists" count={playlists.length} />
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
    </div>
  );
}

// ─── Songs panel ─────────────────────────────────────────────────────────────

function SongsPanel() {
  const { data, isLoading } = useLibrarySongs();
  const songs = data?.data ?? [];

  if (isLoading) return <PanelSkeleton />;

  const curatorNote = songs.length > 0
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
      <div className="mt-10">
        {songs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-subtle)]">No recordings yet.</p>
        ) : (
          <TracksWithPreview songs={songs} />
        )}
      </div>
    </div>
  );
}

// ─── Animated panel wrapper ───────────────────────────────────────────────────

function AnimatedPanel({
  children,
  direction,
}: {
  children: ReactNode;
  direction: "push" | "pop";
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  return (
    <div
      style={{
        opacity: entered ? 1 : 0,
        transform: entered
          ? "translateX(0)"
          : `translateX(${direction === "push" ? "18px" : "-18px"})`,
        transition: "opacity 280ms ease-out, transform 280ms ease-out",
      }}
    >
      {children}
    </div>
  );
}

// ─── Breadcrumb rail ──────────────────────────────────────────────────────────

function BreadcrumbRail({
  stack,
  popTo,
}: {
  stack: PanelDescriptor[];
  popTo: (i: number) => void;
}) {
  if (stack.length <= 1) return null;

  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs">
      {stack.map((panel, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-white/15">/</span>}
          <button
            type="button"
            onClick={() => popTo(i)}
            disabled={i === stack.length - 1}
            className={[
              "transition-colors",
              i === stack.length - 1
                ? "cursor-default font-medium text-white"
                : "text-[var(--color-text-subtle)] hover:text-white",
            ].join(" ")}
          >
            {labelFor(panel)}
          </button>
        </span>
      ))}
    </nav>
  );
}

// ─── Peek strips ─────────────────────────────────────────────────────────────

function PeekStrips({
  stack,
  popTo,
}: {
  stack: PanelDescriptor[];
  popTo: (i: number) => void;
}) {
  return (
    <div className="flex shrink-0 select-none">
      {stack.map((panel, i) => (
        <button
          key={i}
          type="button"
          title={`Back to ${labelFor(panel)}`}
          onClick={() => popTo(i)}
          className="group flex w-10 items-center justify-center border-r border-white/[0.07] bg-transparent transition-colors hover:bg-white/[0.04]"
        >
          <span
            className="max-h-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.22em] text-white/20 transition-colors group-hover:text-white/45"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {labelFor(panel)}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Panel renderer ───────────────────────────────────────────────────────────

function renderPanel(
  panel: PanelDescriptor,
  push: (p: PanelDescriptor) => void,
  counts: { genreCount: number; artistCount: number; playlistCount: number; songCount: number },
  previews: RootPreviewData,
): ReactNode {
  switch (panel.type) {
    case "root":
      return <RootPanel push={push} {...counts} previews={previews} />;
    case "genres":
      return <GenresPanel push={push} />;
    case "genre":
      return <GenreDetailPanel slug={panel.slug} name={panel.name} />;
    case "artists":
      return <ArtistsPanel push={push} />;
    case "artist":
      return (
        <ArtistDetailPanel
          artistId={panel.id}
          artistName={panel.displayName}
          artistGenres={panel.genres}
          yearRange={panel.yearRange}
        />
      );
    case "playlists":
      return <PlaylistsPanel />;
    case "songs":
      return <SongsPanel />;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function SpatialLibraryBrowser() {
  const [stack, setStack] = useState<PanelDescriptor[]>([{ type: "root" }]);
  const [direction, setDirection] = useState<"push" | "pop">("push");

  const genresQuery = useLibraryGenres();
  const artistsQuery = useLibraryArtists();
  const playlistsQuery = useLibraryPlaylists();
  const songsQuery = useLibrarySongs();

  const currentPanel = stack[stack.length - 1];
  const peekStack = stack.slice(0, -1);

  function push(panel: PanelDescriptor) {
    setDirection("push");
    setStack((prev) => [...prev, panel]);
  }

  function popTo(index: number) {
    setDirection("pop");
    setStack((prev) => prev.slice(0, index + 1));
  }

  const allGenres = (genresQuery.data?.data ?? []).filter((g) => g.songCount > 0);
  const allArtists = artistsQuery.data?.data ?? [];
  const allPlaylists = playlistsQuery.data?.data ?? [];
  const allSongs = songsQuery.data?.data ?? [];

  const counts = {
    genreCount: allGenres.length,
    artistCount: allArtists.length,
    playlistCount: allPlaylists.length,
    songCount: allSongs.length,
  };

  const previews = useMemo<RootPreviewData>(() => ({
    genres: sample(allGenres, 3),
    artists: sample(allArtists, 3),
    playlists: sample(allPlaylists, 3),
    songs: sample(allSongs, 3),
  }), [genresQuery.data, artistsQuery.data, playlistsQuery.data, songsQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-5xl">
      <BreadcrumbRail stack={stack} popTo={popTo} />

      <div className={["flex min-h-[72vh]", stack.length > 1 ? "mt-5" : "mt-0"].join(" ")}>
        {peekStack.length > 0 && (
          <PeekStrips stack={peekStack} popTo={popTo} />
        )}

        <div
          className={[
            "min-w-0 flex-1 overflow-hidden",
            peekStack.length > 0 ? "pl-8" : "",
          ].join(" ")}
        >
          <AnimatedPanel key={JSON.stringify(currentPanel)} direction={direction}>
            {renderPanel(currentPanel, push, counts, previews)}
          </AnimatedPanel>
        </div>
      </div>
    </div>
  );
}
