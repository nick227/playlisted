import type { LibraryArtist, LibrarySong, PlaylistSummary } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { artistPath } from "@/lib/browsePaths";

import { MuseumLyricSnippet } from "./MuseumLyricSnippet";
import { MuseumPlaylistCard } from "./MuseumPlaylistCard";
import {
  MUSEUM_COL_LEFT,
  MUSEUM_COL_LYRIC,
  MUSEUM_COL_PEERS,
  MUSEUM_COL_PLAYLIST,
  MUSEUM_COL_TRACKS,
  MUSEUM_COL_FULL,
  MUSEUM_EXHIBIT_RADIUS,
  MUSEUM_GRID,
  MuseumArtBackdrop,
  MuseumExhibitFrame,
  MuseumGenrePills,
  MuseumPanel,
  MuseumSectionHeader,
  MuseumTrackPanel,
} from "./museumUi";

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
    <section className={`relative min-w-0 overflow-hidden ${MUSEUM_EXHIBIT_RADIUS}`}>
      <MuseumArtBackdrop imageUrl={backdropUrl} title={artist.displayName} intensity="bold" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--color-canvas)]/15 via-[var(--color-canvas)]/72 to-[var(--color-canvas)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--color-brand)]/10 to-transparent" />

      <MuseumExhibitFrame className="relative">
        <div className={MUSEUM_GRID}>
          <div className={`${MUSEUM_COL_LEFT} hidden md:block`}>
            <MuseumSectionHeader label="Featured artist" />
          </div>
          <div className={`${MUSEUM_COL_TRACKS} hidden md:block`}>
            <MuseumSectionHeader label="Recordings" />
          </div>
          <div className={`${MUSEUM_COL_PLAYLIST} hidden md:block`}>
            <MuseumSectionHeader label="Playlist" />
          </div>

          <div className={MUSEUM_COL_LEFT}>
            <div className="relative w-full max-w-[12rem]">
              <div className="absolute -inset-2 rounded-full bg-[var(--color-brand)]/12 blur-xl" aria-hidden />
              <SmartArtistCard
                id={artist.id}
                username={artist.username}
                displayName={artist.displayName}
                avatarUrl={artist.avatarUrl}
                shape="circle"
                className="relative w-full"
                playbackOrigin={`library:showcase:${artist.id}`}
              />
            </div>
            <Link
              to={artistPath(artist.username)}
              className="mt-5 block text-[clamp(1.75rem,4vw,2.65rem)] font-extralight leading-[0.98] tracking-tight text-white transition hover:text-[var(--color-brand)]"
            >
              {artist.displayName}
            </Link>
            <MuseumGenrePills labels={genreLabels} />
          </div>

          <div className={MUSEUM_COL_TRACKS}>
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

          <div className={MUSEUM_COL_PLAYLIST}>
            {playlist ? (
              <MuseumPlaylistCard playlist={playlist} className="w-full" elevated />
            ) : (
              <MuseumPanel padding="roomy" className="flex aspect-square items-center justify-center text-sm text-white/40">
                No playlists yet.
              </MuseumPanel>
            )}
          </div>

          {lyricSong ? (
            <div className={MUSEUM_COL_LYRIC}>
              <MuseumSectionHeader label="Lyrics" />
              <MuseumLyricSnippet song={lyricSong} variant="showcase" />
            </div>
          ) : null}

          {peerArtists.length > 0 ? (
            <div className={lyricSong ? MUSEUM_COL_PEERS : MUSEUM_COL_FULL}>
              <MuseumSectionHeader label="More artists" />
              <MuseumPanel padding="roomy" className="bg-black/15">
                <div className="grid grid-cols-3 gap-4">
                  {peerArtists.map((peer) => (
                    <SmartArtistCard
                      key={peer.id}
                      id={peer.id}
                      username={peer.username}
                      displayName={peer.displayName}
                      avatarUrl={peer.avatarUrl}
                      shape="circle"
                      className="min-w-0 w-full"
                      playbackOrigin={`library:showcase-peer:${peer.id}`}
                    />
                  ))}
                </div>
              </MuseumPanel>
            </div>
          ) : null}
        </div>
      </MuseumExhibitFrame>
    </section>
  );
}
