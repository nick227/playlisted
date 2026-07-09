import type { ReactNode } from "react";

import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { BROWSE_LAYOUT_CLASS, type BrowseCrumb } from "@/lib/browsePaths";

interface LibraryBrowseLayoutProps {
  crumbs: BrowseCrumb[];
  children: ReactNode;
  layoutClass?: string;
}

export function LibraryBrowseLayout({
  crumbs,
  children,
  layoutClass = BROWSE_LAYOUT_CLASS,
}: LibraryBrowseLayoutProps) {
  return (
    <div className={`${layoutClass} flex flex-col`}>
      <BrowseBreadcrumbs crumbs={crumbs} />ssss
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
