import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Skeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAnalyticsSummary, useAnalyticsRecordings } from "@/hooks/useAnalytics";
import { coverFallback } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { ChartRange } from "@playlisted/client-sdk";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtSeconds(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  current: number;
  previous: number;
  changePercent: number;
  accentColor: string;
  loading?: boolean;
}

function TrendBadge({ changePercent, previous }: { changePercent: number; previous: number }) {
  if (previous === 0) return null;
  const up = changePercent >= 0;
  const zero = changePercent === 0;
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        zero
          ? "bg-white/10 text-white/50"
          : up
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-rose-500/15 text-rose-400",
      ].join(" ")}
    >
      {zero ? (
        <Minus size={11} />
      ) : up ? (
        <ArrowUpRight size={11} />
      ) : (
        <ArrowDownRight size={11} />
      )}
      {Math.abs(changePercent)}%
    </span>
  );
}

function KpiCard({ label, value, current, previous, changePercent, accentColor, loading }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </p>
        <TrendBadge changePercent={changePercent} previous={previous} />
      </div>

      {loading ? (
        <Skeleton className="h-9 w-28" />
      ) : (
        <p className="text-3xl font-extrabold tracking-tight text-white" style={{ color: current > 0 ? undefined : "var(--color-text-subtle)" }}>
          {value}
        </p>
      )}

      {/* accent bar */}
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full" style={{ width: "100%", background: accentColor, opacity: current > 0 ? 0.7 : 0.15 }} />
      </div>
    </div>
  );
}

// ── track table ───────────────────────────────────────────────────────────────

type SortKey = "plays" | "duration" | "completion";
type SortDir = "asc" | "desc";

interface SortButtonProps {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: () => void;
}

function SortButton({ label, sortKey, active, dir, onClick }: SortButtonProps) {
  const isActive = active === sortKey;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition",
        isActive ? "text-white" : "text-[var(--color-text-muted)] hover:text-white",
      ].join(" ")}
    >
      {label}
      {isActive ? (dir === "desc" ? " ↓" : " ↑") : ""}
    </button>
  );
}

// ── range tabs ────────────────────────────────────────────────────────────────

const RANGES: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

// ── page ──────────────────────────────────────────────────────────────────────

export function StudioAnalyticsPage() {
  const [range, setRange] = useState<ChartRange>("30d");
  const [sortBy, setSortBy] = useState<SortKey>("plays");

  usePageMeta({ title: "Analytics — Studio" });
  const [order, setOrder] = useState<SortDir>("desc");

  const summary = useAnalyticsSummary(range);
  const recordings = useAnalyticsRecordings(range, sortBy, order);

  function handleSort(key: SortKey) {
    if (key === sortBy) {
      setOrder((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(key);
      setOrder("desc");
    }
  }

  const s = summary.data?.summary;
  const tracks = recordings.data?.data ?? [];
  const hasAnyPlays = (s?.totalPlays.current ?? 0) > 0 || tracks.some((t) => t.totalPlays > 0);
  const maxPlays = tracks[0]?.totalPlays ?? 1;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">
        Artist studio
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">Analytics</h1>

        {/* Range selector */}
        <div className="flex rounded-full border border-white/[0.12] bg-[var(--color-surface)] p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                range === r.value
                  ? "bg-white text-black"
                  : "text-[var(--color-text-muted)] hover:text-white",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Profile views"
          value={fmtNumber(s?.totalPageViews.current ?? 0)}
          current={s?.totalPageViews.current ?? 0}
          previous={s?.totalPageViews.previous ?? 0}
          changePercent={s?.totalPageViews.changePercent ?? 0}
          accentColor="#06b6d4"
          loading={summary.isLoading}
        />
        <KpiCard
          label="Total plays"
          value={fmtNumber(s?.totalPlays.current ?? 0)}
          current={s?.totalPlays.current ?? 0}
          previous={s?.totalPlays.previous ?? 0}
          changePercent={s?.totalPlays.changePercent ?? 0}
          accentColor="#10b981"
          loading={summary.isLoading}
        />
        <KpiCard
          label="Time listened"
          value={fmtSeconds(s?.totalPlaySeconds.current ?? 0)}
          current={s?.totalPlaySeconds.current ?? 0}
          previous={s?.totalPlaySeconds.previous ?? 0}
          changePercent={s?.totalPlaySeconds.changePercent ?? 0}
          accentColor="#8b5cf6"
          loading={summary.isLoading}
        />
        <KpiCard
          label="Avg completion"
          value={`${s?.avgCompletionRate.current ?? 0}%`}
          current={s?.avgCompletionRate.current ?? 0}
          previous={s?.avgCompletionRate.previous ?? 0}
          changePercent={s?.avgCompletionRate.changePercent ?? 0}
          accentColor="#f43f5e"
          loading={summary.isLoading}
        />
      </div>

      {/* Track table */}
      <div className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight text-white">Track performance</h2>
          <div className="flex items-center gap-5">
            <SortButton label="Plays" sortKey="plays" active={sortBy} dir={order} onClick={() => handleSort("plays")} />
            <SortButton label="Time" sortKey="duration" active={sortBy} dir={order} onClick={() => handleSort("duration")} />
            <SortButton label="Completion" sortKey="completion" active={sortBy} dir={order} onClick={() => handleSort("completion")} />
          </div>
        </div>

        {recordings.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : !hasAnyPlays || tracks.length === 0 ? (
          <EmptyState
            title="No play data yet"
            description="Once listeners play your tracks, stats will appear here."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {tracks.map((track, i) => {
              const barWidth = maxPlays > 0 ? Math.round((track.totalPlays / maxPlays) * 100) : 0;

              return (
                <div
                  key={track.recordingId}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-white/[0.06] bg-[var(--color-surface)] px-4 py-3 transition hover:border-white/[0.12]"
                >
                  {/* play-bar background */}
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 bg-white/[0.03] transition-all group-hover:bg-white/[0.05]"
                    style={{ width: `${barWidth}%` }}
                  />

                  {/* rank */}
                  <span className="relative w-5 shrink-0 text-right text-xs font-bold text-[var(--color-text-subtle)]">
                    {i + 1}
                  </span>

                  {/* artwork */}
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" style={{ background: coverFallback(track.title) }} aria-hidden />
                    )}
                  </div>

                  {/* title */}
                  <div className="relative min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                    {track.durationSeconds ? (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {fmtSeconds(track.durationSeconds)}
                      </p>
                    ) : null}
                  </div>

                  {/* plays */}
                  <div className="relative w-20 shrink-0 text-right">
                    <p className="text-sm font-bold text-white">{fmtNumber(track.totalPlays)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">plays</p>
                  </div>

                  {/* time listened */}
                  <div className="relative w-20 shrink-0 text-right">
                    <p className="text-sm font-bold text-white">{fmtSeconds(track.totalPlaySeconds)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">listened</p>
                  </div>

                  {/* completion bar + % */}
                  <div className="relative w-24 shrink-0">
                    <div className="mb-1 flex justify-end">
                      <span className="text-xs font-semibold text-white">{track.completionRate}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: `${track.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
