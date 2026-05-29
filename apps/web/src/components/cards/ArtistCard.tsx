import { Link } from "react-router-dom";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { profilePath } from "@/lib/routes";
import { MediaCover } from "./MediaCover";

interface ArtistCardProps {
  id?: string;
  username: string;
  displayName: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  className?: string;
}

export function ArtistCard({ id, username, displayName, subtitle, avatarUrl, className }: ArtistCardProps) {
  const path = profilePath(username);

  return (
    <div className={`group/card flex flex-col items-center gap-3 text-center ${className ?? "w-36 shrink-0"}`}>
      <div className="relative w-full max-w-[140px]">
        <Link to={path} className="block transition hover:opacity-90">
          <MediaCover title={displayName} imageUrl={avatarUrl} shape="circle" />
        </Link>
        {id ? <FavoriteHeartButton target="artist" id={id} /> : null}
      </div>
      <Link to={path} className="min-w-0 px-1 transition hover:opacity-90">
        <p className="truncate text-sm font-medium text-white">{displayName}</p>
        {subtitle ? (
          <p className="truncate text-xs text-[var(--color-text-muted)]">{subtitle}</p>
        ) : null}
      </Link>
    </div>
  );
}
