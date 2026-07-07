import type { LibraryArtist, LibrarySong, PlaylistSummary } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { artistPath } from "@/lib/browsePaths";

import { MuseumLyricSnippet } from "./MuseumLyricSnippet";
import { MuseumPlaylistCard } from "./MuseumPlaylistCard";
import { MuseumArtBackdrop, MuseumGenrePills, MuseumPanel, MuseumTrackPanel } from "./museumUi";

export interface MuseumShowcaseProps {
  artist: LibraryArtist;
  songs: LibrarySong[];
  playlist?: PlaylistSummary;
  lyricSong?: LibrarySong;
  peers: LibraryArtist[];
}

export function MuseumShowcase({ artist, songs, playlist, lyricSong, peers }: MuseumShowcaseProps) {
  const backdropUrl = songs[0]?.artworkUrl ?? artist.avatarUrl;
  const featuredSongs = songs.slice(0, 5);
  const peerArtists = peers.filter((peer) => peer.id !== artist.id).slice(0, 3);
  const genreLabels = artist.genres.map((genre) => genre.name).slice(0, 3);

  return (
    <section className="relative -mx-2 overflow-hidden rounded-[1.35rem] sm:-mx-4">
      <MuseumArtBackdrop imageUrl={backdropUrl} title={artist.displayName} intensity="bold" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--color-canvas)]/15 via-[var(--color-canvas)]/72 to-[var(--color-canvas)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--color-brand)]/10 to-transparent" />

      <div className="relative grid gap-8 p-5 md:grid-cols-12 md:gap-7 md:p-8 lg:p-10">
        <div className="md:col-span-4 lg:col-span-3">
          <div className="relative inline-block">
            <div className="absolute -inset-3 rounded-full bg-[var(--color-brand)]/15 blur-2xl" aria-hidden />
            <SmartArtistCard
              id={artist.id}
              username={artist.username}
              displayName={artist.displayName}
              avatarUrl={artist.avatarUrl}
              shape="circle"
              className="relative max-w-[13rem]"
              playbackOrigin={`library:showcase:${artist.id}`}
            />
          </div>
          <Link
            to={artistPath(artist.username)}
            className="mt-6 block text-[clamp(1.85rem,4.5vw,3rem)] font-extralight leading-[0.98] tracking-tight text-white transition hover:text-[var(--color-brand)]"
          >
            {artist.displayName}
          </Link>
          <MuseumGenrePills labels={genreLabels} />
        </div>

        <div className="md:col-span-5 lg:col-span-5">
          {featuredSongs.length > 0 ? (
            <MuseumTrackPanel>
              <LibraryTrackList songs={featuredSongs} />
            </MuseumTrackPanel>
          ) : (
            <MuseumPanel padding="roomy" className="flex min-h-44 items-center text-sm text-white/40">
              No recordings yet.
            </MuseumPanel>
          )}
        </div>

        <div className="md:col-span-3 lg:col-span-4">
          {playlist ? (
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-white/[0.03] blur-xl" aria-hidden />
              <MuseumPlaylistCard playlist={playlist} className="relative w-full" elevated />
            </div>
          ) : (
            <MuseumPanel padding="roomy" className="flex aspect-square items-center text-sm text-white/40">
              No playlists yet.
            </MuseumPanel>
          )}
        </div>

        {lyricSong ? (
          <div className="md:col-span-7 lg:col-span-8">
            <MuseumLyricSnippet song={lyricSong} variant="showcase" />
          </div>
        ) : null}

        {peerArtists.length > 0 ? (
          <div className={lyricSong ? "md:col-span-5 lg:col-span-4" : "md:col-span-12"}>
            <MuseumPanel padding="roomy" className="bg-black/15">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/38">More artists</p>
              <div className="grid grid-cols-3 gap-4">
                {peerArtists.map((peer) => (
                  <SmartArtistCard
                    key={peer.id}
                    id={peer.id}
                    username={peer.username}
                    displayName={peer.displayName}
                    avatarUrl={peer.avatarUrl}
                    shape="circle"
                    className="min-w-0"
                    playbackOrigin={`library:showcase-peer:${peer.id}`}
                  />
                ))}
              </div>
            </MuseumPanel>
          </div>
        ) : null}
      </div>
    </section>
  );
}
