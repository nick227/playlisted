import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Pause, Play, Radio, Users, Upload, Volume2, VolumeX } from "lucide-react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { authedApi } from "@/lib/authedApi";
import { coverFallback, playlistPath, studioCollectionEditPath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

function formatTime(totalSeconds?: number | null) {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return "0:00";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function RadioPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { status, user, accessToken } = useAuth();
  const {
    playing,
    volume: radioVolume,
    setVolume: setRadioVolume,
    togglePlayback,
    radioQuery,
    station,
    nowPlaying,
    isLive,
    registerRadioUi,
    unregisterRadioUi,
  } = useRadioPlayer();

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [volumeOpen, setVolumeOpen] = useState(false);

  usePageMeta({ title: "Radio" });

  const radioClient = useMemo(() => authedApi(accessToken), [accessToken]);

  const statusLabel = radioQuery.isError ? "Unavailable" : isLive ? "Live" : "Offline";

  const description =
    nowPlaying?.description?.trim() ||
    [nowPlaying?.uploader.displayName, nowPlaying?.playlist.title].filter(Boolean).join(" · ");

  const artStyle = useMemo(() => {
    if (nowPlaying?.artworkUrl) return { backgroundImage: `url(${nowPlaying.artworkUrl})` };
    return { background: coverFallback(nowPlaying?.title ?? "Radio") };
  }, [nowPlaying?.artworkUrl, nowPlaying?.title]);

  const progressPct =
    nowPlaying?.durationSeconds
      ? Math.min(100, ((nowPlaying.elapsedSeconds ?? 0) / nowPlaying.durationSeconds) * 100)
      : null;
  const elapsedLabel = nowPlaying?.durationSeconds ? formatTime(nowPlaying.elapsedSeconds) : null;
  const durationLabel = nowPlaying?.durationSeconds ? formatTime(nowPlaying.durationSeconds) : null;

  const playlistUrl = nowPlaying
    ? playlistPath({ id: nowPlaying.playlist.id, slug: nowPlaying.playlist.slug, username: nowPlaying.uploader.username })
    : null;

  useEffect(() => {
    registerRadioUi();
    return unregisterRadioUi;
  }, [registerRadioUi, unregisterRadioUi]);

  const submissionCollectionMutation = useMutation({
    mutationFn: () =>
      radioClient.playlists.create({
        ownerId: user!.id,
        title: "Untitled collection",
        type: "PLAYLIST",
        status: "PUBLISHED",
        visibility: "PUBLIC",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      navigate(studioCollectionEditPath(created.id));
    },
  });

  function handleSubmitSong() {
    if (status !== "authenticated" || !user) {
      navigate("/login", { state: { from: location.pathname }, replace: false });
      return;
    }

    if (submissionCollectionMutation.isPending) return;
    submissionCollectionMutation.mutate();
  }

  function calculateFontSize(text: string): number {
    const minFontSize = 24;
    const maxFontSize = 70;
    const minChars = 25;
    const maxChars = 40;

    const length = Math.max(minChars, Math.min(maxChars, text.length));
    const ratio = (length - minChars) / (maxChars - minChars);
    
    return maxFontSize - (ratio * (maxFontSize - minFontSize));
  }

  function MagicFont({ children }: { children: string }) {
    const text = children || "";
    const fontSize = calculateFontSize(text);
    return <span style={{ fontSize: `${fontSize}px`, display: "block", lineHeight: "1" }}>{text}</span>;
  }

  const pageMinHeight = isEmbedded
    ? "min-h-[calc(100svh-var(--spacing-topbar)-2rem)]"
    : "min-h-[calc(100svh-var(--spacing-topbar)-3rem)]";
  const artworkClassName =
    "aspect-square w-full rounded-[1.4rem] border border-white/[0.08] bg-white/5 bg-cover bg-center shadow-[0_26px_80px_rgba(0,0,0,0.44)]";

  return (
    <div className={`flex justify-center items-center relative isolate -mx-4 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${pageMinHeight}`}>
      <div className="mx-auto flex w-full max-w-[30rem] flex-col items-center">
        {radioQuery.isError ? (
          <div className="mb-5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200 shadow-lg shadow-black/20 backdrop-blur">
            Couldn&apos;t load radio.{" "}
            <button
              type="button"
              onClick={() => void radioQuery.refetch()}
              className="font-semibold underline underline-offset-2 hover:text-white"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="mb-5 flex h-8 items-center justify-center gap-2 rounded-full border border-white/[0.08] px-3 text-xs font-semibold uppercase text-white/78">
          <PlaybackBars active={isLive} playing={playing} variant="thumb" barCount={7} />
          <span className="text-[var(--color-brand)]">{statusLabel}</span>
          {isLive && station?.listenerCount != null ? (
            <span className="flex items-center gap-1 border-l border-white/10 pl-2 text-white/72">
              <Users size={12} />
              {station.listenerCount}
            </span>
          ) : null}
        </div>

        <div className="relative w-full max-w-[min(74vw,23rem)]">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-white/[0.035] blur-xl" />
          {playlistUrl ? (
            <Link
              to={playlistUrl}
              className={`${artworkClassName} block transition duration-300 hover:scale-[1.012] hover:brightness-105`}
              style={artStyle}
              aria-label={`Go to playlist: ${nowPlaying?.playlist.title}`}
            />
          ) : (
            <div className={artworkClassName} style={artStyle} />
          )}
        </div>

        <div className="mt-7 flex min-h-[8.75rem] w-full flex-col items-center justify-start text-center sm:min-h-[9.35rem]">
          <p className="mb-3 flex h-5 max-w-full items-center gap-2 truncate text-xs font-semibold uppercase text-white/42 bg-[var(--color-canvas)] px-2 py-1 rounded-full">
            <Radio size={13} className="shrink-0 text-[var(--color-brand)]" />
            <span className="truncate">{station?.name ?? "Playlisted Radio"}</span>
          </p>
          <h1 className="grid min-h-[4.9rem] max-w-full place-items-center overflow-hidden text-balance text-[clamp(2rem,8vw,3.75rem)] font-black leading-[0.98] text-white line-height-none">
            {playlistUrl ? (
              <Link
                to={playlistUrl}
                className="overflow-hidden transition hover:text-[var(--color-brand)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] bg-[var(--color-canvas)]/80 rounded-sm p-2"
              >
                <MagicFont>{nowPlaying?.title ?? "Radio"}</MagicFont>
              </Link>
            ) : (
              <span className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] bg-[var(--color-canvas)]/80 rounded-sm">
                {nowPlaying?.title ?? "Radio"}
              </span>
            )}
          </h1>

          <p className="mt-3 h-7 max-w-full truncate text-base leading-7 text-[var(--color-text-muted)] bg-[var(--color-canvas)]/80 rounded-sm px-4">
            {description}
          </p>
        </div>

        <div className="mt-1 w-full max-w-[min(74vw,23rem)]">
          <div className="flex h-5 items-center justify-between text-[0.7rem] font-medium text-white/36">
            <span>{elapsedLabel ?? "Live"}</span>
            <span>{durationLabel ?? "On air"}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10 shadow-inner shadow-black/20">
            {progressPct !== null ? (
              <div
                className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            ) : (
              <div className="h-full w-1/3 rounded-full bg-[var(--color-brand)]/70" />
            )}
          </div>
        </div>

        <div className="mt-8 flex h-16 items-center justify-center gap-4">
          <div
            className="group/volume relative flex h-11 w-11 items-center justify-center"
            onMouseEnter={() => setVolumeOpen(true)}
            onMouseLeave={() => setVolumeOpen(false)}
          >
            <div
              className={`absolute bottom-[3.25rem] left-1/2 flex h-36 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-black/70 py-4 shadow-2xl shadow-black/40 backdrop-blur-md transition ${
                volumeOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
              } group-hover/volume:pointer-events-auto group-hover/volume:translate-y-0 group-hover/volume:opacity-100`}
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={radioVolume}
                onChange={(e) => setRadioVolume(Number(e.target.value))}
                className="h-24 w-2 cursor-pointer accent-white [direction:rtl] [writing-mode:vertical-lr]"
                aria-label="Radio volume"
              />
            </div>
            <button
              type="button"
              onClick={() => setVolumeOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] text-white/72 shadow-lg shadow-black/20 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white bg-[var(--color-surface)]/80 rounded-full"
              aria-label="Adjust radio volume"
              aria-expanded={volumeOpen}
            >
              {radioVolume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => void togglePlayback()}
            disabled={!nowPlaying?.audioUrl}
            className="inline-flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_18px_46px_rgba(0,0,0,0.42)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 bg-[var(--color-surface)]/80 rounded-full"
            aria-label={playing ? "Pause radio" : "Play radio"}
          >
            {playing ? (
              <Pause size={26} fill="currentColor" />
            ) : (
              <Play size={26} fill="currentColor" className="ml-1" />
            )}
          </button>

          {isLive && nowPlaying ? (
            <FavoriteHeartButton
              target="recording"
              id={nowPlaying.id}
              variant="inline"
              inlineAlwaysVisible
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] p-0 text-white/72 shadow-lg shadow-black/20 transition hover:border-rose-400/35 hover:bg-white/[0.09] hover:text-rose-400 bg-[var(--color-surface)]/80"
            />
          ) : (
            <span className="h-11 w-11" aria-hidden="true" />
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleSubmitSong}
            disabled={status === "loading" || submissionCollectionMutation.isPending}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg shadow-black/25 backdrop-blur transition hover:border-[var(--color-brand)]/40 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-60 bg-[var(--color-surface)]/80"
            aria-label="Submit a song"
          >
            <Upload size={17} className="text-[var(--color-brand)]" />
          </button>
          <Link
            to="/chat"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] text-white shadow-lg shadow-black/25 backdrop-blur transition hover:border-[var(--color-brand)]/40 hover:bg-white/[0.09] bg-[var(--color-surface)]/80 rounded-full"
            aria-label="Open radio chat"
          >
            <MessageCircle size={17} className="text-[var(--color-brand)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
