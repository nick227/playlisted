import type {
  LibraryArtist,
  LibrarySong,
  PlaylistSummary,
} from "@playlisted/client-sdk";

import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { ARTISTS_PATH, PLAYLISTS_PATH, SONGS_PATH } from "@/lib/browsePaths";

import { MuseumPlaylistCard } from "./MuseumPlaylistCard";
import { MuseumSongThumb } from "./MuseumSongThumb";
import type { MuseumGridKind } from "./museumTypes";
import {
  MuseumBankSection,
  MuseumResponsiveGrid,
  MuseumScrollRow,
} from "./museumUi";

const GRID_META: Record<
  MuseumGridKind,
  {
    label: string;
    path: string;
    container: "cinematicRow" | "circleRow" | "portraitGrid" | "squareGrid";
  }
> = {
  songs: { label: "Recordings", path: SONGS_PATH, container: "cinematicRow" },
  artists: { label: "Artists", path: ARTISTS_PATH, container: "circleRow" },
  playlists: {
    label: "Collections",
    path: PLAYLISTS_PATH,
    container: "portraitGrid",
  },
  "square-songs": {
    label: "More songs",
    path: SONGS_PATH,
    container: "squareGrid",
  },
};

interface MuseumTypedGridProps {
  kind: MuseumGridKind;
  songs?: LibrarySong[];
  artists?: LibraryArtist[];
  playlists?: PlaylistSummary[];
}

export function MuseumTypedGrid({
  kind,
  songs = [],
  artists = [],
  playlists = [],
}: MuseumTypedGridProps) {
  const meta = GRID_META[kind];
  const isEmpty =
    (kind === "songs" && songs.length === 0) ||
    (kind === "square-songs" && songs.length === 0) ||
    (kind === "artists" && artists.length === 0) ||
    (kind === "playlists" && playlists.length === 0);

  if (isEmpty) return null;

  return (
    <MuseumBankSection
      label={meta.label}
      href={meta.path}
      type={meta.container}
    >
      {kind === "songs" ? (
        <MuseumScrollRow variant="cinematic">
          {songs.map((song) => (
            <MuseumSongThumb
              key={song.id}
              song={song}
              queue={songs}
              showMeta
              variant="cinematic"
            />
          ))}
        </MuseumScrollRow>
      ) : null}

      {kind === "artists" ? (
        <MuseumScrollRow variant="circle">
          {artists.map((artist) => (
            <div key={artist.id} className="min-w-0">
              <SmartArtistCard
                id={artist.id}
                username={artist.username}
                displayName={artist.displayName}
                avatarUrl={artist.avatarUrl}
                shape="circle"
                subtitle={artist.genres[0]?.name}
                className="min-w-0 w-full"
                playbackOrigin={`library:artist-grid:${artist.id}`}
              />
            </div>
          ))}
        </MuseumScrollRow>
      ) : null}

      {kind === "playlists" ? (
        <MuseumResponsiveGrid variant="portrait">
          {playlists.map((playlist) => (
            <MuseumPlaylistCard
              key={playlist.id}
              playlist={playlist}
              className="min-w-0 w-full"
              aspect="portrait"
            />
          ))}
        </MuseumResponsiveGrid>
      ) : null}

      {kind === "square-songs" ? (
        <MuseumScrollRow variant="square">
          {songs.map((song) => (
            <MuseumSongThumb key={song.id} song={song} queue={songs} showMeta />
          ))}
        </MuseumScrollRow>
      ) : null}
    </MuseumBankSection>
  );
}
