import type { AdminTrafficResponse, ChartRange } from "@playlisted/client-sdk";
import type { ReactNode } from "react";

const RANGES: { label: string; value: ChartRange }[] = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All", value: "all" },
];

type NumberKey<T> = {
  [K in keyof T]-?: T[K] extends number ? K : never;
}[keyof T];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function fmtDate(value: string | null): string {
  if (!value) return "No recent activity";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}>
      {children}
    </section>
  );
}

export function TrafficRangeToggle({
  range,
  onRangeChange,
}: {
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      {RANGES.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onRangeChange(item.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            range === item.value ? "bg-amber-400 text-black" : "text-[var(--color-text-muted)] hover:text-white"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub, badge }: { label: string; value: string; sub: string; badge: string }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
        <span className="rounded-full border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{sub}</p>
    </Panel>
  );
}

export function TrafficMetricGrid({ totals }: { totals: AdminTrafficResponse["totals"] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Profile page views"
        value={fmt(totals.profilePageViews)}
        sub="Observed public artist/profile page hits only."
        badge="Observed"
      />
      <MetricCard
        label="Unique views"
        value={fmt(totals.uniqueProfileViewsEstimate)}
        sub={`${fmt(totals.knownUniqueProfileViewers)} known logged-in viewers, ${fmt(totals.anonymousProfileViews)} anonymous views counted individually.`}
        badge="Estimate"
      />
      <MetricCard
        label="Time on site"
        value={fmtDuration(totals.avgKnownSessionSeconds)}
        sub={`${fmtDuration(totals.totalPlaySeconds)} observed listening time in this range.`}
        badge="Estimate"
      />
      <MetricCard
        label="Clickthrough"
        value={`${totals.clickthroughRateEstimate.toFixed(1)}%`}
        sub={`${fmt(totals.engagementActions)} downstream actions from plays, saves, and follows.`}
        badge="Estimate"
      />
    </div>
  );
}

export function TrafficConsumersTable({ consumers }: { consumers: AdminTrafficResponse["topConsumers"] }) {
  return (
    <Panel>
      <div className="px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Top logged-in consumers
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Ranked by tracked actions: plays, profile views, saves, and follows.
        </p>
      </div>
      <div className="mt-2 divide-y divide-[var(--color-border)]">
        {consumers.length ? (
          consumers.map((consumer, index) => (
            <div
              key={consumer.userId}
              className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-xs font-bold text-[var(--color-text-muted)]">{index + 1}</span>
                  <p className="truncate text-sm font-medium text-white">{consumer.displayName}</p>
                  <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {consumer.role}
                  </span>
                </div>
                <p className="ml-7 mt-1 text-xs text-[var(--color-text-muted)]">
                  @{consumer.username} · last seen {fmtDate(consumer.lastActivityAt)}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-2 text-right text-xs sm:min-w-[310px]">
                <span><strong className="block text-sm text-white">{fmt(consumer.totalActions)}</strong>total</span>
                <span><strong className="block text-sm text-white">{fmt(consumer.plays)}</strong>plays</span>
                <span><strong className="block text-sm text-white">{fmt(consumer.profileViews)}</strong>views</span>
                <span><strong className="block text-sm text-white">{fmt(consumer.saves)}</strong>saves</span>
                <span><strong className="block text-sm text-white">{fmt(consumer.follows)}</strong>follows</span>
              </div>
            </div>
          ))
        ) : (
          <p className="px-4 py-5 text-sm text-[var(--color-text-muted)]">
            No logged-in user activity recorded in this range.
          </p>
        )}
      </div>
    </Panel>
  );
}

export function GuestActivityCard({ totals }: { totals: AdminTrafficResponse["totals"] }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Guest activity</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-2xl font-extrabold text-white">{fmt(totals.anonymousProfileViews)}</p>
          <p className="text-xs text-[var(--color-text-muted)]">anonymous profile views</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-white">{fmt(totals.anonymousPlays)}</p>
          <p className="text-xs text-[var(--color-text-muted)]">anonymous plays</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Guest traffic can show demand, but not individual repeat behavior yet. Add a first-party visitor id to turn this
        into anonymous visitor cohorts without requiring login.
      </p>
    </Panel>
  );
}

export function TrafficInstrumentationGrid({ totals }: { totals: AdminTrafficResponse["totals"] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Human requests"
        value={fmt(totals.humanRequests)}
        sub={`${fmt(totals.requests)} total requests · ${fmt(totals.botRequests)} bot/synthetic`}
        badge="Observed"
      />
      <MetricCard
        label="Visitors"
        value={fmt(totals.uniqueVisitors)}
        sub={`${fmt(totals.activeVisitors)} active in the last 5 minutes`}
        badge="Observed"
      />
      <MetricCard
        label="P95 latency"
        value={`${fmt(totals.p95LatencyMs)}ms`}
        sub={`${fmt(totals.avgLatencyMs)}ms average response time`}
        badge="Observed"
      />
      <MetricCard
        label="Error rate"
        value={`${totals.errorRate.toFixed(1)}%`}
        sub={`${fmt(totals.errorRequests)} failed human requests · ${fmtBytes(totals.bandwidthBytes)} served`}
        badge="Observed"
      />
    </div>
  );
}

export function TrafficTopRoutes({ routes }: { routes: AdminTrafficResponse["topRoutes"] }) {
  return (
    <Panel>
      <div className="px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Top routes</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Bot-filtered request volume by API, upload, and page path.
        </p>
      </div>
      <div className="mt-2 divide-y divide-[var(--color-border)]">
        {routes.length ? (
          routes.map((route) => (
            <div key={`${route.method}:${route.path}`} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{route.path}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{route.method}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-right text-xs sm:min-w-[270px]">
                <span><strong className="block text-sm text-white">{fmt(route.requests)}</strong>req</span>
                <span><strong className="block text-sm text-white">{fmt(route.avgLatencyMs)}ms</strong>avg</span>
                <span><strong className="block text-sm text-white">{fmt(route.errors)}</strong>errors</span>
                <span><strong className="block text-sm text-white">{route.errorRate.toFixed(1)}%</strong>fail</span>
              </div>
            </div>
          ))
        ) : (
          <p className="px-4 py-5 text-sm text-[var(--color-text-muted)]">
            No request instrumentation recorded in this range yet.
          </p>
        )}
      </div>
    </Panel>
  );
}

function Sparkbar<T extends Record<string, unknown>, K extends NumberKey<T>>({
  data,
  valueKey,
  color,
  label,
}: {
  data: T[];
  valueKey: K;
  color: string;
  label: string;
}) {
  if (!data.length) {
    return <div className="flex h-20 items-end px-1 text-xs text-[var(--color-text-muted)]">No data yet</div>;
  }

  const max = Math.max(...data.map((item) => Number(item[valueKey])), 1);

  return (
    <div className="flex h-20 items-end gap-px overflow-hidden">
      {data.map((item, index) => {
        const value = Number(item[valueKey]);
        const pct = Math.max(3, Math.round((value / max) * 100));
        return (
          <div
            key={index}
            className={`${color} min-w-[3px] flex-1 rounded-sm opacity-80 transition-opacity hover:opacity-100`}
            style={{ height: `${pct}%` }}
            title={`${value} ${label}`}
          />
        );
      })}
    </div>
  );
}

export function TrafficTrendGrid({
  dailyProfileViews,
  dailyPlays,
}: {
  dailyProfileViews: AdminTrafficResponse["dailyProfileViews"];
  dailyPlays: AdminTrafficResponse["dailyPlays"];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Profile views trend
        </p>
        <Sparkbar data={dailyProfileViews} valueKey="views" color="bg-amber-400" label="views" />
      </Panel>
      <Panel className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Plays trend
        </p>
        <Sparkbar data={dailyPlays} valueKey="plays" color="bg-sky-400" label="plays" />
      </Panel>
    </div>
  );
}

export function TrafficTopProfiles({ profiles }: { profiles: AdminTrafficResponse["topProfiles"] }) {
  return (
    <Panel>
      <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Top viewed profiles
      </p>
      <div className="mt-2 divide-y divide-[var(--color-border)]">
        {profiles.length ? (
          profiles.map((profile) => (
            <div key={profile.userId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{profile.displayName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">@{profile.username}</p>
              </div>
              <span className="text-sm font-semibold text-amber-300">{fmt(profile.views)} views</span>
            </div>
          ))
        ) : (
          <p className="px-4 py-5 text-sm text-[var(--color-text-muted)]">No profile views recorded yet.</p>
        )}
      </div>
    </Panel>
  );
}

export function TrafficReferrers({ referrers }: { referrers: AdminTrafficResponse["referrers"] }) {
  return (
    <Panel>
      <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Referrers
      </p>
      <div className="mt-2 divide-y divide-[var(--color-border)]">
        {referrers.length ? (
          referrers.map((referrer) => (
            <div key={referrer.referrer} className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="min-w-0 truncate text-sm text-white">{referrer.referrer}</p>
              <span className="text-sm font-semibold text-amber-300">{fmt(referrer.views)}</span>
            </div>
          ))
        ) : (
          <p className="px-4 py-5 text-sm text-[var(--color-text-muted)]">No referrers recorded yet.</p>
        )}
      </div>
    </Panel>
  );
}

export function TrafficLimitationsCard({ limitations }: { limitations: AdminTrafficResponse["limitations"] }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">What is possible now?</p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </Panel>
  );
}
