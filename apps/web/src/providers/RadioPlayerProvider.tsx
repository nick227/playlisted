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
import { usePlaybackVolume } from "@/providers/PlaybackVolumeProvider";
import theatreController from "@/theatre/controller/lazyController";
import { setRadioPlaybackActive } from "@/theatre/radioPlaybackBridge";
import { useTheatreTrackRotation } from "@/theatre/useTheatreTrackRotation";

interface RadioPlayerContextValue {
  audioRef: RefObject<HTMLAudioElement | null>;
  playing: boolean;
  volume: number;
  setVolume: (volume: number) => void;
  togglePlayback: () => Promise<void>;
  playStation: (slug: string | null) => void;
  pauseRadio: () => void;
  registerRadioUi: () => void;
  unregisterRadioUi: () => void;
  radioUiMounted: boolean;
  registerChatUi: () => void;
  unregisterChatUi: () => void;
  listenerId: string;
  radioQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof api.radio.get>>>>;
  station: Awaited<ReturnType<typeof api.radio.get>> | undefined;
  nowPlaying: Awaited<ReturnType<typeof api.radio.get>>["nowPlaying"] | null | undefined;
  isLive: boolean;
  activeStationSlug: string | null;
  setActiveStationSlug: (slug: string | null) => void;
}

const RadioPlayerContext = createContext<RadioPlayerContextValue | null>(null);

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const {
    yieldPlaybackToRadio,
    isPlaying: sitePlayerPlaying,
    currentTrack: siteCurrentTrack,
  } = useAudioPlayer();

  const listenerIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transitionRetryTimerRef = useRef<number | null>(null);
  const suppressNextSitePauseRef = useRef(false);
  const siteControlledRef = useRef(false);
  const radioSyncingRef = useRef(false);
  const uiMountCountRef = useRef(0);
  const chatMountCountRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const { volume, setVolume } = usePlaybackVolume();
  const [uiMounted, setUiMounted] = useState(false);
  const [chatMounted, setChatMounted] = useState(false);
  const [activeStationSlug, setActiveStationSlug] = useState<string | null>(null);
  const [requestedStationSlug, setRequestedStationSlug] = useState<string | null | undefined>(undefined);

  const listenerId = useMemo(() => {
    if (!listenerIdRef.current) listenerIdRef.current = getListenerId();
    return listenerIdRef.current;
  }, []);

  // Fetch radio state when playback, radio UI, or chat UI needs it.
  // Poll only while audio is playing (track sync) or the user is on /chat.
  const radioDataNeeded = playing || uiMounted || chatMounted || requestedStationSlug !== undefined;
  const radioPollInterval = playing || chatMounted ? 10_000 : false;
  const radioQuery = useQuery({
    queryKey: ["radio", "public", activeStationSlug],
    queryFn: () => api.radio.get(activeStationSlug ? { station: activeStationSlug } : undefined),
    enabled: radioDataNeeded,
    refetchInterval: radioPollInterval,
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
    setRequestedStationSlug(undefined);
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

  const registerChatUi = useCallback(() => {
    chatMountCountRef.current += 1;
    setChatMounted(true);
  }, []);

  const unregisterChatUi = useCallback(() => {
    chatMountCountRef.current = Math.max(0, chatMountCountRef.current - 1);
    setChatMounted(chatMountCountRef.current > 0);
  }, []);


  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

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

      radioSyncingRef.current = true;
      try {
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

        await audio.play();
        setPlaying(true);
        return true;
      } catch {
        setPlaying(false);
        unbindTheatreFromRadio();
        return false;
      } finally {
        radioSyncingRef.current = false;
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
    if (!playing && !chatMounted) return;

    const sendHeartbeat = () => {
      void api.radio.heartbeat({ listenerId, station: station?.slug ?? "main" });
    };
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 25_000);
    return () => window.clearInterval(interval);
  }, [isLive, listenerId, playing, chatMounted, station?.slug]);

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
      yieldPlaybackToRadio();
      await syncAndPlayRadio(nowPlaying);
    } finally {
      window.setTimeout(() => {
        suppressNextSitePauseRef.current = false;
      }, 0);
    }
  }, [nowPlaying, pauseRadio, playing, syncAndPlayRadio, yieldPlaybackToRadio]);

  const playStation = useCallback((slug: string | null) => {
    siteControlledRef.current = false;
    suppressNextSitePauseRef.current = true;
    clearTransitionRetry();
    setActiveStationSlug(slug);
    setRequestedStationSlug(slug);
    void yieldPlaybackToRadio();
  }, [clearTransitionRetry, yieldPlaybackToRadio]);

  useEffect(() => {
    if (requestedStationSlug === undefined) return;
    if (activeStationSlug !== requestedStationSlug) return;
    if (radioQuery.isFetching) return;

    const requestedTrack = station?.status === "LIVE" ? station.nowPlaying : null;
    if (!requestedTrack?.audioUrl) {
      setRequestedStationSlug(undefined);
      setPlaying(false);
      window.setTimeout(() => {
        suppressNextSitePauseRef.current = false;
      }, 0);
      return;
    }

    void syncAndPlayRadio(requestedTrack).finally(() => {
      setRequestedStationSlug(undefined);
      window.setTimeout(() => {
        suppressNextSitePauseRef.current = false;
      }, 0);
    });
  }, [
    activeStationSlug,
    radioQuery.isFetching,
    requestedStationSlug,
    station,
    syncAndPlayRadio,
  ]);

  function handleRadioPlay(el: HTMLAudioElement) {
    if (siteControlledRef.current) return;
    setPlaying(true);
    bindTheatreToRadio(el);
  }

  function handleRadioPause(e: React.SyntheticEvent<HTMLAudioElement>) {
    if (siteControlledRef.current) return;
    if (radioSyncingRef.current) return;
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
      volume,
      setVolume,
      togglePlayback,
      playStation,
      pauseRadio,
      registerRadioUi,
      unregisterRadioUi,
      radioUiMounted: uiMounted,
      registerChatUi,
      unregisterChatUi,
      listenerId,
      radioQuery,
      station,
      nowPlaying,
      isLive,
      activeStationSlug,
      setActiveStationSlug,
    }),
    [playing, volume, setVolume, togglePlayback, playStation, pauseRadio, registerRadioUi, unregisterRadioUi, uiMounted, registerChatUi, unregisterChatUi, listenerId, radioQuery, station, nowPlaying, isLive, activeStationSlug],
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
