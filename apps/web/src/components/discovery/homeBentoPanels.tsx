import type { TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { MediaCover } from "@/components/cards/MediaCover";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { homeBentoSongOrigin } from "@/lib/playbackOrigin";
import { playlistPath, profilePath } from "@/lib/routes";

import { topSongPanelHref } from "../charts/chartSongUtils";
import type { BentoSlot } from "./homeBentoLayout";

function BentoTileSkeleton({ aspectClass }: { aspectClass: string }) {
  return <Skeleton className={`w-full rounded-lg ${aspectClass}`} />;
}

function BentoMetaBelow({
  title,
  subtitle,
  titleHref,
  isActive,
}: {
  title: string;
  subtitle?: string;
  titleHref: string;
  isActive: boolean;
}) {
  return (
    <Link to={titleHref} className="mt-1 min-w-0 transition hover:opacity-90">
      <p
        className={`truncate text-[10px] font-semibold leading-tight sm:text-xs ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}
      >
        {title}
      </p>
      {subtitle ? (
        <p className="truncate text-[9px] text-[var(--color-text-muted)]">{subtitle}</p>
      ) : null}
    </Link>
  );
}

function BentoMetaOverlay({
  title,
  subtitle,
  titleHref,
  isActive,
}: {
  title: string;
  subtitle?: string;
  titleHref: string;
  isActive: boolean;
}) {
  return (
    <Link
      to={titleHref}
      className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2 pb-2 pt-6 transition hover:opacity-95"
    >
      <p
        className={`line-clamp-2 text-xs font-bold leading-tight sm:text-sm ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}
      >
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 truncate text-[10px] text-white/70">{subtitle}</p>
      ) : null}
    </Link>
  );
}

function BentoSongCell({
  item,
  siblings,
  slot,
  onPlay,
}: {
  item: TopSongItem;
  siblings: TopSongItem[];
  slot: BentoSlot;
  onPlay: (item: TopSongItem, siblings: TopSongItem[]) => void;
}) {
  const origin = homeBentoSongOrigin(item.recordingId);
  const { isActive, isPlaying } = useTrackPlayback(item.recordingId, origin);
  const href = topSongPanelHref(item);

  return (
    <div className={`flex min-h-0 min-w-0 flex-col ${slot.placement}`}>
      <div className="relative min-h-0 flex-1">
        <MediaCover
          title={item.title}
          imageUrl={item.artworkUrl}
          aspectClass={slot.aspectClass}
          onPlay={() => onPlay(item, siblings)}
          isActive={isActive}
          isPlaying={isPlaying}
          showPlaybackBars
        />
        <FavoriteHeartButton target="recording" id={item.recordingId} />
        {slot.meta === "overlay" ? (
          <BentoMetaOverlay
            title={item.title}
            subtitle={item.uploader.displayName}
            titleHref={href}
            isActive={isActive}
          />
        ) : null}
      </div>
      {slot.meta !== "overlay" ? (
        <BentoMetaBelow
          title={item.title}
          subtitle={item.uploader.displayName}
          titleHref={href}
          isActive={isActive}
        />
      ) : null}
    </div>
  );
}

function BentoPlaylistCell({
  item,
  slot,
  isActive,
  isPlaying,
  onPlay,
}: {
  item: TopPlaylistItem;
  slot: BentoSlot;
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
    <div className={`flex min-h-0 min-w-0 flex-col ${slot.placement}`}>
      <div className="relative min-h-0 flex-1">
        <MediaCover
          title={item.title}
          imageUrl={item.coverArtUrl}
          aspectClass={slot.aspectClass}
          onPlay={onPlay}
          isActive={isActive}
          isPlaying={isPlaying}
          showPlaybackBars
        />
        <FavoriteHeartButton target="playlist" id={item.playlistId} />
        {slot.meta === "overlay" ? (
          <BentoMetaOverlay
            title={item.title}
            subtitle={item.owner.displayName}
            titleHref={href}
            isActive={isActive}
          />
        ) : null}
      </div>
      {slot.meta !== "overlay" ? (
        <BentoMetaBelow
          title={item.title}
          subtitle={item.owner.displayName}
          titleHref={href}
          isActive={isActive}
        />
      ) : null}
    </div>
  );
}

function BentoArtistCell({
  item,
  slot,
  isActive,
  isPlaying,
  onPlay,
}: {
  item: TopArtistItem;
  slot: BentoSlot;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const href = profilePath(item.username);
  const shape = slot.shape ?? "square";

  return (
    <div className={`flex min-h-0 min-w-0 flex-col ${slot.placement}`}>
      <div className="relative min-h-0 flex-1">
        <MediaCover
          title={item.displayName}
          imageUrl={item.avatarUrl}
          shape={shape}
          aspectClass={slot.aspectClass}
          onPlay={onPlay}
          isActive={isActive}
          isPlaying={isPlaying}
          showPlaybackBars
        />
        <FavoriteHeartButton target="artist" id={item.userId} />
        {slot.meta === "overlay" ? (
          <BentoMetaOverlay title={item.displayName} titleHref={href} isActive={isActive} />
        ) : null}
      </div>
      {slot.meta !== "overlay" && shape === "circle" ? (
        <BentoMetaBelow title={item.displayName} titleHref={href} isActive={isActive} />
      ) : null}
    </div>
  );
}

export function HomeBentoMediaGrid({
  slots,
  songs,
  playlists,
  artists,
  loading,
  onPlaySong,
  onPlayPlaylist,
  playlistActive,
  playlistPlaying,
  onPlayArtist,
  artistActive,
  artistPlaying,
}: {
  slots: BentoSlot[];
  songs: TopSongItem[];
  playlists: TopPlaylistItem[];
  artists: TopArtistItem[];
  loading: boolean;
  onPlaySong: (item: TopSongItem, siblings: TopSongItem[]) => void;
  onPlayPlaylist: (item: TopPlaylistItem) => void;
  playlistActive: (id: string) => boolean;
  playlistPlaying: (id: string) => boolean;
  onPlayArtist: (item: TopArtistItem) => void;
  artistActive: (id: string) => boolean;
  artistPlaying: (id: string) => boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:auto-rows-[minmax(4.5rem,auto)]">
      {slots.map((slot) => {
        const key = `${slot.kind}-${slot.index}`;

        if (loading) {
          return (
            <div key={key} className={slot.placement}>
              <BentoTileSkeleton aspectClass={slot.aspectClass} />
            </div>
          );
        }

        if (slot.kind === "song") {
          const item = songs[slot.index];
          if (!item) return null;
          return (
            <BentoSongCell
              key={key}
              item={item}
              siblings={songs}
              slot={slot}
              onPlay={onPlaySong}
            />
          );
        }

        if (slot.kind === "playlist") {
          const item = playlists[slot.index];
          if (!item) return null;
          return (
            <BentoPlaylistCell
              key={key}
              item={item}
              slot={slot}
              isActive={playlistActive(item.playlistId)}
              isPlaying={playlistPlaying(item.playlistId)}
              onPlay={() => onPlayPlaylist(item)}
            />
          );
        }

        const item = artists[slot.index];
        if (!item) return null;
        return (
          <BentoArtistCell
            key={key}
            item={item}
            slot={slot}
            isActive={artistActive(item.userId)}
            isPlaying={artistPlaying(item.userId)}
            onPlay={() => void onPlayArtist(item)}
          />
        );
      })}
    </div>
  );
}
