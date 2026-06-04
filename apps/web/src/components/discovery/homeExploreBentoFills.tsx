import type { LibraryGenre, TopArtistItem, TopPlaylistItem } from "@playlisted/client-sdk";

import { coverFallback } from "@/lib/routes";

type CoverItem = { id: string; title: string; imageUrl?: string | null };

export function BentoCoverMosaic({ items }: { items: CoverItem[] }) {
  const cells = [...items.slice(0, 4)];
  while (cells.length < 4) cells.push({ id: `e-${cells.length}`, title: "", imageUrl: null });

  return (
    <div className="grid h-full w-full max-w-[11rem] grid-cols-2 gap-1.5 sm:max-w-none">
      {cells.map((item) => (
        <div key={item.id} className="aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
          ) : item.title ? (
            <div className="h-full w-full" style={{ background: coverFallback(item.title) }} aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function BentoAvatarStrip({ artists }: { artists: TopArtistItem[] }) {
  const shown = artists.slice(0, 5);
  if (shown.length === 0) return null;

  return (
    <div className="flex items-center pl-1">
      {shown.map((artist, i) => (
        <div
          key={artist.userId}
          className="relative -ml-2 h-11 w-11 overflow-hidden rounded-full border-2 border-[var(--color-surface)] first:ml-0 sm:h-12 sm:w-12"
          style={{ zIndex: shown.length - i }}
        >
          {artist.avatarUrl ? (
            <img src={artist.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
              style={{ background: coverFallback(artist.displayName) }}
              aria-hidden
            >
              {artist.displayName.slice(0, 1)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function BentoGenreTags({ genres }: { genres: LibraryGenre[] }) {
  const tags = genres.slice(0, 4);
  if (tags.length === 0) return null;

  return (
    <p className="text-right text-[10px] leading-relaxed text-[var(--color-text-subtle)] sm:text-xs">
      {tags.map((g) => g.name).join(" · ")}
    </p>
  );
}

export function playlistsToCovers(playlists: TopPlaylistItem[]): CoverItem[] {
  return playlists.map((p) => ({
    id: p.playlistId,
    title: p.title,
    imageUrl: p.coverArtUrl,
  }));
}

export function collectionsToCovers(
  collections: Array<{ id: string; title: string; coverArtUrl?: string | null }>,
): CoverItem[] {
  return collections.map((c) => ({ id: c.id, title: c.title, imageUrl: c.coverArtUrl }));
}
