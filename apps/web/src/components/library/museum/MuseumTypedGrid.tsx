import type { LibraryArtist, LibrarySong, PlaylistSummary } from "@playlisted/client-sdk";

import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { ARTISTS_PATH, PLAYLISTS_PATH, SONGS_PATH } from "@/lib/browsePaths";

import { MuseumPlaylistCard } from "./MuseumPlaylistCard";
import { MuseumSongThumb } from "./MuseumSongThumb";
import type { MuseumGridKind } from "./museumTypes";
import { MuseumPanel, MuseumSectionHeader } from "./museumUi";

const GRID_META: Record<MuseumGridKind, { label: string; path: string; cols: string }> = {
  songs: { label: "Recordings", path: SONGS_PATH, cols: "grid-cols-2 sm:grid-cols-4" },
  artists: { label: "Artists", path: ARTISTS_PATH, cols: "grid-cols-2 sm:grid-cols-4" },
  playlists: { label: "Collections", path: PLAYLISTS_PATH, cols: "grid-cols-2 sm:grid-cols-3" },
};

interface MuseumTypedGridProps {
  kind: MuseumGridKind;
  songs?: LibrarySong[];
  artists?: LibraryArtist[];
  playlists?: PlaylistSummary[];
}

export function MuseumTypedGrid({ kind, songs = [], artists = [], playlists = [] }: MuseumTypedGridProps) {
  const meta = GRID_META[kind];
  const isEmpty =
    (kind === "songs" && songs.length === 0) ||
    (kind === "artists" && artists.length === 0) ||
    (kind === "playlists" && playlists.length === 0);

  if (isEmpty) return null;

  return (
    <section className="min-w-0">
      <MuseumSectionHeader label={meta.label} href={meta.path} />

      <MuseumPanel padding="roomy" className="bg-black/10">
        <div className={`grid items-start ${meta.cols} gap-4`}>
          {kind === "songs"
            ? songs.map((song) => (
                <MuseumSongThumb key={song.id} song={song} queue={songs} showMeta />
              ))
            : null}

          {kind === "artists"
            ? artists.map((artist) => (
                <SmartArtistCard
                  key={artist.id}
                  id={artist.id}
                  username={artist.username}
                  displayName={artist.displayName}
                  avatarUrl={artist.avatarUrl}
                  shape="circle"
                  subtitle={artist.genres[0]?.name}
                  className="min-w-0 w-full"
                  playbackOrigin={`library:artist-grid:${artist.id}`}
                />
              ))
            : null}

          {kind === "playlists"
            ? playlists.map((playlist) => (
                <MuseumPlaylistCard key={playlist.id} playlist={playlist} className="min-w-0 w-full" />
              ))
            : null}
        </div>
      </MuseumPanel>
    </section>
  );
}
