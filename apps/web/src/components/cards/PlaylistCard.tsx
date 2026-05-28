import { Link } from "react-router-dom";

import { playlistPath } from "@/lib/routes";
import { MediaCover } from "./MediaCover";

interface PlaylistCardProps {
  id: string;
  title: string;
  creatorName?: string | null;
  coverArtUrl?: string | null;
  meta?: string | null;
  onPlay?: () => void;
}

export function PlaylistCard({
  id,
  title,
  creatorName,
  coverArtUrl,
  meta,
  onPlay,
}: PlaylistCardProps) {
  return (
    <Link
      to={playlistPath(id)}
      className="group flex w-40 shrink-0 flex-col gap-2 transition hover:opacity-90"
    >
      <MediaCover title={title} imageUrl={coverArtUrl} onPlay={onPlay} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        {creatorName ? (
          <p className="truncate text-xs text-[var(--color-text-muted)]">{creatorName}</p>
        ) : null}
        {meta ? <p className="truncate text-xs text-[var(--color-text-subtle)]">{meta}</p> : null}
      </div>
    </Link>
  );
}
