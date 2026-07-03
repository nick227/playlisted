import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  getAudioHref,
  getListenerId,
  getRadioSeekTime,
  isRadioElapsedAtEnd,
  RADIO_TRANSITION_MAX_RETRIES,
  RADIO_TRANSITION_RETRY_MS,
} from "@/lib/radio/radioPlayback";
import { api } from "@/lib/api";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";
import theatreController from "@/theatre/controller/lazyController";
import { setRadioPlaybackActive } from "@/theatre/radioPlaybackBridge";
import { useTheatreTrackRotation } from "@/theatre/useTheatreTrackRotation";

interface RadioPlayerContextValue {
  audioRef: RefObject<HTMLAudioElement | null>;
  playing: boolean;
  togglePlayback: () => Promise<void>;
  pauseRadio: () => void;
  transferToSitePlayer: () => Promise<boolean>;
  registerRadioUi: () => void;
  unregisterRadioUi: () => void;
  listenerId: string;
  radioQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof api.radio.get>>>>;
  station: Awaited<ReturnType<typeof api.radio.get>> | undefined;
  nowPlaying: Awaited<ReturnType<typeof api.radio.get>>["nowPlaying"] | null | undefined;
  isLive: boolean;
}

const RadioPlayerContext = createContext<RadioPlayerContextValue | null>(null);

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const {
    releasePlayback,
    adoptExternalPlayback,
    isPlaying: sitePlayerPlaying,
    currentTrack: siteCurrentTrack,
  } = useAudioPlayer();

  const listenerIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transitionRetryTimerRef = useRef<number | null>(null);
  const suppressNextSitePauseRef = useRef(false);
  const siteControlledRef = useRef(false);
  const uiMountCountRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [uiMounted, setUiMounted] = useState(false);

  const listenerId = useMemo(() => {
    if (!listenerIdRef.current) listenerIdRef.current = getListenerId();
    return listenerIdRef.current;
  }, []);

  const radioQuery = useQuery({
    queryKey: ["radio", "public"],
    queryFn: () => api.radio.get(),
    // Only keep polling live while radio audio is actually playing or the
    // radio UI is on screen — otherwise this fires every 10s on every page.
    refetchInterval: playing || uiMounted ? 10_000 : false,
  });
  const refetchRadio = radioQuery.refetch;

  const station = radioQuery.data;
  const nowPlaying = station?.nowPlaying;
  const isLive = station?.status === "LIVE" && Boolean(nowPlaying);
  const radioArtworkUrl = nowPlaying?.artworkUrl ?? null;

  useTheatreTrackRotation(
    nowPlaying?.id,
    playing,
    nowPlaying?.durationSeconds ? nowPlaying.durationSeconds * 1000 : null
  );

  const clearTransitionRetry = useCallback(() => {
    if (transitionRetryTimerRef.current == null) return;
    window.clearTimeout(transitionRetryTimerRef.current);
    transitionRetryTimerRef.current = null;
  }, []);

  const unbindTheatreFromRadio = useCallback(() => {
    if (siteControlledRef.current) return;
    theatreController.registerPlaybackSource(null);
  }, []);

  const bindTheatreToRadio = useCallback(
    (el: HTMLAudioElement) => {
      if (siteControlledRef.current) return;
      theatreController.registerPlaybackSource(el, { artworkUrl: radioArtworkUrl });
    },
    [radioArtworkUrl],
  );

  const pauseRadio = useCallback(() => {
    clearTransitionRetry();
    if (!siteControlledRef.current) {
      audioRef.current?.pause();
    }
    setPlaying(false);
  }, [clearTransitionRetry]);

  const registerRadioUi = useCallback(() => {
    uiMountCountRef.current += 1;
    setUiMounted(true);
  }, []);

  const unregisterRadioUi = useCallback(() => {
    uiMountCountRef.current = Math.max(0, uiMountCountRef.current - 1);
    setUiMounted(uiMountCountRef.current > 0);
  }, []);

  useEffect(() => {
    setRadioPlaybackActive(playing);
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    theatreController.setArtwork(radioArtworkUrl);
  }, [playing, radioArtworkUrl]);

  useEffect(() => {
    if (!playing) return;
    if (!sitePlayerPlaying || !siteCurrentTrack) return;
    if (suppressNextSitePauseRef.current) return;

    clearTransitionRetry();
    audioRef.current?.pause();
    setPlaying(false);
    unbindTheatreFromRadio();
  }, [
    playing,
    sitePlayerPlaying,
    siteCurrentTrack?.id,
    clearTransitionRetry,
    unbindTheatreFromRadio,
  ]);

  const syncAndPlayRadio = useCallback(
    async (track: NonNullable<typeof nowPlaying>) => {
      if (siteControlledRef.current) return false;
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
    },
    [unbindTheatreFromRadio],
  );

  const scheduleTransitionRefetch = useCallback(
    (attempt = 0) => {
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
    },
    [clearTransitionRetry, refetchRadio, syncAndPlayRadio, unbindTheatreFromRadio],
  );

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
  }, [
    clearTransitionRetry,
    isLive,
    nowPlaying,
    playing,
    scheduleTransitionRefetch,
    syncAndPlayRadio,
    unbindTheatreFromRadio,
  ]);

  useEffect(() => {
    if (!isLive) return;
    if (!playing && !uiMounted) return;

    const sendHeartbeat = () => {
      void api.radio.heartbeat({ listenerId, station: station?.slug ?? "main" });
    };
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 25_000);
    return () => window.clearInterval(interval);
  }, [isLive, listenerId, playing, uiMounted, station?.slug]);

  const togglePlayback = useCallback(async () => {
    if (!nowPlaying?.audioUrl) return;

    if (playing) {
      siteControlledRef.current = false;
      pauseRadio();
      return;
    }

    siteControlledRef.current = false;
    suppressNextSitePauseRef.current = true;
    try {
      releasePlayback();
      await syncAndPlayRadio(nowPlaying);
    } finally {
      window.setTimeout(() => {
        suppressNextSitePauseRef.current = false;
      }, 0);
    }
  }, [nowPlaying, pauseRadio, playing, releasePlayback, syncAndPlayRadio]);

  const transferToSitePlayer = useCallback(async () => {
    const track = nowPlaying;
    const audio = audioRef.current;
    if (!track?.audioUrl || !audio || audio.paused || audio.ended) return false;

    const playlist = await api.playlists.getById(track.playlist.id);
    const queue: QueueTrack[] = playlist.recordings.map((recording) => ({
      ...recording,
      playlistTitle: playlist.title,
      ownerName: playlist.owner.displayName,
      ownerUsername: playlist.owner.username,
      playlistSlug: playlist.slug,
    }));
    const index = queue.findIndex((item) => item.id === track.id);
    if (index < 0) return false;

    siteControlledRef.current = true;
    suppressNextSitePauseRef.current = true;
    clearTransitionRetry();
    const adopted = adoptExternalPlayback(
      audio,
      queue,
      index,
      {
        playlistId: playlist.id,
        playlistOwnerUsername: playlist.owner.username,
        playlistSlug: playlist.slug,
        sourceContext: "playlist",
      },
      { segmentLabel: playlist.title },
    );

    if (!adopted) {
      siteControlledRef.current = false;
      suppressNextSitePauseRef.current = false;
      return false;
    }

    setPlaying(false);
    setRadioPlaybackActive(false);
    window.setTimeout(() => {
      suppressNextSitePauseRef.current = false;
    }, 0);
    return true;
  }, [adoptExternalPlayback, clearTransitionRetry, nowPlaying]);

  function handleRadioPlay(el: HTMLAudioElement) {
    if (siteControlledRef.current) return;
    setPlaying(true);
    bindTheatreToRadio(el);
  }

  function handleRadioPause(e: React.SyntheticEvent<HTMLAudioElement>) {
    if (siteControlledRef.current) return;
    if (e.currentTarget.ended) return;
    setPlaying(false);
    unbindTheatreFromRadio();
  }

  function handleRadioEnded() {
    if (siteControlledRef.current) return;
    if (!playing) return;
    scheduleTransitionRefetch();
  }

  const value = useMemo<RadioPlayerContextValue>(
    () => ({
      audioRef,
      playing,
      togglePlayback,
      pauseRadio,
      transferToSitePlayer,
      registerRadioUi,
      unregisterRadioUi,
      listenerId,
      radioQuery,
      station,
      nowPlaying,
      isLive,
    }),
    [playing, togglePlayback, pauseRadio, transferToSitePlayer, registerRadioUi, unregisterRadioUi, listenerId, radioQuery, station, nowPlaying, isLive],
  );

  return (
    <RadioPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        data-radio-player
        crossOrigin="anonymous"
        className="hidden"
        onPlay={(e) => handleRadioPlay(e.currentTarget)}
        onEnded={handleRadioEnded}
        onPause={handleRadioPause}
      />
    </RadioPlayerContext.Provider>
  );
}

export function useRadioPlayer() {
  const ctx = useContext(RadioPlayerContext);
  if (!ctx) throw new Error("useRadioPlayer must be used within RadioPlayerProvider");
  return ctx;
}
