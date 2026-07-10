import type {
  LibraryArtist,
  LibrarySong,
  PlaylistSummary,
} from "@playlisted/client-sdk";

export type MuseumGridKind = "songs" | "artists" | "playlists" | "square-songs";

export type MuseumExhibit =
  | {
      id: string;
      kind: "showcase";
      artist: LibraryArtist;
      songs: LibrarySong[];
      playlist?: PlaylistSummary;
      playlists: PlaylistSummary[];
      lyricSong?: LibrarySong;
      peers: LibraryArtist[];
    }
  | {
      id: string;
      kind: "artist-feature";
      artist: LibraryArtist;
      artists: LibraryArtist[];
      songs: LibrarySong[];
    }
  | { id: string; kind: "lyric-placard"; song: LibrarySong }
  | { id: string; kind: "quiet-room"; phrase: string }
  | { id: string; kind: "song-tracklist"; songs: LibrarySong[]; label?: string }
  | { id: string; kind: "song-grid"; songs: LibrarySong[] }
  | { id: string; kind: "square-grid"; songs: LibrarySong[] }
  | { id: string; kind: "artist-grid"; artists: LibraryArtist[] }
  | { id: string; kind: "playlist-grid"; playlists: PlaylistSummary[] }
  | {
      id: string;
      kind: "listening-room";
      playlist: PlaylistSummary;
      songs: LibrarySong[];
    };

export interface MuseumPools {
  artists: LibraryArtist[];
  songs: LibrarySong[];
  playlists: PlaylistSummary[];
}
