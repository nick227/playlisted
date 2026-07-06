import type { ReactNode } from "react";

import { SectionHeader } from "./SectionHeader";

export type ContentRowLayout = "square" | "circle" | "feature" | "trackList";

interface ContentRowProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  layout?: ContentRowLayout;
  children: ReactNode;
  loading?: boolean;
  empty?: ReactNode;
}

export function ContentRow({
  title,
  subtitle,
  viewAllHref,
  children,
  empty,
}: ContentRowProps) {
  return (
    <section className="mb-4">
      <SectionHeader title={title} subtitle={subtitle} viewAllHref={viewAllHref} />
      {empty ?? (
        <div className="flex flex-wrap gap-4 justify-around lg:justify-start items-center">{children}</div>
      )}
    </section>
  );
}
