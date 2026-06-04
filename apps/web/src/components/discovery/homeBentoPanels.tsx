import type { TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { MediaCover } from "@/components/cards/MediaCover";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { homeBentoSongOrigin } from "@/lib/playbackOrigin";
import { playlistPath, profilePath } from "@/lib/routes";

import { topSongPanelHref } from "../charts/chartSongUtils";

export const HOME_BENTO_ITEM_LIMIT = 4;

export function BentoPanelShell({
  title,
  viewAllHref,
  children,
  className = "",
}: {
  title: string;
  viewAllHref: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5",
        className,
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Link to={viewAllHref} className="text-sm font-bold tracking-tight text-white hover:underline">
          {title}
        </Link>
        <Link
          to={viewAllHref}
          className="shrink-0 text-[10px] font-medium text-[var(--color-text-muted)] hover:text-white"
        >
          View all
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

export function BentoTileSkeleton() {
  return <Skeleton className="aspect-square w-full rounded-lg" />;
}

function BentoSongTile({
  item,
  siblings,
  onPlay,
}: {
  item: TopSongItem;
  siblings: TopSongItem[];
  onPlay: (item: TopSongItem, siblings: TopSongItem[]) => void;
}) {
  const origin = homeBentoSongOrigin(item.recordingId);
  const { isActive, isPlaying } = useTrackPlayback(item.recordingId, origin);

  return (
    <div className="group/tile flex min-w-0 flex-col gap-1">
      <div className="relative">
        <MediaCover
          title={item.title}
          imageUrl={item.artworkUrl}
          onPlay={() => onPlay(item, siblings)}
          isActive={isActive}
          isPlaying={isPlaying}
          showPlaybackBars
        />
        <FavoriteHeartButton target="recording" id={item.recordingId} />
      </div>
      <Link to={topSongPanelHref(item)} className="min-w-0 transition hover:opacity-90">
        <p
          className={`truncate text-[10px] font-semibold leading-tight sm:text-xs ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}
        >
          {item.title}
        </p>
        <p className="truncate text-[9px] text-[var(--color-text-muted)]">{item.uploader.displayName}</p>
      </Link>
    </div>
  );
}

function BentoPlaylistTile({
  item,
  isActive,
  isPlaying,
  onPlay,
}: {
  item: TopPlaylistItem;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const href = playlistPath({
    id: item.playlistId,
    username: item.owner.username,
    slug: item.slug,
  });

  return (
    <div className="group/tile flex min-w-0 flex-col gap-1">
      <div className="relative">
        <MediaCover
          title={item.title}
          imageUrl={item.coverArtUrl}
          onPlay={onPlay}
          isActive={isActive}
          isPlaying={isPlaying}
          showPlaybackBars
        />
        <FavoriteHeartButton target="playlist" id={item.playlistId} />
      </div>
      <Link to={href} className="min-w-0 transition hover:opacity-90">
        <p
          className={`truncate text-[10px] font-semibold leading-tight sm:text-xs ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}
        >
          {item.title}
        </p>
        <p className="truncate text-[9px] text-[var(--color-text-muted)]">{item.owner.displayName}</p>
      </Link>
    </div>
  );
}

function BentoArtistTile({
  item,
  isActive,
  isPlaying,
  onPlay,
}: {
  item: TopArtistItem;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const href = profilePath(item.username);

  return (
    <div className="group/tile flex min-w-0 flex-col gap-1">
      <div className="relative">
        <MediaCover
          title={item.displayName}
          imageUrl={item.avatarUrl}
          shape="circle"
          onPlay={onPlay}
          isActive={isActive}
          isPlaying={isPlaying}
          showPlaybackBars
        />
        <FavoriteHeartButton target="artist" id={item.userId} />
      </div>
      <Link to={href} className="min-w-0 text-center transition hover:opacity-90">
        <p
          className={`truncate text-[10px] font-semibold leading-tight sm:text-xs ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}
        >
          {item.displayName}
        </p>
      </Link>
    </div>
  );
}

export function BentoSongsPanel({
  songs,
  loading,
  onPlay,
}: {
  songs: TopSongItem[];
  loading: boolean;
  onPlay: (item: TopSongItem, siblings: TopSongItem[]) => void;
}) {
  return (
    <BentoPanelShell title="Songs" viewAllHref="/songs">
      {loading
        ? Array.from({ length: HOME_BENTO_ITEM_LIMIT }).map((_, i) => <BentoTileSkeleton key={i} />)
        : songs.slice(0, HOME_BENTO_ITEM_LIMIT).map((item) => (
            <BentoSongTile key={item.recordingId} item={item} siblings={songs} onPlay={onPlay} />
          ))}
    </BentoPanelShell>
  );
}

export function BentoPlaylistsPanel({
  playlists,
  loading,
  isActive,
  isPlaying,
  onPlay,
}: {
  playlists: TopPlaylistItem[];
  loading: boolean;
  isActive: (id: string) => boolean;
  isPlaying: (id: string) => boolean;
  onPlay: (item: TopPlaylistItem) => void;
}) {
  return (
    <BentoPanelShell title="Playlists" viewAllHref="/playlists">
      {loading
        ? Array.from({ length: HOME_BENTO_ITEM_LIMIT }).map((_, i) => <BentoTileSkeleton key={i} />)
        : playlists.slice(0, HOME_BENTO_ITEM_LIMIT).map((item) => (
            <BentoPlaylistTile
              key={item.playlistId}
              item={item}
              isActive={isActive(item.playlistId)}
              isPlaying={isPlaying(item.playlistId)}
              onPlay={() => onPlay(item)}
            />
          ))}
    </BentoPanelShell>
  );
}

export function BentoArtistsPanel({
  artists,
  loading,
  isActive,
  isPlaying,
  onPlay,
}: {
  artists: TopArtistItem[];
  loading: boolean;
  isActive: (id: string) => boolean;
  isPlaying: (id: string) => boolean;
  onPlay: (item: TopArtistItem) => void;
}) {
  return (
    <BentoPanelShell title="Artists" viewAllHref="/artists">
      {loading
        ? Array.from({ length: HOME_BENTO_ITEM_LIMIT }).map((_, i) => <BentoTileSkeleton key={i} />)
        : artists.slice(0, HOME_BENTO_ITEM_LIMIT).map((item) => (
            <BentoArtistTile
              key={item.userId}
              item={item}
              isActive={isActive(item.userId)}
              isPlaying={isPlaying(item.userId)}
              onPlay={() => void onPlay(item)}
            />
          ))}
    </BentoPanelShell>
  );
}
