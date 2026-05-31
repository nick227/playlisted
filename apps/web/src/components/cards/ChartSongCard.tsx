import { Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { TopSongItem } from "@playlisted/client-sdk";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { topSongToQueueTrack } from "@/lib/queueTrack";
import { coverFallback, playlistPath, profilePath } from "@/lib/routes";
import { recordingShareUrl } from "@/lib/shareContent";

interface ChartSongCardProps {
  item: TopSongItem;
  className?: string;
  actionSlot?: ReactNode;
  playbackOrigin?: string;
  onPlay?: () => void;
}

export function ChartSongCard({ item, className, actionSlot, playbackOrigin, onPlay }: ChartSongCardProps) {
  const { isActive, isPlaying } = useTrackPlayback(item.recordingId, playbackOrigin);
  const rankLabel = item.rank <= 3 ? ["#1", "#2", "#3"][item.rank - 1] : `#${item.rank}`;
  const isTop3 = item.rank <= 3;

  return (
    <div className={`group/card flex flex-col gap-2 ${className ?? "w-52 shrink-0"}`}>
      {/* Artwork */}
      <div
        role={onPlay ? "button" : undefined}
        tabIndex={onPlay ? 0 : undefined}
        aria-label={onPlay ? (isPlaying ? "Pause" : isActive ? "Resume" : "Play") : undefined}
        className={[
          "group relative aspect-square w-full overflow-hidden rounded-lg",
          onPlay ? "cursor-pointer" : "",
        ].join(" ")}
        onClick={onPlay}
        onKeyDown={
          onPlay
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPlay();
                }
              }
            : undefined
        }
      >
        {item.artworkUrl ? (
          <img src={item.artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: coverFallback(item.title) }}
            aria-hidden
          />
        )}
        <span
          className={[
            "playback-thumb-glow rounded-lg",
            isActive ? "is-active" : "",
            isPlaying ? "is-playing" : "",
          ].join(" ")}
          aria-hidden="true"
        />
        <PlaybackBars variant="thumb" active={isActive} playing={isPlaying} />

        <div className="absolute right-1.5 top-1.5 z-20">
          {actionSlot ?? (
            <RecordingActionMenu
              recordingId={item.recordingId}
              title={item.title}
              queueTrack={topSongToQueueTrack(item)}
              shareUrl={recordingShareUrl({
                playlistId: item.playlist.id,
                recordingId: item.recordingId,
                username: item.playlist.owner.username,
                slug: item.playlist.slug,
              })}
            />
          )}
        </div>

        <FavoriteHeartButton
          target="recording"
          id={item.recordingId}
          className="absolute bottom-2 right-2 z-20"
        />

        {/* Rank badge — always visible */}
        <span
          className={[
            "absolute left-2 top-2 z-10 rounded px-1.5 py-0.5 text-xs font-bold leading-none",
            isTop3 ? "bg-[var(--color-brand)] text-white" : "bg-black/60 text-white/80",
          ].join(" ")}
        >
          {rankLabel}
        </span>

        {/* Gradient + play count — fade out on hover when playable */}
        <div
          className={[
            "absolute inset-0 bg-gradient-to-t from-black/50 to-transparent transition-opacity",
            onPlay && !isActive ? "group-hover:opacity-0" : "",
          ].join(" ")}
        />
        <div
          className={[
            "absolute bottom-2 left-2 right-2 pl-10 transition-opacity",
            onPlay && !isActive ? "group-hover:opacity-0" : "",
          ].join(" ")}
        >
          <p className="truncate text-xs font-medium text-white/60">
            {item.playCount.toLocaleString()} plays
          </p>
        </div>

        {/* Play / pause overlay — visible when this track is active */}
        {onPlay && (
          <div
            className={[
              "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            ].join(" ")}
          >
            {isPlaying ? (
              <Pause size={32} fill="currentColor" className="text-white drop-shadow-lg" />
            ) : (
              <Play size={32} fill="currentColor" className="ml-1 text-white drop-shadow-lg" />
            )}
          </div>
        )}

        {/* Active ring */}
        {isActive && (
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-[var(--color-brand)]" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <Link
          to={`${playlistPath({ id: item.publishedPlaylistId, username: item.playlist.owner.username, slug: item.playlist.slug })}#track-${item.recordingId}`}
          onClick={(e) => e.stopPropagation()}
          className={[
            "block truncate text-sm font-semibold hover:underline",
            isActive ? "text-[var(--color-brand)]" : "text-white",
          ].join(" ")}
        >
          {item.title}
        </Link>
        <Link
          to={profilePath(item.uploader.username)}
          onClick={(e) => e.stopPropagation()}
          className="truncate text-xs text-[var(--color-text-muted)] transition hover:text-white"
        >
          {item.uploader.displayName}
        </Link>
      </div>
    </div>
  );
}
