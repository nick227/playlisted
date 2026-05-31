import type { components } from "@playlisted/client-sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";

import { hydrateUpNextSegment } from "@/lib/upNext/hydrateSegment";
import { prefetchAutoplayNext, type PrefetchedPlaylistNext } from "@/lib/upNext/prefetchAutoplayNext";
import { readAutoplayEnabled, writeAutoplayEnabled } from "@/lib/upNext/storage";
import type { BeginSegmentOptions, UpNextSegment } from "@/lib/upNext/types";
import { isPlayerShortcutSuppressed } from "@/lib/playerKeyboard";
import { postPlaybackEvent } from "@/lib/playbackEvents";
import { useAuth } from "@/providers/AuthProvider";

export type QueueTrack = components["schemas"]["RecordingSummary"] & {
  playlistTitle?: string;
  ownerName?: string;
  ownerUsername?: string | null;
  playlistSlug?: string | null;
};

export type PlaybackContext = {
  playlistId?: string;
  playlistOwnerUsername?: string;
  playlistSlug?: string;
  sourceContext?: string;
};

export type { UpNextSegment };

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

interface AudioPlayerContextValue {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTrack: QueueTrack | null;
  queue: QueueTrack[];
  queueIndex: number;
  upNextPipeline: UpNextSegment[];
  segmentLabel: string | null;
  autoplayNextSegment: PrefetchedPlaylistNext | null;
  autoplayEnabled: boolean;
  setAutoplayEnabled: (enabled: boolean) => void;
  state: PlayerState;
  playerBarVisible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackContext: PlaybackContext;
  queueOpen: boolean;
  setQueueOpen: (open: boolean) => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  repeatMode: "off" | "one" | "all";
  cycleRepeat: () => void;
  volume: number;
  setVolume: (v: number) => void;
  playTrack: (
    track: QueueTrack,
    queue?: QueueTrack[],
    context?: PlaybackContext,
    options?: BeginSegmentOptions,
  ) => void;
  setQueue: (
    tracks: QueueTrack[],
    startIndex?: number,
    context?: PlaybackContext,
    options?: BeginSegmentOptions,
  ) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  skipToUpNext: () => void;
  seek: (time: number) => void;
  appendToQueue: (track: QueueTrack) => void;
  appendUpNextSegment: (segment: UpNextSegment) => void;
  removeUpNextSegment: (segmentId: string) => void;
  removeFromQueue: (trackId: string) => void;
  updateQueuePlaylistTitle: (playlistId: string, title: string) => void;
  updateQueuePlaylistSlug: (playlistId: string, slug: string) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

function autopilotTail(context: PlaybackContext): UpNextSegment {
  return {
    id: crypto.randomUUID(),
    kind: "autopilot",
    label: "More to play",
    resolver: "continue",
    seedPlaylistId: context.playlistId,
    source: "autopilot",
  };
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackContextRef = useRef<PlaybackContext>({ sourceContext: "player" });
  const loggedTrackRef = useRef<string | null>(null);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<"off" | "one" | "all">("off");
  const autoplayRef = useRef(readAutoplayEnabled());
  const segmentEndIndexRef = useRef(-1);
  const playedPlaylistIdsRef = useRef(new Set<string>());
  const upNextPipelineRef = useRef<UpNextSegment[]>([]);
  const advancingRef = useRef(false);

  const [queue, setQueueState] = useState<QueueTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [upNextPipeline, setUpNextPipeline] = useState<UpNextSegment[]>([]);
  const [segmentLabel, setSegmentLabel] = useState<string | null>(null);
  const [autoplayNextSegment, setAutoplayNextSegment] = useState<PrefetchedPlaylistNext | null>(null);
  const [autoplayEnabled, setAutoplayEnabledState] = useState(() => readAutoplayEnabled());
  const [state, setState] = useState<PlayerState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext>({ sourceContext: "player" });
  const [queueOpen, setQueueOpen] = useState(false);
  const [shuffle, setShuffleState] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<"off" | "one" | "all">("off");
  const [volume, setVolumeState] = useState(1);

  upNextPipelineRef.current = upNextPipeline;

  const currentTrack = queueIndex >= 0 ? queue[queueIndex] ?? null : null;
  const playerBarVisible =
    currentTrack !== null &&
    (state === "playing" || state === "paused" || state === "loading" || state === "error");
  const isPlaying = currentTrack !== null && (state === "playing" || state === "loading");

  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  queueRef.current = queue;
  queueIndexRef.current = queueIndex;

  const setAutoplayEnabled = useCallback((enabled: boolean) => {
    autoplayRef.current = enabled;
    writeAutoplayEnabled(enabled);
    setAutoplayEnabledState(enabled);
    if (!enabled) setAutoplayNextSegment(null);
  }, []);

  const toggleShuffle = useCallback(() => {
    shuffleRef.current = !shuffleRef.current;
    setShuffleState(shuffleRef.current);
  }, []);

  const cycleRepeat = useCallback(() => {
    const next: "off" | "one" | "all" =
      repeatRef.current === "off" ? "all" : repeatRef.current === "all" ? "one" : "off";
    repeatRef.current = next;
    setRepeatModeState(next);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const flushPlayback = useCallback(
    (track: QueueTrack, seconds: number, completed: boolean) => {
      postPlaybackEvent(accessToken, {
        recordingId: track.id,
        playlistId: playbackContextRef.current.playlistId ?? null,
        sourceContext: playbackContextRef.current.sourceContext ?? "player",
        playedSeconds: Math.max(0, Math.floor(seconds)),
        completed,
      });
    },
    [accessToken],
  );

  const logPlaybackStart = useCallback(
    (track: QueueTrack) => {
      if (loggedTrackRef.current === track.id) return;
      loggedTrackRef.current = track.id;
      postPlaybackEvent(accessToken, {
        recordingId: track.id,
        playlistId: playbackContextRef.current.playlistId ?? null,
        sourceContext: playbackContextRef.current.sourceContext ?? "player",
        playedSeconds: 0,
        completed: false,
      });
    },
    [accessToken],
  );

  const loadTrack = useCallback((track: QueueTrack) => {
    const audio = audioRef.current;
    if (!audio || !track.audioUrl) {
      setState("error");
      return;
    }
    setState("loading");
    audio.src = track.audioUrl;
    audio.load();
    void audio.play().then(() => {
      if (!audio.paused) setState("playing");
    }).catch(() => setState("paused"));
  }, []);

  const beginSegment = useCallback(
    (
      tracks: QueueTrack[],
      startIndex: number,
      context?: PlaybackContext,
      options?: BeginSegmentOptions,
    ) => {
      if (tracks.length === 0) return;

      const index = Math.min(Math.max(startIndex, 0), tracks.length - 1);
      if (context) {
        playbackContextRef.current = context;
        setPlaybackContext(context);
        if (context.playlistId) {
          playedPlaylistIdsRef.current.add(context.playlistId);
        }
      }

      segmentEndIndexRef.current = tracks.length - 1;
      setSegmentLabel(options?.segmentLabel ?? tracks[index]?.playlistTitle ?? null);
      setQueueState(tracks);
      setQueueIndex(index);
      loadTrack(tracks[index]);
    },
    [loadTrack],
  );

  const advanceProgram = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setState("loading");

    try {
      let pipeline = [...upNextPipelineRef.current];

      for (let attempt = 0; attempt < 8; attempt += 1) {
        let segment = pipeline.shift();
        if (!segment) {
          if (!autoplayRef.current) break;
          segment = autopilotTail(playbackContextRef.current);
        }

        setUpNextPipeline(pipeline);

        const hydrated = await hydrateUpNextSegment(segment, playedPlaylistIdsRef.current);
        if (!hydrated || hydrated.tracks.length === 0) continue;

        if (hydrated.playlistId) {
          playedPlaylistIdsRef.current.add(hydrated.playlistId);
        }

        beginSegment(hydrated.tracks, 0, hydrated.context, {
          seedAutoplay: true,
          segmentLabel:
            segment.kind === "autopilot"
              ? (hydrated.tracks[0]?.playlistTitle ?? segment.label)
              : segment.label,
        });
        return;
      }

      setQueueIndex(-1);
      setState("idle");
      audioRef.current?.pause();
    } finally {
      advancingRef.current = false;
    }
  }, [beginSegment]);

  const playTrack = useCallback(
    (
      track: QueueTrack,
      nextQueue?: QueueTrack[],
      context?: PlaybackContext,
      options?: BeginSegmentOptions,
    ) => {
      if (currentTrack && currentTrack.id !== track.id) {
        flushPlayback(currentTrack, audioRef.current?.currentTime ?? currentTime, false);
        loggedTrackRef.current = null;
      }
      const tracks = nextQueue ?? [track];
      const index = tracks.findIndex((t) => t.id === track.id);
      beginSegment(tracks, index >= 0 ? index : 0, context, options);
    },
    [currentTrack, currentTime, flushPlayback, beginSegment],
  );

  const setQueue = useCallback(
    (
      tracks: QueueTrack[],
      startIndex = 0,
      context?: PlaybackContext,
      options?: BeginSegmentOptions,
    ) => {
      if (tracks.length === 0) return;
      if (currentTrack) {
        flushPlayback(currentTrack, audioRef.current?.currentTime ?? currentTime, false);
        loggedTrackRef.current = null;
      }
      beginSegment(tracks, startIndex, context, options);
    },
    [currentTrack, currentTime, flushPlayback, beginSegment],
  );

  const updateQueuePlaylistTitle = useCallback((playlistId: string, title: string) => {
    if (playbackContextRef.current.playlistId !== playlistId) return;
    setQueueState((prev) => prev.map((t) => ({ ...t, playlistTitle: title })));
    setSegmentLabel(title);
  }, []);

  const updateQueuePlaylistSlug = useCallback((playlistId: string, slug: string) => {
    if (playbackContextRef.current.playlistId !== playlistId) return;
    const next = { ...playbackContextRef.current, playlistSlug: slug };
    playbackContextRef.current = next;
    setPlaybackContext(next);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) {
      void audio.play().then(() => {
        if (!audio.paused) setState("playing");
      }).catch(() => setState("paused"));
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  const playNext = useCallback(() => {
    const end = segmentEndIndexRef.current;
    const q = queueRef.current;
    const idx = queueIndexRef.current;

    if (repeatRef.current === "one" && idx >= 0) {
      loadTrack(q[idx]);
      return;
    }

    if (shuffleRef.current && end > 0) {
      let next: number;
      do {
        next = Math.floor(Math.random() * (end + 1));
      } while (next === idx && end > 0);
      setQueueIndex(next);
      loadTrack(q[next]);
      return;
    }

    if (idx < end) {
      const next = idx + 1;
      setQueueIndex(next);
      loadTrack(q[next]);
      return;
    }

    if (repeatRef.current === "all" && q.length > 0) {
      setQueueIndex(0);
      loadTrack(q[0]);
      return;
    }

    void advanceProgram();
  }, [loadTrack, advanceProgram]);

  const skipToUpNext = useCallback(() => {
    if (upNextPipelineRef.current.length === 0 && !autoplayRef.current) return;
    if (advancingRef.current) return;

    const idx = queueIndexRef.current;
    const track = idx >= 0 ? queueRef.current[idx] : null;
    if (track) {
      flushPlayback(track, audioRef.current?.currentTime ?? currentTime, false);
      loggedTrackRef.current = null;
    }

    void advanceProgram();
  }, [currentTime, flushPlayback, advanceProgram]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (queueIndex > 0) {
      const prev = queueIndex - 1;
      setQueueIndex(prev);
      loadTrack(queue[prev]);
    }
  }, [queue, queueIndex, loadTrack]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  const appendToQueue = useCallback((track: QueueTrack) => {
    setQueueState((prev) => {
      const next = [...prev, track];
      segmentEndIndexRef.current = next.length - 1;
      return next;
    });
  }, []);

  const appendUpNextSegment = useCallback((segment: UpNextSegment) => {
    setUpNextPipeline((prev) => [...prev, segment]);
  }, []);

  const removeUpNextSegment = useCallback((segmentId: string) => {
    setUpNextPipeline((prev) => prev.filter((s) => s.id !== segmentId));
  }, []);

  const removeFromQueue = useCallback(
    (trackId: string) => {
      setQueueState((prev) => {
        const next = prev.filter((t) => t.id !== trackId);
        const removedIndex = prev.findIndex((t) => t.id === trackId);
        segmentEndIndexRef.current = Math.max(0, next.length - 1);

        if (removedIndex === queueIndex && next.length > 0) {
          const newIndex = Math.min(queueIndex, next.length - 1);
          setQueueIndex(newIndex);
          loadTrack(next[newIndex]);
        } else if (next.length === 0) {
          setQueueIndex(-1);
          setState("idle");
          audioRef.current?.pause();
        } else if (removedIndex < queueIndex) {
          setQueueIndex((i) => i - 1);
        } else if (removedIndex <= segmentEndIndexRef.current) {
          segmentEndIndexRef.current = Math.max(0, segmentEndIndexRef.current - 1);
        }
        return next;
      });
    },
    [queueIndex, loadTrack],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setState("playing");
      const idx = queueIndexRef.current;
      const track = idx >= 0 ? queueRef.current[idx] : null;
      if (track) logPlaybackStart(track);
    };
    const onPause = () => setState("paused");
    const onWaiting = () => {
      if (!audio.paused) return;
      setState("loading");
    };
    const onEnded = () => {
      const idx = queueIndexRef.current;
      const track = idx >= 0 ? queueRef.current[idx] : null;
      if (track) {
        flushPlayback(track, audio.duration || currentTime, true);
        loggedTrackRef.current = null;
      }
      if (repeatRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => setState("paused"));
      } else {
        playNext();
      }
    };
    const onError = () => {
      setState("error");
      void advanceProgram();
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [playNext, currentTime, flushPlayback, logPlaybackStart, advanceProgram]);

  useEffect(() => {
    if (!autoplayEnabled || !playbackContext.playlistId) {
      setAutoplayNextSegment(null);
      return;
    }

    let cancelled = false;
    void prefetchAutoplayNext(playbackContext.playlistId, playedPlaylistIdsRef.current).then((segment) => {
      if (!cancelled) setAutoplayNextSegment(segment);
    });

    return () => {
      cancelled = true;
    };
  }, [autoplayEnabled, playbackContext.playlistId, segmentLabel, upNextPipeline.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isPlayerShortcutSuppressed(event)) return;
      if (!currentTrack) return;
      event.preventDefault();
      togglePlay();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentTrack, togglePlay]);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      audioRef,
      currentTrack,
      queue,
      queueIndex,
      upNextPipeline,
      segmentLabel,
      autoplayNextSegment,
      autoplayEnabled,
      setAutoplayEnabled,
      state,
      playerBarVisible,
      isPlaying,
      currentTime,
      duration,
      playbackContext,
      queueOpen,
      setQueueOpen,
      shuffle,
      toggleShuffle,
      repeatMode,
      cycleRepeat,
      volume,
      setVolume,
      playTrack,
      setQueue,
      togglePlay,
      playNext,
      playPrevious,
      skipToUpNext,
      seek,
      appendToQueue,
      appendUpNextSegment,
      removeUpNextSegment,
      removeFromQueue,
      updateQueuePlaylistTitle,
      updateQueuePlaylistSlug,
    }),
    [
      currentTrack,
      queue,
      queueIndex,
      upNextPipeline,
      segmentLabel,
      autoplayNextSegment,
      autoplayEnabled,
      setAutoplayEnabled,
      state,
      playerBarVisible,
      isPlaying,
      currentTime,
      duration,
      playbackContext,
      queueOpen,
      shuffle,
      toggleShuffle,
      repeatMode,
      cycleRepeat,
      volume,
      setVolume,
      playTrack,
      setQueue,
      togglePlay,
      playNext,
      playPrevious,
      skipToUpNext,
      seek,
      appendToQueue,
      appendUpNextSegment,
      removeUpNextSegment,
      removeFromQueue,
      updateQueuePlaylistTitle,
      updateQueuePlaylistSlug,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" className="hidden" />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
