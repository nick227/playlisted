import { Link } from "react-router-dom";

import { PlaylistActionMenu } from "@/components/media/PlaylistActionMenu";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { playlistPath } from "@/lib/routes";
import { MediaCover } from "./MediaCover";

interface PlaylistCardProps {
  id: string;
  href?: string | null;
  title: string;
  creatorName?: string | null;
  coverArtUrl?: string | null;
  ownerUsername?: string | null;
  slug?: string | null;
  meta?: string | null;
  className?: string;
  onPlay?: () => void;
  showActions?: boolean;
}

export function PlaylistCard({
  id,
  href,
  title,
  creatorName,
  coverArtUrl,
  ownerUsername,
  slug,
  meta,
  className,
  onPlay,
  showActions = true,
}: PlaylistCardProps) {
  const path = playlistPath({ id, href, username: ownerUsername ?? null, slug });

  return (
    <div className={`group/card flex flex-col gap-2 ${className ?? "w-40 shrink-0"}`}>
      <div className="relative">
        <Link to={path} className="block transition hover:opacity-90">
          <MediaCover title={title} imageUrl={coverArtUrl} onPlay={onPlay} />
        </Link>
        {showActions ? (
          <>
            <PlaylistActionMenu
              className="absolute right-1.5 top-1.5 z-20"
              playlistId={id}
              title={title}
              ownerUsername={ownerUsername}
              slug={slug}
            />
            <FavoriteHeartButton
              target="playlist"
              id={id}
              className="absolute left-1.5 top-1.5 z-20"
            />
          </>
        ) : null}
      </div>
      <Link to={path} className="min-w-0 transition-opacity hover:opacity-80">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        {creatorName ? (
          <p className="truncate text-xs text-[var(--color-text-muted)]">{creatorName}</p>
        ) : null}
        {meta ? <p className="truncate text-xs text-[var(--color-text-subtle)]">{meta}</p> : null}
      </Link>
    </div>
  );
}
