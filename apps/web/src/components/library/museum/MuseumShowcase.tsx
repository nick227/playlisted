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
  title?: string;
  artist: LibraryArtist;
  songs: LibrarySong[];
  playlist?: PlaylistSummary;
  playlists: PlaylistSummary[];
  lyricSong?: LibrarySong;
  peers: LibraryArtist[];
}

export function MuseumShowcase({
  title = "Spotlight",
  artist,
  songs,
  playlist,
  playlists,
  lyricSong,
  peers,
}: MuseumShowcaseProps) {
  const featuredSongs = songs.slice(0, 3);
  const portraitArtists = [artist, ...peers.filter((peer) => peer.id !== artist.id)];
  const portraitPlaylists = playlists.length > 0 ? playlists : playlist ? [playlist] : [];

  return (
    <MuseumBankSection
      label={title}
      type="songSpotlight"
    >
      <MuseumPanel>
        <div className="grid min-w-0 gap-6 md:gap-8">
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
                  className="mt-2.5 block truncate text-sm font-semibold leading-5 text-white transition hover:text-white/80"
                >
                  {portraitArtist.displayName}
                </Link>
                <MuseumGenrePills
                  labels={portraitArtist.genres.map((genre) => genre.name).slice(0, 3)}
                />
              </div>
            ))}
          </MuseumScrollRow>

          <div className="grid min-w-0 gap-6 md:gap-8">
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

          {lyricSong ? (
            <div className="min-w-0">
              <MuseumLyricSnippet song={lyricSong} variant="showcase" />
            </div>
          ) : null}
        </div>
      </MuseumPanel>
    </MuseumBankSection>
  );
}
