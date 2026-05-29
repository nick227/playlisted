import type { components } from "@playlisted/client-sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { isPlayerShortcutSuppressed } from "@/lib/playerKeyboard";
import { postPlaybackEvent } from "@/lib/playbackEvents";
import { useAuth } from "@/providers/AuthProvider";

export type QueueTrack = components["schemas"]["RecordingSummary"] & {
  playlistTitle?: string;
  ownerName?: string;
};

export type PlaybackContext = {
  playlistId?: string;
  playlistOwnerUsername?: string;
  playlistSlug?: string;
  sourceContext?: string;
};

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

interface AudioPlayerContextValue {
  currentTrack: QueueTrack | null;
  queue: QueueTrack[];
  state: PlayerState;
  /** True while the current track is playing or starting (loading). Use for play/pause button UI. */
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
  playTrack: (track: QueueTrack, queue?: QueueTrack[], context?: PlaybackContext) => void;
  setQueue: (tracks: QueueTrack[], startIndex?: number, context?: PlaybackContext) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  appendToQueue: (track: QueueTrack) => void;
  removeFromQueue: (trackId: string) => void;
  updateQueuePlaylistTitle: (playlistId: string, title: string) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackContextRef = useRef<PlaybackContext>({ sourceContext: "player" });
  const loggedTrackRef = useRef<string | null>(null);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<"off" | "one" | "all">("off");
  const [queue, setQueueState] = useState<QueueTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [state, setState] = useState<PlayerState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext>({ sourceContext: "player" });
  const [queueOpen, setQueueOpen] = useState(false);
  const [shuffle, setShuffleState] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<"off" | "one" | "all">("off");
  const [volume, setVolumeState] = useState(1);

  const currentTrack = queueIndex >= 0 ? queue[queueIndex] ?? null : null;
  const isPlaying =
    currentTrack !== null && (state === "playing" || state === "loading");

  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  queueRef.current = queue;
  queueIndexRef.current = queueIndex;

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

  const playTrack = useCallback(
    (track: QueueTrack, nextQueue?: QueueTrack[], context?: PlaybackContext) => {
      if (currentTrack && currentTrack.id !== track.id) {
        flushPlayback(currentTrack, audioRef.current?.currentTime ?? currentTime, false);
        loggedTrackRef.current = null;
      }
      if (context) {
        playbackContextRef.current = context;
        setPlaybackContext(context);
      }
      const tracks = nextQueue ?? [track];
      const index = tracks.findIndex((t) => t.id === track.id);
      setQueueState(tracks);
      setQueueIndex(index >= 0 ? index : 0);
      loadTrack(track);
    },
    [currentTrack, currentTime, flushPlayback, loadTrack],
  );

  const setQueue = useCallback(
    (tracks: QueueTrack[], startIndex = 0, context?: PlaybackContext) => {
      if (tracks.length === 0) return;
      if (currentTrack) {
        flushPlayback(currentTrack, audioRef.current?.currentTime ?? currentTime, false);
        loggedTrackRef.current = null;
      }
      if (context) {
        playbackContextRef.current = context;
        setPlaybackContext(context);
      }
      const index = Math.min(Math.max(startIndex, 0), tracks.length - 1);
      setQueueState(tracks);
      setQueueIndex(index);
      loadTrack(tracks[index]);
    },
    [currentTrack, currentTime, flushPlayback, loadTrack],
  );

  const updateQueuePlaylistTitle = useCallback((playlistId: string, title: string) => {
    if (playbackContextRef.current.playlistId !== playlistId) return;
    setQueueState((prev) => prev.map((t) => ({ ...t, playlistTitle: title })));
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
    if (shuffleRef.current && queue.length > 1) {
      let next: number;
      do { next = Math.floor(Math.random() * queue.length); } while (next === queueIndex);
      setQueueIndex(next);
      loadTrack(queue[next]);
    } else if (queueIndex < queue.length - 1) {
      const next = queueIndex + 1;
      setQueueIndex(next);
      loadTrack(queue[next]);
    } else if (repeatRef.current === "all" && queue.length > 0) {
      setQueueIndex(0);
      loadTrack(queue[0]);
    }
  }, [queue, queueIndex, loadTrack]);

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
    setQueueState((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueueState((prev) => {
      const next = prev.filter((t) => t.id !== trackId);
      const removedIndex = prev.findIndex((t) => t.id === trackId);
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
      }
      return next;
    });
  }, [queueIndex, loadTrack]);

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
    const onError = () => setState("error");

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
  }, [playNext, currentTime, flushPlayback, logPlaybackStart]);

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
      currentTrack,
      queue,
      state,
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
      seek,
      appendToQueue,
      removeFromQueue,
      updateQueuePlaylistTitle,
    }),
    [
      currentTrack,
      queue,
      state,
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
      seek,
      appendToQueue,
      removeFromQueue,
      updateQueuePlaylistTitle,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" className="hidden" />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
