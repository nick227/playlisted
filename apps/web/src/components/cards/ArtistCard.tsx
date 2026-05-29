import { Link } from "react-router-dom";

import { profilePath } from "@/lib/routes";
import { MediaCover } from "./MediaCover";

interface ArtistCardProps {
  username: string;
  displayName: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  className?: string;
}

export function ArtistCard({ username, displayName, subtitle, avatarUrl, className }: ArtistCardProps) {
  return (
    <Link
      to={profilePath(username)}
      className={`flex flex-col items-center gap-3 text-center transition hover:opacity-90 ${className ?? "w-36 shrink-0"}`}
    >
      <div className="w-full max-w-[140px]">
        <MediaCover title={displayName} imageUrl={avatarUrl} shape="circle" />
      </div>
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-medium text-white">{displayName}</p>
        {subtitle ? (
          <p className="truncate text-xs text-[var(--color-text-muted)]">{subtitle}</p>
        ) : null}
      </div>
    </Link>
  );
}
