import { Link } from "react-router-dom";

import { useIsMdUp } from "@/hooks/useIsMdUp";
import type { BrowseCrumb } from "@/lib/browsePaths";

interface BrowseBreadcrumbsProps {
  crumbs: BrowseCrumb[];
}

function collapseCrumbsForMobile(crumbs: BrowseCrumb[]): BrowseCrumb[] {
  if (crumbs.length <= 3) return crumbs;
  return [crumbs[0], { label: "…" }, ...crumbs.slice(-2)];
}

function crumbLabelClass(isLast: boolean): string {
  return [
    "block max-w-[5.5rem] truncate sm:max-w-[9rem] md:max-w-none",
    "transition-colors",
    isLast ? "cursor-default font-medium text-white" : "text-[var(--color-text-subtle)]",
  ].join(" ");
}

export function BrowseBreadcrumbs({ crumbs }: BrowseBreadcrumbsProps) {
  const isMdUp = useIsMdUp();

  if (crumbs.length === 0) return null;

  const visibleCrumbs = isMdUp ? crumbs : collapseCrumbsForMobile(crumbs);

  return (
    <nav className="px-2 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Breadcrumb">
      {visibleCrumbs.map((crumb, i) => {
        const isLast = i === visibleCrumbs.length - 1;
        const isEllipsis = crumb.label === "…";

        return (
          <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="shrink-0 text-white/15">/</span>}
            {isEllipsis ? (
              <span className="text-[var(--color-text-subtle)]">…</span>
            ) : isLast || !crumb.to ? (
              <span className={crumbLabelClass(isLast)} title={crumb.label}>
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className={`${crumbLabelClass(false)} hover:text-white`}
                title={crumb.label}
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
