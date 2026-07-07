import { useState, useEffect, useMemo } from "react";
import type { AdminDashboardResponse } from "@playlisted/client-sdk";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  if (h >= 1000) return `${fmt(h)}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-amber-400/30 bg-amber-400/5" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}>
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tracking-tight ${accent ? "text-amber-400" : "text-white"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{sub}</p>}
    </div>
  );
}

function Sparkbar({ data, valueKey, label = "plays", color = "bg-amber-400" }: { data: Record<string, number>[]; valueKey: string; label?: string; color?: string }) {
  if (!data.length) return <div className="h-16 flex items-end text-xs text-[var(--color-text-muted)] px-1">No data yet</div>;
  const max = Math.max(...data.map((d) => d[valueKey] ?? 0), 1);
  return (
    <div className="flex h-16 items-end gap-px overflow-hidden">
      {data.map((d, i) => {
        const pct = Math.max(2, Math.round(((d[valueKey] ?? 0) / max) * 100));
        return (
          <div
            key={i}
            title={`${d[valueKey]} ${label}`}
            style={{ height: `${pct}%`, flex: 1 }}
            className={`${color} rounded-sm opacity-80 hover:opacity-100 transition-opacity min-w-[2px]`}
          />
        );
      })}
    </div>
  );
}

export function AdminDashboardPage() {
  const { accessToken } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({ title: "Dashboard — Admin" });

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.admin.getDashboard()
      .then(setData)
      .catch((e: any) => setError(e.message ?? "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <p className="text-sm text-[var(--color-text-muted)]">Loading dashboard…</p>;
  if (error) return <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>;
  if (!data) return null;

  const { totals, hourlyPlays, dailyPlays, dailyNewUsers, topSongsToday } = data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Dashboard</p>
        <h2 className="mt-1 text-2xl font-bold text-white">At a glance</h2>
      </div>

      {/* Top-level stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={fmt(totals.users.total)} sub={`+${totals.users.newToday} today · +${totals.users.newThisWeek} this week`} />
        <StatCard label="Published songs" value={fmt(totals.songs.published)} sub={`${totals.songs.draft} drafts · ${totals.songs.total} total`} />
        <StatCard label="Published playlists" value={fmt(totals.playlists.published)} sub={`${totals.playlists.total} total`} />
        <StatCard label="Plays today" value={fmt(totals.plays.today)} sub={`${fmt(totals.plays.total)} all time`} accent />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Listen time today" value={fmtHours(totals.playSeconds.today)} sub={`${fmtHours(totals.playSeconds.total)} all time`} />
        <StatCard label="Saves" value={fmt(totals.saves)} />
        <StatCard label="Follows" value={fmt(totals.follows)} />
        <StatCard label="Songs / playlists ratio" value={`${totals.songs.total > 0 ? (totals.playlists.total / totals.songs.total).toFixed(2) : "—"}`} sub="playlists per song" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Plays — last 24h (by hour)</p>
          <Sparkbar data={hourlyPlays as any} valueKey="plays" label="plays" color="bg-amber-400" />
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{hourlyPlays.length} hours with activity</p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Plays — last 30 days</p>
          <Sparkbar data={dailyPlays as any} valueKey="plays" label="plays" color="bg-blue-400" />
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{dailyPlays.reduce((a, d) => a + d.plays, 0)} plays in window</p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">New users — last 30 days</p>
          <Sparkbar data={dailyNewUsers as any} valueKey="newUsers" label="new users" color="bg-green-400" />
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{dailyNewUsers.reduce((a, d) => a + d.newUsers, 0)} new users in window</p>
        </div>
      </div>

      {/* Top songs today */}
      {topSongsToday.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <p className="px-4 pt-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Top songs today</p>
          <div className="mt-2 divide-y divide-[var(--color-border)]">
            {topSongsToday.map((song, i) => (
              <div key={song.recordingId} className="flex items-center gap-3 px-4 py-3">
                <span className="w-5 text-xs font-bold text-[var(--color-text-muted)] shrink-0">{i + 1}</span>
                {song.artworkUrl ? (
                  <img src={song.artworkUrl} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded bg-zinc-800 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{song.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{song.artist}</p>
                </div>
                <span className="text-sm font-semibold text-amber-400 shrink-0">{fmt(song.plays)} plays</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
