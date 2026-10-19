import type { LibraryArtist, LibrarySong } from "@playlisted/client-sdk";
import { ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useLibraryArtists, useLibraryGenres, useLibrarySongs } from "@/hooks/useLibrary";
import { ARTISTS_PATH, genrePath } from "@/lib/browsePaths";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback, profilePath } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

const FEATURED_ARTIST_COUNT = 5;
const NEW_SONG_COUNT = 6;
const LEAD_TRACK_COUNT = 3;

type FeaturedArtist = LibraryArtist & {
  /** Newest first. */
  songs: LibrarySong[];
  portrait: string | null;
};

function publishedTime(song: LibrarySong) {
  return new Date(song.publishedAt ?? song.createdAt).getTime();
}

function useLandingContent() {
  const { data: artistData } = useLibraryArtists();
  const { data: songData } = useLibrarySongs(null);
  const { data: genreData } = useLibraryGenres({ minSongCount: 1 });

  return useMemo(() => {
    const songs = [...(songData?.data ?? [])].sort((a, b) => publishedTime(b) - publishedTime(a));
    const songsByArtist = new Map<string, LibrarySong[]>();
    for (const song of songs) {
      const list = songsByArtist.get(song.uploaderId) ?? [];
      list.push(song);
      songsByArtist.set(song.uploaderId, list);
    }

    const artists: FeaturedArtist[] = (artistData?.data ?? [])
      .map((artist) => {
        const artistSongs = songsByArtist.get(artist.id) ?? [];
        const portrait = artist.avatarUrl ?? artistSongs.find((song) => song.artworkUrl)?.artworkUrl ?? null;
        return { ...artist, songs: artistSongs, portrait };
      })
      .filter((artist) => artist.songs.length > 0)
      // Artists with imagery lead, then the biggest catalogs.
      .sort(
        (a, b) =>
          Number(Boolean(b.portrait)) - Number(Boolean(a.portrait)) ||
          b.songCount - a.songCount ||
          a.displayName.localeCompare(b.displayName),
      )
      .slice(0, FEATURED_ARTIST_COUNT);

    // One tile per cover image: catalogs often reuse a single cover across a release.
    const seenArtwork = new Set<string>();
    const newSongs = songs
      .filter((song) => {
        if (!song.artworkUrl || seenArtwork.has(song.artworkUrl)) return false;
        seenArtwork.add(song.artworkUrl);
        return true;
      })
      .slice(0, NEW_SONG_COUNT);

    return {
      artists,
      newSongs,
      genres: [...(genreData?.data ?? [])].sort((a, b) => b.songCount - a.songCount),
    };
  }, [artistData?.data, genreData?.data, songData?.data]);
}

function useSongPlayback(queue: LibrarySong[], segmentLabel: string) {
  const { playTrack, currentTrack, isPlaying, togglePlay, ensurePlayback } = useAudioPlayer();

  function play(song: LibrarySong) {
    if (currentTrack?.id === song.id) {
      if (isPlaying) togglePlay();
      else ensurePlayback();
      return;
    }
    playTrack(
      librarySongToQueueTrack(song),
      queue.map((item) => librarySongToQueueTrack(item)),
      { sourceContext: "library" },
      { segmentLabel },
    );
  }

  const isSongPlaying = (song: LibrarySong) => currentTrack?.id === song.id && isPlaying;
  const queuePlaying = queue.some(isSongPlaying);

  return { play, isSongPlaying, queuePlaying };
}

function Artwork({
  src,
  seed,
  className = "",
  initial = false,
}: {
  src: string | null | undefined;
  seed: string;
  className?: string;
  /** Show the seed's first letter on the fallback (artist portraits). */
  initial?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{ background: coverFallback(seed) }}
    >
      {initial ? (
        <span className="select-none text-[clamp(3rem,12vw,7rem)] font-bold uppercase text-white/25">
          {seed.slice(0, 1)}
        </span>
      ) : null}
    </div>
  );
}

function artistMeta(artist: FeaturedArtist) {
  return [`${artist.songCount} ${artist.songCount === 1 ? "song" : "songs"}`, artist.genres[0]?.name]
    .filter(Boolean)
    .join(" · ");
}

function PlayButton({
  playing,
  label,
  onClick,
  size = "md",
}: {
  playing: boolean;
  label: string;
  onClick: () => void;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "h-12 w-12" : "h-9 w-9 sm:h-10 sm:w-10";
  const icon = size === "lg" ? 18 : 16;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${playing ? "Pause" : "Play"} ${label}`}
      className={`relative z-10 flex ${box} shrink-0 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
    >
      {playing ? <Pause size={icon} fill="currentColor" /> : <Play size={icon} className="ml-0.5" fill="currentColor" />}
    </button>
  );
}

/** The lead card: big portrait, the artist's newest tracks, one-tap play. */
function LeadArtistCard({ artist }: { artist: FeaturedArtist }) {
  const { play, isSongPlaying, queuePlaying } = useSongPlayback(artist.songs, artist.displayName);
  const tracks = artist.songs.slice(0, LEAD_TRACK_COUNT);
  const latest = artist.songs[0];

  return (
    <article className="group relative isolate col-span-2 flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-2xl bg-[var(--color-surface)] md:row-span-2 md:min-h-0">
      <div className="absolute inset-0 -z-10">
        <Artwork
          src={artist.portrait}
          seed={artist.displayName}
          initial
          className="transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
      </div>

      <div className="flex flex-col gap-4 p-5 sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">Featured artist</p>
            <h2 className="mt-1 truncate text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <Link to={profilePath(artist.username)} className="after:absolute after:inset-0 hover:underline">
                {artist.displayName}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-white/70">{artistMeta(artist)}</p>
          </div>
          {latest ? (
            <PlayButton size="lg" playing={queuePlaying} label={artist.displayName} onClick={() => play(latest)} />
          ) : null}
        </div>

        {tracks.length > 0 ? (
          <ul className="relative z-10 grid gap-1 rounded-xl bg-black/35 p-1.5 backdrop-blur-md">
            {tracks.map((song) => {
              const playing = isSongPlaying(song);
              return (
                <li key={song.id}>
                  <button
                    type="button"
                    onClick={() => play(song)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
                    aria-label={`${playing ? "Pause" : "Play"} ${song.title}`}
                  >
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-[var(--color-surface-elevated)]">
                      <Artwork src={song.artworkUrl} seed={song.title} />
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm font-medium ${
                        playing ? "text-[var(--color-brand)]" : "text-white"
                      }`}
                    >
                      {song.title}
                    </span>
                    {playing ? (
                      <Pause size={14} className="shrink-0 text-[var(--color-brand)]" fill="currentColor" />
                    ) : (
                      <Play size={14} className="shrink-0 text-white/60" fill="currentColor" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function ArtistCard({ artist }: { artist: FeaturedArtist }) {
  const { play, queuePlaying } = useSongPlayback(artist.songs, artist.displayName);
  const latest = artist.songs[0];

  return (
    <article className="group relative isolate flex aspect-square flex-col justify-end overflow-hidden rounded-2xl bg-[var(--color-surface)]">
      <div className="absolute inset-0 -z-10">
        <Artwork
          src={artist.portrait}
          seed={artist.displayName}
          initial
          className="transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      </div>
      <div className="flex items-end justify-between gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white sm:text-lg">
            <Link to={profilePath(artist.username)} className="after:absolute after:inset-0 hover:underline">
              {artist.displayName}
            </Link>
          </h3>
          <p className="truncate text-xs text-white/65">{artistMeta(artist)}</p>
        </div>
        {latest ? <PlayButton playing={queuePlaying} label={artist.displayName} onClick={() => play(latest)} /> : null}
      </div>
    </article>
  );
}

function NewSongs({ songs }: { songs: LibrarySong[] }) {
  const { play, isSongPlaying } = useSongPlayback(songs, "New songs");
  if (songs.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-white">New songs</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {songs.map((song) => {
          const playing = isSongPlaying(song);
          return (
            <li key={song.id} className="min-w-0">
              <button
                type="button"
                onClick={() => play(song)}
                aria-label={`${playing ? "Pause" : "Play"} ${song.title} by ${song.uploader.displayName}`}
                className="group/song block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-[var(--color-surface-elevated)]">
                  <Artwork
                    src={song.artworkUrl}
                    seed={song.title}
                    className="transition-transform duration-500 group-hover/song:scale-105"
                  />
                  <span
                    className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg transition ${
                      playing ? "opacity-100" : "opacity-0 group-hover/song:opacity-100 group-focus-visible/song:opacity-100"
                    }`}
                    aria-hidden="true"
                  >
                    {playing ? (
                      <Pause size={15} fill="currentColor" />
                    ) : (
                      <Play size={15} className="ml-0.5" fill="currentColor" />
                    )}
                  </span>
                </span>
                <span
                  className={`mt-2 block truncate text-sm font-medium ${
                    playing ? "text-[var(--color-brand)]" : "text-white"
                  }`}
                >
                  {song.title}
                </span>
                <span className="block truncate text-xs text-[var(--color-text-muted)]">{song.uploader.displayName}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Landing section: featured artists, their newest songs, and genres — all from the live catalog. */
export function HomeIntro() {
  const { user } = useAuth();
  const { artists, newSongs, genres } = useLandingContent();
  const [lead, ...rest] = artists;
  const postHref = user ? "/studio/collections" : "/register?from=%2Fstudio%2Fcollections";

  return (
    <section aria-labelledby="home-intro-heading" className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="max-w-xl">
          <h1 id="home-intro-heading" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Artists on Playlisted
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Independent artists posting human-made and AI-assisted music. Press play on anyone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={ARTISTS_PATH}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white"
          >
            All artists <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link
            to={postHref}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)]"
          >
            Post your music <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {lead ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <LeadArtistCard artist={lead} />
          {rest.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      ) : null}

      <NewSongs songs={newSongs} />

      {genres.length > 0 ? (
        <nav aria-label="Genres" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-semibold text-white">Genres</span>
          {genres.map((genre) => (
            <Link
              key={genre.id}
              to={genrePath(genre.slug)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/85 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              {genre.name}
              <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{genre.songCount}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
