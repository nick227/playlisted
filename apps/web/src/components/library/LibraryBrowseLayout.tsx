import type { ReactNode } from "react";

import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { BROWSE_LAYOUT_CLASS, type BrowseCrumb } from "@/lib/browsePaths";

interface LibraryBrowseLayoutProps {
  crumbs: BrowseCrumb[];
  children: ReactNode;
}

export function LibraryBrowseLayout({ crumbs, children }: LibraryBrowseLayoutProps) {
  const showCrumbs = crumbs.length > 0;

  return (
    <div className={`${BROWSE_LAYOUT_CLASS} justify-center flex flex-col`}>
      <BrowseBreadcrumbs crumbs={crumbs} />
      <div className={showCrumbs ? "min-w-0" : "min-h-screen min-w-0"}>{children}</div>
    </div>
  );
}
