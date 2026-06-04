import type { ReactNode } from "react";

import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import type { BrowseCrumb } from "@/lib/browsePaths";

interface LibraryBrowseLayoutProps {
  crumbs: BrowseCrumb[];
  children: ReactNode;
}

export function LibraryBrowseLayout({ crumbs, children }: LibraryBrowseLayoutProps) {
  const showCrumbs = crumbs.length > 1;

  return (
    <div className="mx-auto max-w-5xl">
      <BrowseBreadcrumbs crumbs={crumbs} />
      <div className={showCrumbs ? "mt-5 min-h-[72vh]" : "min-h-[72vh]"}>{children}</div>
    </div>
  );
}
