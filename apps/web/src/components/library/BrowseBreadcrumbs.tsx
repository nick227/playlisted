import { Link } from "react-router-dom";

import type { BrowseCrumb } from "@/lib/browsePaths";

interface BrowseBreadcrumbsProps {
  crumbs: BrowseCrumb[];
}

export function BrowseBreadcrumbs({ crumbs }: BrowseBreadcrumbsProps) {
  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-white/15">/</span>}
            {isLast || !crumb.to ? (
              <span
                className={[
                  "transition-colors",
                  isLast
                    ? "cursor-default font-medium text-white"
                    : "text-[var(--color-text-subtle)]",
                ].join(" ")}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="text-[var(--color-text-subtle)] transition-colors hover:text-white"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
