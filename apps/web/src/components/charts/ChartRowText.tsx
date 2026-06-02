import { Link } from "react-router-dom";

import { libraryGenrePath } from "@/lib/libraryPaths";

export function ChartRowTitle({
  title,
  href,
  active,
}: {
  title: string;
  href?: string;
  active?: boolean;
}) {
  const color = active ? "text-[var(--color-brand)]" : "text-white";

  if (href) {
    return (
      <Link
        to={href}
        onClick={(e) => e.stopPropagation()}
        className={`block truncate text-sm font-medium hover:underline ${color}`}
      >
        {title}
      </Link>
    );
  }
  return (
    <span className={`block truncate text-sm font-medium ${color}`}>{title}</span>
  );
}

export function ChartRowSubtitle({
  text,
  href,
  genre,
}: {
  text: string;
  href?: string;
  genre?: { name: string; slug: string } | null;
}) {
  const subtitleEl = href ? (
    <Link
      to={href}
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 truncate hover:text-white"
    >
      {text}
    </Link>
  ) : (
    <span className="shrink-0 truncate">{text}</span>
  );

  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-0 overflow-hidden text-xs text-[var(--color-text-muted)]">
      {subtitleEl}
      {genre && (
        <>
          <span className="mx-1.5 shrink-0 text-white/20">·</span>
          <Link
            to={libraryGenrePath(genre.slug)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 truncate hover:text-white hover:underline"
          >
            {genre.name}
          </Link>
        </>
      )}
    </div>
  );
}
