/** Playlists visible in browse surfaces (charts, library list, profiles, homepage). */
export const PUBLIC_PUBLISHED_PLAYLIST = {
  visibility: "PUBLIC" as const,
  status: "PUBLISHED" as const,
};

export type PlaylistVisibilityFields = {
  visibility: string;
  status: string;
};

export function isPlaylistBrowsable(playlist: PlaylistVisibilityFields): boolean {
  return (
    playlist.visibility === PUBLIC_PUBLISHED_PLAYLIST.visibility
    && playlist.status === PUBLIC_PUBLISHED_PLAYLIST.status
  );
}

/** Direct links and canonical playlist pages (not library browse). */
export function isPlaylistLinkAccessible(playlist: PlaylistVisibilityFields): boolean {
  return playlist.status === "PUBLISHED"
    && (playlist.visibility === "PUBLIC" || playlist.visibility === "UNLISTED");
}

export function canViewerAccessPlaylist(
  playlist: PlaylistVisibilityFields,
  viewer: { userId?: string | null; role?: string | null },
  ownerId: string,
): boolean {
  if (viewer.role === "ADMIN" || viewer.role === "EDITOR") return true;
  if (viewer.userId && viewer.userId === ownerId) return true;
  return isPlaylistLinkAccessible(playlist);
}
