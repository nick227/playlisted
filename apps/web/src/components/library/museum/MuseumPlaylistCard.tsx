import type { PlaylistSummary } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { MediaCover } from "@/components/cards/MediaCover";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { playlistPath } from "@/lib/routes";

import { useLibraryPlaylistPlayback } from "./museumPlaylistPlayback";

interface MuseumPlaylistCardProps {
  playlist: PlaylistSummary;
  className?: string;
  elevated?: boolean;
}

export function MuseumPlaylistCard({ playlist, className, elevated = false }: MuseumPlaylistCardProps) {
  const { play, isActive, isPlaying } = useLibraryPlaylistPlayback();
  const href = playlistPath({
    id: playlist.id,
    username: playlist.owner.username,
    slug: playlist.slug,
  });

  return (
    <div className={`group/card flex min-w-0 flex-col ${className ?? ""}`}>
      <div
        className={[
          "relative w-full overflow-hidden rounded-xl",
          elevated ? "shadow-[0_22px_60px_rgba(0,0,0,0.38)] ring-1 ring-white/10" : "",
        ].join(" ")}
      >
        <div className="relative aspect-square w-full">
          <MediaCover
            title={playlist.title}
            imageUrl={playlist.coverArtUrl}
            aspectClass="h-full w-full"
            onPlay={() => void play(playlist)}
            isActive={isActive(playlist.id)}
            isPlaying={isPlaying(playlist.id)}
            showPlaybackBars
          />
        </div>
        <FavoriteHeartButton target="playlist" id={playlist.id} />
      </div>
      <Link to={href} className="mt-2.5 min-w-0 transition-opacity hover:opacity-85">
        <p className="truncate text-sm font-medium text-white">{playlist.title}</p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">{playlist.owner.displayName}</p>
      </Link>
    </div>
  );
}
