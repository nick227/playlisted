import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAnalyticsSummary, useAnalyticsRecordings, useAnalyticsPlaylists } from "@/hooks/useAnalytics";
import { coverFallback, playlistIdPath, playlistRecordingPath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { ChartRange } from "@playlisted/client-sdk";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtSeconds(s: number) {
  if (!Number.isFinite(s) || s <= 0) return "0s";
  if (s < 60) return `${Math.floor(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtNumber(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.floor(n));
}

function fmtPercent(n: number) {
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(Math.abs(n))}%`;
}

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
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
  showTrend?: boolean;
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
      {fmtPercent(changePercent)}
    </span>
  );
}

function KpiCard({ label, value, current, previous, changePercent, accentColor, loading, showTrend = true }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </p>
        {!loading && showTrend ? <TrendBadge changePercent={changePercent} previous={previous} /> : null}
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

type TrackSortKey = "plays" | "duration" | "completion";
type PlaylistSortKey = "plays" | "duration" | "completion" | "likes" | "follows";
type SortKey = TrackSortKey | PlaylistSortKey;
type SortDir = "asc" | "desc";
type PerformanceTab = "tracks" | "playlists";

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
  const [sortBy, setSortBy] = useState<TrackSortKey>("plays");

  usePageMeta({ title: "Analytics — Studio" });
  const [order, setOrder] = useState<SortDir>("desc");
  const [playlistSortBy, setPlaylistSortBy] = useState<PlaylistSortKey>("plays");
  const [playlistOrder, setPlaylistOrder] = useState<SortDir>("desc");
  const [activeTab, setActiveTab] = useState<PerformanceTab>("tracks");

  const summary = useAnalyticsSummary(range);
  const recordings = useAnalyticsRecordings(range, sortBy, order);
  const playlists = useAnalyticsPlaylists(range, playlistSortBy, playlistOrder);

  function handleSort(key: TrackSortKey) {
    if (key === sortBy) {
      setOrder((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(key);
      setOrder("desc");
    }
  }

  function handlePlaylistSort(key: PlaylistSortKey) {
    if (key === playlistSortBy) {
      setPlaylistOrder((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setPlaylistSortBy(key);
      setPlaylistOrder("desc");
    }
  }

  const s = summary.data?.summary;
  const tracks = recordings.data?.data ?? [];
  const playlistRows = playlists.data?.data ?? [];
  const hasAnyPlays = (s?.totalPlays.current ?? 0) > 0 || tracks.some((t) => t.totalPlays > 0);
  const hasAnyPlaylistPlays = (s?.playlistPlays.current ?? 0) > 0 || playlistRows.some((p) => p.totalPlays > 0);
  const maxPlays = Math.max(1, ...tracks.map((t) => t.totalPlays));
  const maxPlaylistPlays = Math.max(1, ...playlistRows.map((p) => p.totalPlays));
  const showTrends = range !== "all";

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <Link
        to="/studio"
        className="mb-4 inline-flex text-sm font-semibold text-[var(--color-brand)] hover:underline"
      >
        ← Back to studio
      </Link>
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
          showTrend={showTrends}
        />
        <KpiCard
          label="Total plays"
          value={fmtNumber(s?.totalPlays.current ?? 0)}
          current={s?.totalPlays.current ?? 0}
          previous={s?.totalPlays.previous ?? 0}
          changePercent={s?.totalPlays.changePercent ?? 0}
          accentColor="#10b981"
          loading={summary.isLoading}
          showTrend={showTrends}
        />
        <KpiCard
          label="Time listened"
          value={fmtSeconds(s?.totalPlaySeconds.current ?? 0)}
          current={s?.totalPlaySeconds.current ?? 0}
          previous={s?.totalPlaySeconds.previous ?? 0}
          changePercent={s?.totalPlaySeconds.changePercent ?? 0}
          accentColor="#8b5cf6"
          loading={summary.isLoading}
          showTrend={showTrends}
        />
        <KpiCard
          label="Avg completion"
          value={`${clampPercent(s?.avgCompletionRate.current ?? 0)}%`}
          current={s?.avgCompletionRate.current ?? 0}
          previous={s?.avgCompletionRate.previous ?? 0}
          changePercent={s?.avgCompletionRate.changePercent ?? 0}
          accentColor="#f43f5e"
          loading={summary.isLoading}
          showTrend={showTrends}
        />
        <KpiCard
          label="Total likes"
          value={fmtNumber(s?.totalLikes.current ?? 0)}
          current={s?.totalLikes.current ?? 0}
          previous={s?.totalLikes.previous ?? 0}
          changePercent={s?.totalLikes.changePercent ?? 0}
          accentColor="#fb7185"
          loading={summary.isLoading}
          showTrend={showTrends}
        />
        <KpiCard
          label="Total follows"
          value={fmtNumber(s?.totalFollows.current ?? 0)}
          current={s?.totalFollows.current ?? 0}
          previous={s?.totalFollows.previous ?? 0}
          changePercent={s?.totalFollows.changePercent ?? 0}
          accentColor="#f59e0b"
          loading={summary.isLoading}
          showTrend={showTrends}
        />
        <KpiCard
          label="Playlist plays"
          value={fmtNumber(s?.playlistPlays.current ?? 0)}
          current={s?.playlistPlays.current ?? 0}
          previous={s?.playlistPlays.previous ?? 0}
          changePercent={s?.playlistPlays.changePercent ?? 0}
          accentColor="#14b8a6"
          loading={summary.isLoading}
          showTrend={showTrends}
        />
        <KpiCard
          label="Song adds"
          value={fmtNumber(s?.songAdds.current ?? 0)}
          current={s?.songAdds.current ?? 0}
          previous={s?.songAdds.previous ?? 0}
          changePercent={s?.songAdds.changePercent ?? 0}
          accentColor="#a3e635"
          loading={summary.isLoading}
          showTrend={showTrends}
        />
      </div>

      <div className="mt-10 flex rounded-full border border-white/[0.12] bg-[var(--color-surface)] p-1 sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("tracks")}
          className={[
            "flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition sm:flex-none",
            activeTab === "tracks"
              ? "bg-white text-black"
              : "text-[var(--color-text-muted)] hover:text-white",
          ].join(" ")}
        >
          Songs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("playlists")}
          className={[
            "flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition sm:flex-none",
            activeTab === "playlists"
              ? "bg-white text-black"
              : "text-[var(--color-text-muted)] hover:text-white",
          ].join(" ")}
        >
          Playlists
        </button>
      </div>

      {activeTab === "tracks" ? (
        <div className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">Track performance</h2>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
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
              const completion = clampPercent(track.completionRate);
              const playlistHref = playlistIdPath(track.playlistId);
              const trackHref = playlistRecordingPath(
                { id: track.playlistId },
                { title: track.title },
              );

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
                    <Link
                      to={trackHref}
                      className="relative block truncate text-sm font-semibold text-white transition hover:text-[var(--color-brand)] hover:underline"
                    >
                      {track.title}
                    </Link>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      <Link
                        to={playlistHref}
                        className="transition hover:text-white hover:underline"
                      >
                        {track.playlistTitle}
                      </Link>
                      {track.durationSeconds ? ` · ${fmtSeconds(track.durationSeconds)}` : ""}
                    </p>
                  </div>

                  {/* plays */}
                  <div className="relative w-20 shrink-0 text-right">
                    <p className="text-sm font-bold text-white">{fmtNumber(track.totalPlays)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">plays</p>
                  </div>

                  {/* time listened */}
                  <div className="relative hidden w-20 shrink-0 text-right sm:block">
                    <p className="text-sm font-bold text-white">{fmtSeconds(track.totalPlaySeconds)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">listened</p>
                  </div>

                  {/* likes */}
                  <div className="relative hidden w-16 shrink-0 text-right md:block">
                    <p className="text-sm font-bold text-white">{fmtNumber(track.likes)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">likes</p>
                  </div>

                  {/* completion */}
                  <div className="relative hidden w-20 shrink-0 text-right sm:block">
                    <p className="text-sm font-bold text-white">{completion}%</p>
                    <p className="text-xs text-[var(--color-text-muted)]">complete</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      ) : (
        <div className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">Playlist performance</h2>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <SortButton label="Plays" sortKey="plays" active={playlistSortBy} dir={playlistOrder} onClick={() => handlePlaylistSort("plays")} />
            <SortButton label="Time" sortKey="duration" active={playlistSortBy} dir={playlistOrder} onClick={() => handlePlaylistSort("duration")} />
            <SortButton label="Completion" sortKey="completion" active={playlistSortBy} dir={playlistOrder} onClick={() => handlePlaylistSort("completion")} />
            <SortButton label="Likes" sortKey="likes" active={playlistSortBy} dir={playlistOrder} onClick={() => handlePlaylistSort("likes")} />
            <SortButton label="Follows" sortKey="follows" active={playlistSortBy} dir={playlistOrder} onClick={() => handlePlaylistSort("follows")} />
          </div>
        </div>

        {playlists.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : playlistRows.length === 0 ? (
          <EmptyState
            title="No playlists yet"
            description="Create playlists to see how they move listeners through your catalog."
          />
        ) : !hasAnyPlaylistPlays ? (
          <EmptyState
            title="No playlist play data yet"
            description="Once listeners play tracks from your playlists, playlist stats will appear here."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {playlistRows.map((playlist, i) => {
              const barWidth = Math.round((playlist.totalPlays / maxPlaylistPlays) * 100);
              const completion = clampPercent(playlist.completionRate);
              const playlistHref = playlistIdPath(playlist.playlistId);
              const topTrackHref = playlist.topRecordingId
                ? playlistRecordingPath(
                    { id: playlist.playlistId },
                    { title: playlist.topRecordingTitle ?? "" },
                  )
                : null;

              return (
                <div
                  key={playlist.playlistId}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-white/[0.06] bg-[var(--color-surface)] px-4 py-3 transition hover:border-white/[0.12]"
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 bg-white/[0.03] transition-all group-hover:bg-white/[0.05]"
                    style={{ width: `${barWidth}%` }}
                  />

                  <span className="relative w-5 shrink-0 text-right text-xs font-bold text-[var(--color-text-subtle)]">
                    {i + 1}
                  </span>

                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                    {playlist.coverArtUrl ? (
                      <img src={playlist.coverArtUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" style={{ background: coverFallback(playlist.title) }} aria-hidden />
                    )}
                  </div>

                  <div className="relative min-w-0 flex-1">
                    <Link
                      to={playlistHref}
                      className="relative block truncate text-sm font-semibold text-white transition hover:text-[var(--color-brand)] hover:underline"
                    >
                      {playlist.title}
                    </Link>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {fmtNumber(playlist.trackCount)} songs
                      {playlist.topRecordingTitle && topTrackHref ? (
                        <>
                          {" · Top track: "}
                          <Link
                            to={topTrackHref}
                            className="transition hover:text-white hover:underline"
                          >
                            {playlist.topRecordingTitle}
                          </Link>
                          {` · ${fmtNumber(playlist.topRecordingPlays)} plays`}
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="relative hidden w-16 shrink-0 text-right md:block">
                    <p className="text-sm font-bold text-white">{fmtNumber(playlist.trackCount)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">songs</p>
                  </div>

                  <div className="relative w-20 shrink-0 text-right">
                    <p className="text-sm font-bold text-white">{fmtNumber(playlist.totalPlays)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">plays</p>
                  </div>

                  <div className="relative hidden w-20 shrink-0 text-right sm:block">
                    <p className="text-sm font-bold text-white">{fmtSeconds(playlist.totalPlaySeconds)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">listened</p>
                  </div>

                  <div className="relative hidden w-20 shrink-0 text-right md:block">
                    <p className="text-sm font-bold text-white">{fmtNumber(playlist.followers)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">follows</p>
                  </div>

                  <div className="relative hidden w-20 shrink-0 text-right lg:block">
                    <p className="text-sm font-bold text-white">{completion}%</p>
                    <p className="text-xs text-[var(--color-text-muted)]">complete</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}
    </div>
  );
}
