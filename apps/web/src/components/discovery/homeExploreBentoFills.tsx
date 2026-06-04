import type { LibraryGenre, TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";
import { FileAudio, ImagePlus } from "lucide-react";

import { coverFallback } from "@/lib/routes";

export type CoverItem = { id: string; title: string; imageUrl?: string | null };

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

export function BentoSongStack({ songs }: { songs: TopSongItem[] }) {
  const stack = songs.slice(0, 3);
  if (stack.length === 0) {
    return (
      <div className="flex items-center justify-center gap-1 opacity-50">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-12 w-12 rounded-lg border border-white/[0.08] bg-black/30"
            style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      {stack.map((song, i) => (
        <div
          key={song.recordingId}
          className="h-14 w-14 overflow-hidden rounded-lg border-2 border-[var(--color-surface)] shadow-lg first:ml-0 sm:h-16 sm:w-16"
          style={{
            marginLeft: i === 0 ? 0 : "-1.25rem",
            zIndex: stack.length - i,
            transform: `rotate(${(i - 1) * 7}deg)`,
          }}
        >
          {song.artworkUrl ? (
            <img src={song.artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: coverFallback(song.title) }} aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}

export function BentoGenreGrid({ genres }: { genres: LibraryGenre[] }) {
  const cells = [...genres]
    .sort((a, b) => b.songCount - a.songCount)
    .slice(0, 4);
  while (cells.length < 4) cells.push({ id: `g-${cells.length}`, name: "", slug: "", songCount: 0 });

  return (
    <div className="grid w-full max-w-[9.5rem] grid-cols-2 gap-1.5">
      {cells.map((genre) => (
        <div
          key={genre.id}
          className="flex aspect-square items-end overflow-hidden rounded-lg border border-white/[0.08] p-1.5"
          style={{
            background: genre.name ? coverFallback(genre.name) : "rgba(255,255,255,0.04)",
          }}
        >
          {genre.name ? (
            <span className="line-clamp-2 text-[9px] font-bold leading-tight text-white drop-shadow-sm">
              {genre.name}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function BentoUploadCover({ cover }: { cover?: CoverItem | null }) {
  if (cover?.imageUrl || cover?.title) {
    return (
      <div className="mx-auto h-20 w-20 overflow-hidden rounded-xl border border-white/[0.1] shadow-lg sm:h-24 sm:w-24">
        {cover.imageUrl ? (
          <img src={cover.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: coverFallback(cover.title) }} aria-hidden />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 text-orange-300/80">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.1] bg-black/25">
        <FileAudio size={20} strokeWidth={1.5} aria-hidden />
      </span>
      <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.1] bg-black/25">
        <ImagePlus size={20} strokeWidth={1.5} aria-hidden />
      </span>
    </div>
  );
}

export function BentoProfileAvatar({
  avatarUrl,
  displayName,
  size = "md",
}: {
  avatarUrl?: string | null;
  displayName?: string;
  size?: "md" | "lg";
}) {
  const name = displayName ?? "You";
  const dim = size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16 sm:h-20 sm:w-20";

  return (
    <div
      className={`${dim} overflow-hidden rounded-full border-2 border-white/[0.12] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)]`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-2xl font-black text-white"
          style={{ background: coverFallback(name) }}
          aria-hidden
        >
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}

export function BentoProfileHero({
  avatarUrl,
  heroUrl,
  displayName,
}: {
  avatarUrl?: string | null;
  heroUrl?: string | null;
  displayName?: string;
}) {
  const image = heroUrl ?? avatarUrl;
  const name = displayName ?? "Artist";

  return (
    <div className="relative h-full w-full min-h-[4.5rem] overflow-hidden rounded-xl border border-white/[0.08]">
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover opacity-70" />
      ) : (
        <div className="h-full min-h-[4.5rem] w-full" style={{ background: coverFallback(name) }} aria-hidden />
      )}
      <div className="absolute inset-0 bg-black/35" aria-hidden />
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <div className="h-9 w-9 overflow-hidden rounded-full border border-white/20">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
              style={{ background: coverFallback(name) }}
              aria-hidden
            >
              {name.slice(0, 1)}
            </div>
          )}
        </div>
        <span className="truncate text-xs font-semibold text-white">{name}</span>
      </div>
    </div>
  );
}

export function songsToCovers(songs: TopSongItem[]): CoverItem[] {
  return songs.map((s) => ({
    id: s.recordingId,
    title: s.title,
    imageUrl: s.artworkUrl,
  }));
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
