import type { components } from "@playlisted/client-sdk";
import { Bookmark, Pause, Pin, Play, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { MediaCover } from "@/components/cards/MediaCover";
import { playlistPath, studioCollectionEditPath } from "@/lib/routes";

import {
  TYPE_LABELS,
  STATUS_STYLES,
  VISIBILITY_STYLES,
  formatPlaylistDuration,
  formatShortDate,
  playlistGenreTags,
  type StudioCollectionListItem,
} from "./studioCollectionUtils";
import { useStudioCollectionPlayback } from "./useStudioCollectionPlayback";

type PlaylistTag = components["schemas"]["Tag"];

export type { StudioCollectionListItem };

interface StudioCollectionCardProps {
  playlist: StudioCollectionListItem;
  onUnfollow?: (playlistId: string) => void;
  unfollowPending?: boolean;
  unfollowTargetId?: string;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-black/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function TagChips({ tags }: { tags: PlaylistTag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-block max-w-full truncate rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300"
          title={tag.name}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}

export function StudioCollectionCard({
  playlist,
  onUnfollow,
  unfollowPending,
  unfollowTargetId,
}: StudioCollectionCardProps) {
  const isOwned = playlist.listSource === "owned";
  const genres = playlistGenreTags(playlist.tags);
  const savedAt = "savedAt" in playlist ? playlist.savedAt : null;
  const href = isOwned
    ? studioCollectionEditPath(playlist.id)
    : playlistPath({
        id: playlist.id,
        href: playlist.href,
        username: playlist.owner.username,
        slug: playlist.slug,
      });
  const { handlePlay, prefetch, isActive, isPlaying, canPlay, playLabel } =
    useStudioCollectionPlayback(playlist);

  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-white/25 hover:shadow-lg hover:shadow-black/20">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
        <div
          className="w-28 shrink-0 sm:w-32"
          onMouseEnter={prefetch}
        >
          <MediaCover
            title={playlist.title}
            imageUrl={playlist.coverArtUrl}
            onPlay={canPlay ? handlePlay : undefined}
            isPlaying={isPlaying}
            isActive={isActive}
            showPlaybackBars={canPlay}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={isOwned ? "bg-[var(--color-brand)]/20 text-[var(--color-brand)]" : "bg-sky-500/15 text-sky-400"}>
                {isOwned ? "Yours" : <><Bookmark size={10} /> Saved</>}
              </Badge>
              <Badge className={STATUS_STYLES[playlist.status] ?? STATUS_STYLES.DRAFT}>
                {playlist.status}
              </Badge>
              <Badge className={VISIBILITY_STYLES[playlist.visibility] ?? VISIBILITY_STYLES.PRIVATE}>
                {playlist.visibility}
              </Badge>
              {playlist.featured ? (
                <Badge className="bg-amber-500/15 text-amber-400">
                  <Sparkles size={10} /> Featured
                </Badge>
              ) : null}
              {playlist.isPinnedOnProfile ? (
                <Badge className="bg-violet-500/15 text-violet-300">
                  <Pin size={10} /> Profile
                </Badge>
              ) : null}
            </div>

            <div className="min-w-0">
              <Link to={href} className="block transition hover:opacity-90">
                <h2 className="break-words text-lg font-bold leading-tight text-white sm:truncate sm:text-xl">
                  {playlist.title}
                </h2>
              </Link>
              <p className="mt-1 break-words text-sm text-[var(--color-text-muted)] sm:truncate">
                {TYPE_LABELS[playlist.type] ?? playlist.type}
                {!isOwned ? ` · ${playlist.owner.displayName} (@${playlist.owner.username})` : null}
              </p>
              {playlist.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-subtle)]">
                  {playlist.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handlePlay}
              disabled={!canPlay}
              onMouseEnter={prefetch}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:py-1.5"
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              {playLabel}
            </button>
            {isOwned ? (
              <Link
                to={studioCollectionEditPath(playlist.id)}
                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-brand)] hover:text-white sm:w-auto sm:py-1.5"
              >
                Edit
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onUnfollow?.(playlist.id)}
                disabled={unfollowPending}
                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-white/30 hover:text-white disabled:opacity-60 sm:w-auto sm:py-1.5"
              >
                {unfollowPending && unfollowTargetId === playlist.id ? "Removing…" : "Remove"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Tracks" value={String(playlist.itemCount)} />
            <Metric label="Duration" value={formatPlaylistDuration(playlist.totalDurationSeconds)} />
            <Metric label="Published" value={formatShortDate(playlist.publishedAt)} />
            <Metric label="Updated" value={formatShortDate(playlist.updatedAt)} />
          </div>

          <div className="grid gap-1.5 text-xs text-[var(--color-text-muted)] sm:grid-cols-3 sm:gap-2">
            <span className="min-w-0 truncate">Created {formatShortDate(playlist.createdAt)}</span>
            {savedAt ? (
              <span className="min-w-0 truncate">Saved {formatShortDate(savedAt)}</span>
            ) : (
              <span className="min-w-0 truncate" title={playlist.slug}>Slug /{playlist.slug}</span>
            )}
            <span className="min-w-0 truncate sm:col-span-1" title={playlist.href}>
              {playlist.href}
            </span>
          </div>

          {genres.length > 0 ? (
            <div>
              <TagChips tags={genres} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
