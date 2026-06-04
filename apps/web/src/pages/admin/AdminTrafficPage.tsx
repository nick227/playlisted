import { useState } from "react";
import type { ChartRange } from "@playlisted/client-sdk";

import { useAdminTraffic } from "@/hooks/useAdminTraffic";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  GuestActivityCard,
  TrafficConsumersTable,
  TrafficInstrumentationGrid,
  TrafficLimitationsCard,
  TrafficMetricGrid,
  TrafficRangeToggle,
  TrafficReferrers,
  TrafficTopProfiles,
  TrafficTopRoutes,
  TrafficTrendGrid,
} from "@/pages/admin/AdminTrafficSections";

export function AdminTrafficPage() {
  const [range, setRange] = useState<ChartRange>("today");
  const { data, loading, error } = useAdminTraffic(range);

  usePageMeta({ title: "Traffic — Admin" });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Traffic</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Best available traffic signals</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
            Current schema can report profile views and engagement events. Full page views, anonymous unique visitors,
            exact time on site, and true click paths need additional event tracking.
          </p>
        </div>
        <TrafficRangeToggle range={range} onRangeChange={setRange} />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading traffic…</p>
      ) : error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      ) : data ? (
        <>
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm leading-relaxed text-amber-100">
            {data.caveat}
          </div>

          <TrafficMetricGrid totals={data.totals} />
          <TrafficInstrumentationGrid totals={data.totals} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
            <TrafficConsumersTable consumers={data.topConsumers} />
            <GuestActivityCard totals={data.totals} />
          </div>

          <TrafficTopRoutes routes={data.topRoutes} />

          <TrafficTrendGrid dailyProfileViews={data.dailyProfileViews} dailyPlays={data.dailyPlays} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TrafficTopProfiles profiles={data.topProfiles} />
            <TrafficReferrers referrers={data.referrers} />
          </div>

          <TrafficLimitationsCard limitations={data.limitations} />
        </>
      ) : null}
    </div>
  );
}
