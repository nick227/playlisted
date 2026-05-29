import { formatPlayCount, formatProfileDate } from "@/lib/format";

import type { ArtistProfileStats } from "./artistProfileUtils";

type ArtistProfileMetricsProps = {
  stats: ArtistProfileStats;
  accentHue: number;
};

const METRIC_ITEMS = [
  { key: "streams" as const, label: "Total streams", value: (s: ArtistProfileStats) => formatPlayCount(s.totalStreams) || "0" },
  { key: "tracks" as const, label: "Tracks", value: (s: ArtistProfileStats) => String(s.totalTracks) },
  { key: "collections" as const, label: "Collections", value: (s: ArtistProfileStats) => String(s.totalCollections) },
  { key: "duration" as const, label: "Catalog length", value: (s: ArtistProfileStats) => s.totalDurationLabel },
];

export function ArtistProfileMetrics({ stats, accentHue }: ArtistProfileMetricsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {METRIC_ITEMS.map((metric, index) => {
        const value = metric.value(stats);

        return (
          <article
            key={metric.key}
            className="relative overflow-hidden rounded-2xl border border-white/6 bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm"
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
              style={{ background: `hsl(${(accentHue + index * 40) % 360} 70% 50% / 0.15)` }}
            />
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-text-subtle)] uppercase">
              {metric.label}
            </p>
            <p className="mt-3 text-4xl font-black tracking-tighter text-white md:text-5xl">{value}</p>
          </article>
        );
      })}

      {(stats.firstUpload || stats.latestUpload) && (
        <article className="rounded-2xl border border-white/6 bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm sm:col-span-2 xl:col-span-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-text-subtle)] uppercase">
            Upload timeline
          </p>
          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-2 text-sm text-[var(--color-text-muted)]">
            {stats.firstUpload ? (
              <span>
                First release <strong className="text-white">{formatProfileDate(stats.firstUpload)}</strong>
              </span>
            ) : null}
            {stats.latestUpload ? (
              <span>
                Latest upload <strong className="text-white">{formatProfileDate(stats.latestUpload)}</strong>
              </span>
            ) : null}
          </div>
        </article>
      )}
    </section>
  );
}
