import { Link } from "react-router-dom";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
}

export function SectionHeader({ title, subtitle, viewAllHref }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p> : null}
      </div>
      {viewAllHref ? (
        <Link
          to={viewAllHref}
          className="shrink-0 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white"
        >
          Show all
        </Link>
      ) : null}
    </div>
  );
}
