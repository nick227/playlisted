const PLAYLIST_ROUTE = /^\/@\/([^/]+)\/([^/]+)$/;
const ARTIST_ROUTE = /^\/@\/([^/]+)$/;

export type BrowseRoute =
  | { kind: "playlist"; username: string; slug: string }
  | { kind: "artist"; username: string };

export function parseBrowseRoute(pathname: string): BrowseRoute | null {
  const playlistMatch = pathname.match(PLAYLIST_ROUTE);
  if (playlistMatch) {
    return {
      kind: "playlist",
      username: decodeURIComponent(playlistMatch[1]),
      slug: decodeURIComponent(playlistMatch[2]),
    };
  }

  const artistMatch = pathname.match(ARTIST_ROUTE);
  if (artistMatch) {
    return { kind: "artist", username: decodeURIComponent(artistMatch[1]) };
  }

  return null;
}
