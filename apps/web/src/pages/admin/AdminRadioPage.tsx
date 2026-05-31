import { useQuery } from "@tanstack/react-query";
import { Radio, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { formatDuration } from "@/lib/format";
import { coverFallback } from "@/lib/routes";
import { authedApi } from "@/lib/authedApi";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";

export function AdminRadioPage() {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);

  usePageMeta({ title: "Radio Admin" });

  const radioQuery = useQuery({
    queryKey: ["radio", "admin"],
    queryFn: () => client.radio.adminGet(),
    enabled: Boolean(accessToken),
    refetchInterval: 10_000,
  });

  const station = radioQuery.data;
  const nowPlaying = station?.nowPlaying;
  const isLive = station?.status === "LIVE" && Boolean(nowPlaying);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Sitewide radio
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            Radio status
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
            The station is generated automatically from public, published tracks with durations.
          </p>
        </div>
        <Link
          to="/radio"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-white transition hover:border-amber-400"
        >
          <Radio size={16} />
          Open radio
        </Link>
      </header>

      {radioQuery.isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <section className="rounded-2xl border border-white/[0.08] bg-[var(--color-surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-amber-400">
                <PlaybackBars active={isLive} playing={isLive} variant="thumb" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">{station?.name ?? "Playlisted Radio"}</p>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                  {isLive ? "Live from public catalog" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/15 px-4 py-3">
              <UsersRound size={18} className="text-amber-400" />
              <span className="text-sm font-semibold text-white">{station?.listenerCount ?? 0}</span>
              <span className="text-sm text-[var(--color-text-muted)]">listeners</span>
            </div>
          </div>

          {nowPlaying ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-[160px_1fr]">
              <div
                className="aspect-square rounded-lg bg-white/5 bg-cover bg-center"
                style={{
                  backgroundImage: nowPlaying.artworkUrl ? `url(${nowPlaying.artworkUrl})` : undefined,
                  background: nowPlaying.artworkUrl ? undefined : coverFallback(nowPlaying.title),
                }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                  Now playing
                </p>
                <h3 className="mt-2 truncate text-3xl font-extrabold tracking-tight text-white">
                  {nowPlaying.title}
                </h3>
                <p className="mt-2 truncate text-sm text-[var(--color-text-muted)]">
                  {nowPlaying.uploader.displayName} · {nowPlaying.playlist.title}
                </p>
                <div className="mt-6 max-w-xl">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.min(100, ((nowPlaying.elapsedSeconds ?? 0) / Math.max(1, nowPlaying.durationSeconds ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-[var(--color-text-subtle)]">
                    <span>{formatDuration(nowPlaying.elapsedSeconds ?? 0)}</span>
                    <span>{formatDuration(nowPlaying.durationSeconds ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                title="No playable radio tracks"
                description="Publish public tracks with duration metadata to start the station."
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
