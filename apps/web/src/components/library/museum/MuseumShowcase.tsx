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

const MIN_PORTRAIT_ITEMS = 5;

export interface MuseumShowcaseProps {
  artist: LibraryArtist;
  songs: LibrarySong[];
  playlist?: PlaylistSummary;
  playlists: PlaylistSummary[];
  lyricSong?: LibrarySong;
  peers: LibraryArtist[];
}

export function MuseumShowcase({
  artist,
  songs,
  playlist,
  playlists,
  lyricSong,
  peers,
}: MuseumShowcaseProps) {
  const featuredSongs = songs.slice(0, 3);
  const peerArtists = peers.filter((peer) => peer.id !== artist.id).slice(0, 8);
  const portraitSeed = [artist, ...peerArtists];
  const portraitArtists = Array.from(
    { length: Math.max(MIN_PORTRAIT_ITEMS, portraitSeed.length) },
    (_, index) => portraitSeed[index % portraitSeed.length],
  );
  const playlistSeed = playlists.length > 0 ? playlists : playlist ? [playlist] : [];
  const portraitPlaylists = playlistSeed.length
    ? Array.from(
        { length: Math.max(MIN_PORTRAIT_ITEMS, playlistSeed.length) },
        (_, index) => playlistSeed[index % playlistSeed.length],
      )
    : [];

  return (
    <MuseumBankSection
      label="Library"
      type="songSpotlight"
    >
      <div className="mx-4 flex gap-2 text-sm">
            <Link
              to="/artists"
              className=""
            >
              Artists
            </Link>
            /
            <Link
              to="/songs"
              className=""
            >
              Songs
            </Link>
            /
            <Link
              to="/genres"
              className=""
            >
              Genres
            </Link>
            /
            <Link
              to="/playlists"
              className=""
            >
              Playlists
            </Link>
      </div>
      <MuseumPanel padding="roomy" className="">
        <div className="grid min-w-0 gap-8">
          <MuseumScrollRow variant="portrait">
            {portraitArtists.map((portraitArtist, index) => (
              <div key={`${portraitArtist.id}-${index}`} className="min-w-0">
                <SmartArtistCard
                  id={portraitArtist.id}
                  username={portraitArtist.username}
                  displayName={portraitArtist.displayName}
                  avatarUrl={portraitArtist.avatarUrl}
                  shape="rounded-sm"
                  className="relative w-full"
                  playbackOrigin={`library:showcase:${portraitArtist.id}`}
                  hideDetails
                />
                <Link
                  to={artistPath(portraitArtist.username)}
                  className="mt-4 block text-xl font-semibold leading-tight text-white transition hover:text-white/80"
                >
                  {portraitArtist.displayName}
                </Link>
                <MuseumGenrePills
                  labels={portraitArtist.genres.map((genre) => genre.name).slice(0, 3)}
                />
              </div>
            ))}
          </MuseumScrollRow>

          <div className="grid min-w-0 gap-8">
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

            {portraitPlaylists.length > 0 ? (
              <MuseumScrollRow variant="portrait">
                {portraitPlaylists.map((portraitPlaylist, index) => (
                  <MuseumPlaylistCard
                    key={`${portraitPlaylist.id}-${index}`}
                    playlist={portraitPlaylist}
                    className="min-w-0 w-full"
                    aspect="portrait"
                    elevated={index === 0}
                  />
                ))}
              </MuseumScrollRow>
            ) : (
              <div className="max-w-[13rem]">
                <MuseumPanel
                  padding="roomy"
                  className="flex aspect-[3/4] items-center justify-center text-sm text-white/40"
                >
                  No playlists yet.
                </MuseumPanel>
              </div>
            )}
          </div>

          {lyricSong || peerArtists.length > 0 ? (
            <div className="min-w-0">
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
