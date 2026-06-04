import type { LibraryGenre, TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";
import { FileAudio, ImagePlus } from "lucide-react";

import { coverFallback } from "@/lib/routes";

export type CoverItem = { id: string; title: string; imageUrl?: string | null };

export function BentoCoverMosaic({ items }: { items: CoverItem[] }) {
  const cells = [...items.slice(0, 4)];
  while (cells.length < 4) cells.push({ id: `e-${cells.length}`, title: "", imageUrl: null });

  return (
    <div className="grid h-full w-full min-h-0 grid-cols-2 grid-rows-2 gap-1.5">
      {cells.map((item) => (
        <div key={item.id} className="min-h-0 overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
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
  if (shown.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-2 opacity-40">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="aspect-square h-[72%] max-h-full rounded-full border border-white/[0.08] bg-black/30"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-0.5">
      {shown.map((artist, i) => (
        <div
          key={artist.userId}
          className="relative aspect-square h-[78%] max-h-full overflow-hidden rounded-full border-2 border-[var(--color-surface)] shadow-md first:ml-0"
          style={{
            marginLeft: i === 0 ? 0 : "-12%",
            zIndex: shown.length - i,
            maxWidth: `${100 / shown.length + 8}%`,
          }}
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
  const artClass =
    "aspect-square h-[88%] max-h-full overflow-hidden rounded-lg border-2 border-[var(--color-surface)] shadow-lg";

  if (stack.length === 0) {
    return (
      <div className="relative flex h-full w-full items-center justify-center opacity-50">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${artClass} bg-black/30`}
            style={{
              marginLeft: i === 0 ? 0 : "-18%",
              transform: `rotate(${(i - 1) * 8}deg)`,
              zIndex: 3 - i,
            }}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {stack.map((song, i) => (
        <div
          key={song.recordingId}
          className={artClass}
          style={{
            marginLeft: i === 0 ? 0 : "-18%",
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
    <div className="grid h-full w-full min-h-0 grid-cols-2 grid-rows-2 gap-1.5">
      {cells.map((genre) => (
        <div
          key={genre.id}
          className="flex min-h-0 items-end overflow-hidden rounded-lg border border-white/[0.08] p-2"
          style={{
            background: genre.name ? coverFallback(genre.name) : "rgba(255,255,255,0.04)",
          }}
        >
          {genre.name ? (
            <span className="line-clamp-2 text-[10px] font-bold leading-tight text-white drop-shadow-sm sm:text-xs">
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
      <div className="h-full w-full min-h-0 overflow-hidden rounded-xl border border-white/[0.1] shadow-lg">
        {cover.imageUrl ? (
          <img src={cover.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: coverFallback(cover.title) }} aria-hidden />
        )}
      </div>
    );
  }

  return (
    <div className="grid h-full w-full min-h-0 grid-cols-2 gap-2 text-orange-300/80">
      <span className="flex items-center justify-center rounded-xl border border-white/[0.1] bg-black/25">
        <FileAudio className="h-[40%] w-[40%] min-h-8 min-w-8" strokeWidth={1.5} aria-hidden />
      </span>
      <span className="flex items-center justify-center rounded-xl border border-white/[0.1] bg-black/25">
        <ImagePlus className="h-[40%] w-[40%] min-h-8 min-w-8" strokeWidth={1.5} aria-hidden />
      </span>
    </div>
  );
}

export function BentoProfileAvatar({
  avatarUrl,
  displayName,
  fill = false,
}: {
  avatarUrl?: string | null;
  displayName?: string;
  fill?: boolean;
}) {
  const name = displayName ?? "You";
  const dim = fill
    ? "aspect-square h-[92%] max-h-full w-auto max-w-full"
    : "h-16 w-16 sm:h-20 sm:w-20";

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className={`${dim} overflow-hidden rounded-full border-2 border-white/[0.12] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)]`}
      >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-3xl font-black text-white sm:text-4xl"
          style={{ background: coverFallback(name) }}
          aria-hidden
        >
          {name.slice(0, 1)}
        </div>
      )}
      </div>
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
    <div className="relative h-full w-full min-h-0 overflow-hidden rounded-xl border border-white/[0.08]">
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover opacity-75" />
      ) : (
        <div className="h-full w-full" style={{ background: coverFallback(name) }} aria-hidden />
      )}
      <div className="absolute inset-0 bg-black/35" aria-hidden />
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2.5">
        <div className="aspect-square h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/20 sm:h-12 sm:w-12">
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
