import type { ReactNode } from "react";

import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { BROWSE_LAYOUT_CLASS, type BrowseCrumb } from "@/lib/browsePaths";

interface LibraryBrowseLayoutProps {
  crumbs: BrowseCrumb[];
  children: ReactNode;
}

export function LibraryBrowseLayout({ crumbs, children }: LibraryBrowseLayoutProps) {
  return (
    <div className={`${BROWSE_LAYOUT_CLASS} flex flex-col`}>
      <BrowseBreadcrumbs crumbs={crumbs} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
