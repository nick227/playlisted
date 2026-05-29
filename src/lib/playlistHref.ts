export function getPlaylistHref(playlist: {
  id: string;
  owner?: { username?: string | null } | null;
  slug?: string | null;
}): string {
  const username = playlist.owner?.username;
  const slug = playlist.slug;

  if (username && slug) {
    return `/@/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  }

  return `/playlists/${encodeURIComponent(playlist.id)}`;
}

