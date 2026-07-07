import type { ReactNode } from "react";

import { formatPlayCount } from "@/lib/format";

export function trackTitleClassName(active: boolean) {
  return [
    "block truncate text-sm font-medium hover:underline",
    active ? "text-[var(--color-brand)]" : "text-white",
  ].join(" ");
}

export function TrackRowPlayCount({
  count,
  suffix = " plays",
}: {
  count: number;
  suffix?: string;
}) {
  if (count <= 0) return null;

  return (
    <span className="hidden shrink-0 text-xs tabular-nums text-[var(--color-text-subtle)] sm:inline">
      {formatPlayCount(count)}
      {suffix}
    </span>
  );
}

export function TrackRowMetaStat({ children }: { children: ReactNode }) {
  return (
    <span className="hidden shrink-0 text-xs tabular-nums text-[var(--color-text-subtle)] md:inline">
      {children}
    </span>
  );
}

export function stopRowPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
