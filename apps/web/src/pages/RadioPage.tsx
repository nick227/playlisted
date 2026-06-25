import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Pause, Play, Send, Users, X } from "lucide-react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { api } from "@/lib/api";
import { authedApi } from "@/lib/authedApi";
import { coverFallback, playlistPath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import theatreController from "@/theatre/controller/lazyController";
import { setRadioPlaybackActive } from "@/theatre/radioPlaybackBridge";

const LISTENER_ID_KEY = "playlisted.radio.listenerId";
const MAX_MSG_LENGTH = 300;
const TEXTAREA_MAX_H = 96;
const RADIO_TRANSITION_RETRY_MS = 1000;
const RADIO_TRANSITION_MAX_RETRIES = 8;

function getListenerId() {
  const existing = window.localStorage.getItem(LISTENER_ID_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(LISTENER_ID_KEY, next);
  return next;
}

function getAnonName(listenerId: string) {
  return `anon-${listenerId.slice(0, 4)}`;
}

function timeAgo(isoString: string) {
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  return `${Math.floor(diffMin / 60)}h`;
}

function getAudioHref(audioUrl: string) {
  return new URL(audioUrl, window.location.origin).href;
}

function getRadioSeekTime(elapsedSeconds: number | null | undefined, durationSeconds: number | null | undefined) {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds ?? 0) : 0;
  if (!Number.isFinite(durationSeconds) || !durationSeconds || durationSeconds <= 0) return elapsed;
  return Math.min(elapsed, Math.max(0, durationSeconds - 0.25));
}

function isRadioElapsedAtEnd(elapsedSeconds: number | null | undefined, durationSeconds: number | null | undefined) {
  return (
    Number.isFinite(elapsedSeconds) &&
    Number.isFinite(durationSeconds) &&
    durationSeconds != null &&
    durationSeconds > 0 &&
    (elapsedSeconds ?? 0) >= durationSeconds - 0.1
  );
}

export function RadioPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { user, accessToken } = useAuth();
  const {
    releasePlayback,
    isPlaying: sitePlayerPlaying,
    currentTrack: siteCurrentTrack,
  } = useAudioPlayer();
  const listenerIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const transitionRetryTimerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const [playing, setPlaying] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const [chatMessage, setChatMessage] = useState("");

  usePageMeta({ title: "Radio" });

  const suppressNextSitePauseRef = useRef(false);

  // Resolve persistent listener id and display name
  const listenerId = useMemo(() => {
    if (!listenerIdRef.current) listenerIdRef.current = getListenerId();
    return listenerIdRef.current;
  }, []);

  const displayName = user
    ? (user.displayName || user.username)
    : getAnonName(listenerId);

  const radioClient = useMemo(() => authedApi(accessToken), [accessToken]);

  const radioQuery = useQuery({
    queryKey: ["radio", "public"],
    queryFn: () => api.radio.get(),
    refetchInterval: 10_000,
  });
  const refetchRadio = radioQuery.refetch;

  const station = radioQuery.data;
  const nowPlaying = station?.nowPlaying;
  const chatMessages = station?.chatMessages ?? [];
  const isLive = station?.status === "LIVE" && Boolean(nowPlaying);
  const statusLabel = radioQuery.isError ? "Unavailable" : isLive ? "Live" : "Offline";
  const unreadCount = Math.max(0, chatMessages.length - seenCount);

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

  const radioArtworkUrl = nowPlaying?.artworkUrl ?? null;

  const playlistUrl = nowPlaying
    ? playlistPath({ id: nowPlaying.playlist.id, slug: nowPlaying.playlist.slug, username: nowPlaying.uploader.username })
    : null;

  useEffect(() => {
    if (isEmbedded) return;
    releasePlayback();
    if (theatreController.state.active) void theatreController.exit();
  }, [isEmbedded, releasePlayback]);

  useEffect(() => {
    setRadioPlaybackActive(playing);
    return () => setRadioPlaybackActive(false);
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    theatreController.setArtwork(radioArtworkUrl);
  }, [playing, radioArtworkUrl]);

  function bindTheatreToRadio(el: HTMLAudioElement) {
    theatreController.registerPlaybackSource(el, { artworkUrl: radioArtworkUrl });
  }

  function unbindTheatreFromRadio() {
    theatreController.registerPlaybackSource(null);
  }

  const clearTransitionRetry = useCallback(() => {
    if (transitionRetryTimerRef.current == null) return;
    window.clearTimeout(transitionRetryTimerRef.current);
    transitionRetryTimerRef.current = null;
  }, []);

  useEffect(() => {
    if (!isEmbedded) return;
    if (!playing) return;
    if (!sitePlayerPlaying || !siteCurrentTrack) return;
    if (suppressNextSitePauseRef.current) return;

    clearTransitionRetry();
    audioRef.current?.pause();
    setPlaying(false);
    unbindTheatreFromRadio();
  }, [
    isEmbedded,
    playing,
    sitePlayerPlaying,
    siteCurrentTrack?.id,
    clearTransitionRetry,
  ]);

  const syncAndPlayRadio = useCallback(async (track: NonNullable<typeof nowPlaying>) => {
    const audio = audioRef.current;
    if (!audio || !track.audioUrl) return false;

    const nextSrc = getAudioHref(track.audioUrl);
    const needsSource = audio.src !== nextSrc;
    if (!needsSource && audio.ended && isRadioElapsedAtEnd(track.elapsedSeconds, track.durationSeconds)) {
      return false;
    }

    if (needsSource) {
      audio.src = track.audioUrl;
      audio.load();
    }

    const target = getRadioSeekTime(track.elapsedSeconds, track.durationSeconds);
    if (needsSource || audio.ended || Math.abs(audio.currentTime - target) > 3) {
      audio.currentTime = target;
    }

    try {
      await audio.play();
      setPlaying(true);
      return true;
    } catch {
      setPlaying(false);
      unbindTheatreFromRadio();
      return false;
    }
  }, []);

  const scheduleTransitionRefetch = useCallback((attempt = 0) => {
    clearTransitionRetry();
    transitionRetryTimerRef.current = window.setTimeout(() => {
      void refetchRadio().then(async ({ data }) => {
        const nextTrack = data?.status === "LIVE" ? data.nowPlaying : null;
        if (!nextTrack?.audioUrl) {
          setPlaying(false);
          unbindTheatreFromRadio();
          return;
        }

        const audio = audioRef.current;
        const stillWaitingForNextTrack =
          audio?.ended &&
          audio.src === getAudioHref(nextTrack.audioUrl) &&
          isRadioElapsedAtEnd(nextTrack.elapsedSeconds, nextTrack.durationSeconds);

        if (stillWaitingForNextTrack && attempt < RADIO_TRANSITION_MAX_RETRIES) {
          scheduleTransitionRefetch(attempt + 1);
          return;
        }

        const played = await syncAndPlayRadio(nextTrack);
        if (played && audioRef.current?.ended && attempt < RADIO_TRANSITION_MAX_RETRIES) {
          scheduleTransitionRefetch(attempt + 1);
        }
      });
    }, attempt === 0 ? 0 : RADIO_TRANSITION_RETRY_MS);
  }, [clearTransitionRetry, refetchRadio, syncAndPlayRadio]);

  function handleRadioPlay(el: HTMLAudioElement) {
    setPlaying(true);
    bindTheatreToRadio(el);
  }

  function handleRadioPause(e: React.SyntheticEvent<HTMLAudioElement>) {
    if (e.currentTarget.ended) return;
    setPlaying(false);
    unbindTheatreFromRadio();
  }

  function handleRadioEnded() {
    if (!playing) return;
    scheduleTransitionRefetch();
  }

  useEffect(() => {
    return () => {
      clearTransitionRetry();
      theatreController.registerPlaybackSource(null);
    };
  }, [clearTransitionRetry]);

  // Mark messages as seen while chat is open
  useEffect(() => {
    if (chatOpen) setSeenCount(chatMessages.length);
  }, [chatOpen, chatMessages.length]);

  // Jump to bottom when chat first opens
  useEffect(() => {
    if (chatOpen) {
      requestAnimationFrame(() =>
        chatBottomRef.current?.scrollIntoView({ behavior: "instant" }),
      );
    }
  }, [chatOpen]);

  // Soft auto-scroll on new messages only if near bottom
  const prevMsgCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (!chatOpen || chatMessages.length === prevMsgCountRef.current) return;
    prevMsgCountRef.current = chatMessages.length;
    const el = chatScrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages.length, chatOpen]);

  const chatMutation = useMutation({
    mutationFn: ({ message, stationSlug }: { message: string; stationSlug: string }) =>
      radioClient.radio.sendChatMessage({
        listenerId,
        ...(user ? {} : { displayName }),
        message,
        station: stationSlug,
      }),
    onSuccess: () => {
      setChatMessage("");
      const ta = textareaRef.current;
      if (ta) { ta.style.height = "auto"; }
      queryClient.invalidateQueries({ queryKey: ["radio", "public"] });
    },
  });

  // Heartbeat
  useEffect(() => {
    if (!isLive) return;
    const sendHeartbeat = () => {
      void api.radio.heartbeat({ listenerId, station: station?.slug ?? "main" });
    };
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 25_000);
    return () => window.clearInterval(interval);
  }, [isLive, listenerId, station?.slug]);

  // Audio sync
  useEffect(() => {
    if (!playing) return;
    if (!isLive || !nowPlaying?.audioUrl) {
      clearTransitionRetry();
      audioRef.current?.pause();
      setPlaying(false);
      unbindTheatreFromRadio();
      return;
    }
    clearTransitionRetry();
    if (
      audioRef.current?.ended &&
      audioRef.current.src === getAudioHref(nowPlaying.audioUrl) &&
      isRadioElapsedAtEnd(nowPlaying.elapsedSeconds, nowPlaying.durationSeconds)
    ) {
      scheduleTransitionRefetch();
      return;
    }
    void syncAndPlayRadio(nowPlaying);
  }, [clearTransitionRetry, isLive, nowPlaying, playing, scheduleTransitionRefetch, syncAndPlayRadio]);

  async function togglePlayback() {
    if (!nowPlaying?.audioUrl) return;

    if (playing) {
      clearTransitionRetry();
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }

    suppressNextSitePauseRef.current = true;

    try {
      releasePlayback();
      await syncAndPlayRadio(nowPlaying);
    } finally {
      window.setTimeout(() => {
        suppressNextSitePauseRef.current = false;
      }, 0);
    }
  }

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatMessage(e.target.value.slice(0, MAX_MSG_LENGTH));
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_H)}px`; }
  }

  function submitMessage() {
    const trimmed = chatMessage.trim();
    if (!trimmed || chatMutation.isPending) return;
    chatMutation.mutate({ message: trimmed, stationSlug: station?.slug ?? "main" });
  }

  const charsLeft = MAX_MSG_LENGTH - chatMessage.length;
  const showCharCount = chatMessage.length > MAX_MSG_LENGTH * 0.75;

  const chatPanel = chatOpen
    ? createPortal(
      <aside
        className="fixed bottom-0 right-0 top-[var(--spacing-topbar)] z-[52] flex w-full flex-col border-l border-[var(--color-border)] bg-[var(--color-canvas-alt)] shadow-2xl shadow-black/60 sm:w-[360px]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[var(--color-surface)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <MessageCircle size={15} className="text-[var(--color-brand)]" />
            Radio chat
          </div>
          <div className="flex items-center gap-3">
            {station?.listenerCount != null ? (
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                <Users size={11} />
                {station.listenerCount}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="rounded p-1 text-[var(--color-text-subtle)] transition hover:bg-white/5 hover:text-white"
              aria-label="Close chat"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatScrollRef}
          className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto bg-[var(--color-canvas)] py-2"
        >
          {chatMessages.length === 0 ? (
            <p className="m-auto text-sm text-[var(--color-text-subtle)]">No messages yet — say hi!</p>
          ) : (
            chatMessages.map((item) => (
              <div
                key={item.id}
                className="group px-4 py-2 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-white">{item.displayName}</span>
                  <span className="text-[10px] text-[var(--color-text-subtle)] opacity-0 transition-opacity group-hover:opacity-100">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 break-words text-sm leading-5 text-[var(--color-text-muted)]">
                  {item.message}
                </p>
              </div>
            ))
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-white/[0.06] bg-[var(--color-surface)] px-4 py-3">
          {/* Identity row */}
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-subtle)]">
            <span>Posting as</span>
            <span className="font-semibold text-white">{displayName}</span>
            {user ? (
              <span className="rounded-full bg-[var(--color-brand)]/15 px-1.5 py-px text-[10px] font-medium text-[var(--color-brand)]">
                member
              </span>
            ) : (
              <span className="rounded-full bg-white/5 px-1.5 py-px text-[10px] text-[var(--color-text-subtle)]">
                guest
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); submitMessage(); }}
            className="flex items-end gap-2"
          >
            <div className="relative min-w-0 flex-1">
              <textarea
                ref={textareaRef}
                value={chatMessage}
                onChange={handleMessageChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(); }
                }}
                placeholder="Say something…"
                rows={1}
                className="block w-full resize-none rounded-xl border border-[var(--color-border)] bg-black/30 px-3 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)] focus:bg-black/40"
                style={{ minHeight: "40px", maxHeight: `${TEXTAREA_MAX_H}px` }}
              />
              {showCharCount ? (
                <span
                  className={`pointer-events-none absolute bottom-2 right-2.5 text-[10px] tabular-nums ${charsLeft <= 0 ? "text-red-400" : "text-[var(--color-text-subtle)]"
                    }`}
                >
                  {charsLeft}
                </span>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={!chatMessage.trim() || chatMutation.isPending}
              className="mb-px grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-brand)] text-white transition hover:brightness-110 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </form>
          <p className="mt-1.5 text-[10px] text-[var(--color-text-subtle)]">
            Enter to send · Shift+Enter for new line
          </p>
          {chatMutation.isError ? (
            <p className="mt-2 text-xs text-red-400">Message didn&apos;t send. Try again.</p>
          ) : null}
        </div>
      </aside>,
      document.body,
    )
    : null;

  return (
    <>
      <div className="mx-auto flex min-h-[calc(100vh-var(--spacing-topbar)-6rem)] max-w-2xl flex-col items-center justify-center text-center">
        {radioQuery.isError ? (
          <div className="mb-6 w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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

        {/* Artwork */}
        {playlistUrl ? (
          <Link
            to={playlistUrl}
            className="aspect-square w-full max-w-[min(68vw,360px)] rounded-xl bg-white/5 bg-cover bg-center shadow-2xl shadow-black/30 transition hover:brightness-90"
            style={artStyle}
            aria-label={`Go to playlist: ${nowPlaying?.playlist.title}`}
          />
        ) : (
          <div
            className="aspect-square w-full max-w-[min(68vw,360px)] rounded-xl bg-white/5 bg-cover bg-center shadow-2xl shadow-black/30"
            style={artStyle}
          />
        )}

        {/* Status */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <PlaybackBars active={isLive} playing={playing} variant="thumb" barCount={7} />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">
            {statusLabel}
          </span>
          {isLive && station?.listenerCount != null ? (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-subtle)]">
              <Users size={11} />
              {station.listenerCount}
            </span>
          ) : null}
          {isLive && nowPlaying ? (
            <FavoriteHeartButton
              target="recording"
              id={nowPlaying.id}
              variant="inline"
              inlineAlwaysVisible
              className="-my-1 p-1 text-white/70 hover:text-rose-400"
            />
          ) : null}
        </div>

        <h1 className="mt-4 max-w-full text-balance text-4xl font-extrabold tracking-tight text-white md:text-6xl">
          {playlistUrl ? (
            <Link to={playlistUrl} className="transition hover:text-[var(--color-brand)]">
              {nowPlaying?.title ?? "Radio"}
            </Link>
          ) : (
            nowPlaying?.title ?? "Radio"
          )}
        </h1>

        {description ? (
          <p className="mt-4 max-w-2xl text-balance text-base leading-7 text-[var(--color-text-muted)] md:text-lg">
            {description}
          </p>
        ) : null}

        {/* Progress bar */}
        {progressPct !== null ? (
          <div className="mt-6 w-full max-w-[min(68vw,360px)]">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Play/pause */}
        <button
          type="button"
          onClick={() => void togglePlayback()}
          disabled={!nowPlaying?.audioUrl}
          className="mt-8 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={playing ? "Pause radio" : "Play radio"}
        >
          {playing ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" className="ml-1" />
          )}
        </button>
      </div>

      {/* Chat toggle button (minimized) */}
      {!chatOpen ? (
        <button
          type="button"
          onClick={() => { setChatOpen(true); setSeenCount(chatMessages.length); }}
          className="fixed bottom-6 right-6 z-[56] flex h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-[var(--color-surface-elevated)] pl-3 pr-4 text-white shadow-lg shadow-black/40 transition hover:border-[var(--color-brand)]/40 hover:bg-[var(--color-surface)]"
          aria-label="Open radio chat"
        >
          <MessageCircle size={17} className="text-[var(--color-brand)]" />
          <span className="text-sm font-semibold">Chat</span>
          {unreadCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {chatPanel}

      <audio
        ref={audioRef}
        data-radio-player
        crossOrigin="anonymous"
        onPlay={(e) => handleRadioPlay(e.currentTarget)}
        onEnded={handleRadioEnded}
        onPause={handleRadioPause}
      />
    </>
  );
}
