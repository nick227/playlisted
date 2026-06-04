import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import type {
  LibraryGenre,
  TopArtistItem,
  TopPlaylistItem,
  TopSongItem,
} from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/feedback/Skeleton";
import { formatPlayCount } from "@/lib/format";
import { coverFallback, profilePath } from "@/lib/routes";

export type BentoAccent = "violet" | "sky" | "amber" | "emerald" | "rose" | "orange" | "cyan" | "indigo";

const ACCENT_BORDER: Record<BentoAccent, string> = {
  violet: "border-l-violet-500",
  sky: "border-l-sky-500",
  amber: "border-l-amber-500",
  emerald: "border-l-emerald-500",
  rose: "border-l-rose-500",
  orange: "border-l-orange-500",
  cyan: "border-l-cyan-500",
  indigo: "border-l-indigo-500",
};

const ACCENT_ICON: Record<BentoAccent, string> = {
  violet: "text-violet-400",
  sky: "text-sky-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  orange: "text-orange-400",
  cyan: "text-cyan-400",
  indigo: "text-indigo-400",
};

export function BentoTileLink({
  href,
  accent,
  placement,
  label,
  title,
  titleLine2,
  description,
  icon: Icon,
  children,
}: {
  href: string;
  accent: BentoAccent;
  placement: string;
  label: string;
  title: string;
  titleLine2?: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className={[
        "group flex min-h-[11rem] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition",
        "hover:border-white/20 hover:bg-[var(--color-surface-elevated)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]",
        placement,
      ].join(" ")}
    >
      <div
        className={[
          "flex items-start justify-between gap-3 border-b border-[var(--color-border)] border-l-4 bg-[#181d26] px-4 py-3",
          ACCENT_BORDER[accent],
        ].join(" ")}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
            {label}
          </p>
          <h3 className="mt-0.5 font-black leading-none tracking-tighter text-white">
            <span className="text-xl sm:text-2xl">{title}</span>
            {titleLine2 ? (
              <span className="block text-lg text-white/75 sm:text-xl">{titleLine2}</span>
            ) : null}
          </h3>
        </div>
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[#11151c]",
            ACCENT_ICON[accent],
          ].join(" ")}
        >
          <Icon size={17} strokeWidth={1.75} aria-hidden />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[#11151c] p-3">{children}</div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[#181d26] px-4 py-2.5">
        <p className="line-clamp-1 text-xs text-[var(--color-text-muted)]">{description}</p>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-white/60 group-hover:text-white">
          Open
          <ArrowUpRight size={12} className="group-hover:translate-x-px group-hover:-translate-y-px" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function BentoPreviewSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function BentoSongPreview({ songs }: { songs: TopSongItem[] }) {
  if (songs.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)]">Chart tracks appear here as listeners play.</p>;
  }
  return (
    <ul className="flex flex-1 flex-col gap-1.5">
      {songs.map((song) => (
        <li
          key={song.recordingId}
          className="flex items-center gap-2.5 rounded-lg bg-[#181d26] px-2 py-1.5"
        >
          <span className="w-4 shrink-0 text-center text-[10px] font-bold tabular-nums text-[var(--color-text-subtle)]">
            {song.rank}
          </span>
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md">
            {song.artworkUrl ? (
              <img src={song.artworkUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ background: coverFallback(song.title) }} aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{song.title}</p>
            <p className="truncate text-[10px] text-[var(--color-text-muted)]">
              {song.uploader.displayName}
            </p>
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-text-subtle)]">
            {formatPlayCount(song.playCount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function BentoGenrePreview({ genres }: { genres: LibraryGenre[] }) {
  if (genres.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)]">Genre tags from the library catalog.</p>;
  }
  return (
    <div className="flex flex-1 flex-wrap content-start gap-1.5">
      {genres.map((genre) => (
        <span
          key={genre.id}
          className="rounded-md border border-[var(--color-border)] bg-[#181d26] px-2 py-1 text-[11px] font-medium text-white/90"
        >
          {genre.name}
          <span className="ml-1 text-[var(--color-text-subtle)]">{genre.songCount}</span>
        </span>
      ))}
    </div>
  );
}

export function BentoArtistPreview({ artists }: { artists: TopArtistItem[] }) {
  if (artists.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)]">Trending artist profiles this week.</p>;
  }
  return (
    <div className="flex flex-1 flex-wrap items-center gap-3">
      {artists.map((artist) => (
        <div key={artist.userId} className="flex min-w-[5.5rem] max-w-[7rem] flex-col items-center gap-1">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-[var(--color-border)]">
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
          <p className="w-full truncate text-center text-[10px] font-medium text-white">
            {artist.displayName}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BentoCoverGrid({ items }: { items: Array<{ id: string; title: string; imageUrl?: string | null }> }) {
  if (items.length === 0) {
    return (
      <div className="grid flex-1 grid-cols-2 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-[#181d26]" aria-hidden />
        ))}
      </div>
    );
  }
  const cells = [...items.slice(0, 4)];
  while (cells.length < 4) {
    cells.push({ id: `empty-${cells.length}`, title: "", imageUrl: null });
  }
  return (
    <div className="grid flex-1 grid-cols-2 gap-1.5">
      {cells.map((item) => (
        <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-[#181d26]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : item.title ? (
            <div className="flex h-full w-full items-end p-2" style={{ background: coverFallback(item.title) }}>
              <span className="line-clamp-2 text-[10px] font-semibold text-white">{item.title}</span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function playlistsToCovers(playlists: TopPlaylistItem[]) {
  return playlists.map((p) => ({
    id: p.playlistId,
    title: p.title,
    imageUrl: p.coverArtUrl,
  }));
}

export function BentoStudioPreview({
  collections,
  displayName,
}: {
  collections: Array<{ id: string; title: string; coverArtUrl?: string | null }>;
  displayName?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <p className="text-xs text-[var(--color-text-muted)]">
        {displayName ? `${displayName}, your collections and stats live here.` : "Sign in to manage releases and analytics."}
      </p>
      <BentoCoverGrid
        items={collections.map((c) => ({ id: c.id, title: c.title, imageUrl: c.coverArtUrl }))}
      />
    </div>
  );
}

export function BentoProfilePreview({
  displayName,
  username,
  avatarUrl,
  variant,
}: {
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
  variant: "edit" | "view";
}) {
  const name = displayName ?? "Your name";
  const handle = username ? `@${username.replace(/^@/, "")}` : "@username";

  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-[#181d26]">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-lg font-black text-white"
            style={{ background: coverFallback(name) }}
            aria-hidden
          >
            {name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{name}</p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">{handle}</p>
        <p className="mt-1 text-[10px] text-[var(--color-text-subtle)]">
          {variant === "edit" ? "Avatar, bio, links, pinned collections" : `Public URL: ${username ? profilePath(username) : "—"}`}
        </p>
      </div>
    </div>
  );
}

export function BentoUploadPreview({
  collectionTitle,
  trackHint,
}: {
  collectionTitle?: string;
  trackHint?: string;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-2">
      <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
        Queue audio and artwork, then publish to a collection.
      </p>
      {collectionTitle ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[#181d26] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">Latest collection</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">{collectionTitle}</p>
          {trackHint ? (
            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{trackHint}</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[#181d26] px-3 py-4 text-center text-[11px] text-[var(--color-text-muted)]">
          Create a collection to start uploading
        </div>
      )}
    </div>
  );
}

export function pickBentoGenres(genres: LibraryGenre[], count: number): LibraryGenre[] {
  return [...genres]
    .filter((g) => g.songCount > 0)
    .sort((a, b) => b.songCount - a.songCount)
    .slice(0, count);
}
