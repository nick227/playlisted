import type {
  LibraryArtist,
  LibrarySong,
  PlaylistSummary,
} from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { artistPath } from "@/lib/browsePaths";

import { MuseumLyricSnippet } from "./MuseumLyricSnippet";
import { MuseumPlaylistCard } from "./MuseumPlaylistCard";
import {
  MuseumBankSection,
  MuseumGenrePills,
  MuseumPanel,
  MuseumScrollRow,
  MuseumTrackPanel,
} from "./museumUi";

export interface MuseumShowcaseProps {
  artist: LibraryArtist;
  songs: LibrarySong[];
  playlist?: PlaylistSummary;
  lyricSong?: LibrarySong;
  peers: LibraryArtist[];
}

export function MuseumShowcase({
  artist,
  songs,
  playlist,
  lyricSong,
  peers,
}: MuseumShowcaseProps) {
  const featuredSongs = songs.slice(0, 3);
  const peerArtists = peers.filter((peer) => peer.id !== artist.id).slice(0, 8);
  const genreLabels = artist.genres.map((genre) => genre.name).slice(0, 3);

  return (
    <MuseumBankSection
      label="Spotlight"
      href={artistPath(artist.username)}
      hrefLabel="Profile"
      type="songSpotlight"
    >
      <MuseumPanel padding="roomy" className="">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(11rem,13rem)] lg:items-start">
          <div className="min-w-0">
            <div className="w-32 md:w-44 lg:w-full">
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
              className="mt-3 block text-[clamp(1.8rem,4vw,2.4rem)] font-semibold leading-none text-white transition hover:text-white/80"
            >
              {artist.displayName}
            </Link>
            <MuseumGenrePills labels={genreLabels} />
          </div>

          {featuredSongs.length > 0 ? (
            <MuseumTrackPanel>
              <LibraryTrackList songs={featuredSongs} />
            </MuseumTrackPanel>
          ) : (
            <MuseumPanel
              padding="roomy"
              className="flex min-h-36 items-center text-sm text-white/40"
            >
              No recordings yet.
            </MuseumPanel>
          )}

          <div className="min-w-0">
            {playlist ? (
              <MuseumPlaylistCard
                playlist={playlist}
                className="w-full max-w-[13rem]"
                aspect="portrait"
                elevated
              />
            ) : (
              <MuseumPanel
                padding="roomy"
                className="flex aspect-[3/4] items-center justify-center text-sm text-white/40"
              >
                No playlists yet.
              </MuseumPanel>
            )}
          </div>

          {lyricSong || peerArtists.length > 0 ? (
            <div className="min-w-0 lg:col-span-3">
              {lyricSong ? (
                <MuseumLyricSnippet song={lyricSong} variant="showcase" />
              ) : null}

              {peerArtists.length > 0 ? (
                <div className={lyricSong ? "mt-4" : ""}>
                  <MuseumScrollRow variant="circle">
                    {peerArtists.map((peer) => (
                      <div key={peer.id} className="min-w-0">
                        <SmartArtistCard
                          id={peer.id}
                          username={peer.username}
                          displayName={peer.displayName}
                          avatarUrl={peer.avatarUrl}
                          shape="circle"
                          className="min-w-0 w-full"
                          playbackOrigin={`library:showcase-peer:${peer.id}`}
                        />
                      </div>
                    ))}
                  </MuseumScrollRow>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </MuseumPanel>
    </MuseumBankSection>
  );
}
