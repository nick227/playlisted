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

import { postPlaybackEvent } from "@/lib/playbackEvents";
import { useAuth } from "@/providers/AuthProvider";

export type QueueTrack = components["schemas"]["RecordingSummary"] & {
  playlistTitle?: string;
  ownerName?: string;
};

export type PlaybackContext = {
  playlistId?: string;
  sourceContext?: string;
};

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

interface AudioPlayerContextValue {
  currentTrack: QueueTrack | null;
  queue: QueueTrack[];
  state: PlayerState;
  currentTime: number;
  duration: number;
  queueOpen: boolean;
  setQueueOpen: (open: boolean) => void;
  playTrack: (track: QueueTrack, queue?: QueueTrack[], context?: PlaybackContext) => void;
  setQueue: (tracks: QueueTrack[], startIndex?: number, context?: PlaybackContext) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  appendToQueue: (track: QueueTrack) => void;
  removeFromQueue: (trackId: string) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackContextRef = useRef<PlaybackContext>({ sourceContext: "player" });
  const loggedTrackRef = useRef<string | null>(null);
  const [queue, setQueueState] = useState<QueueTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [state, setState] = useState<PlayerState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);

  const currentTrack = queueIndex >= 0 ? queue[queueIndex] ?? null : null;

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
    audio.play().catch(() => setState("paused"));
  }, []);

  const playTrack = useCallback(
    (track: QueueTrack, nextQueue?: QueueTrack[], context?: PlaybackContext) => {
      if (currentTrack && currentTrack.id !== track.id) {
        flushPlayback(currentTrack, audioRef.current?.currentTime ?? currentTime, false);
        loggedTrackRef.current = null;
      }
      if (context) playbackContextRef.current = context;
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
      if (context) playbackContextRef.current = context;
      const index = Math.min(Math.max(startIndex, 0), tracks.length - 1);
      setQueueState(tracks);
      setQueueIndex(index);
      loadTrack(tracks[index]);
    },
    [currentTrack, currentTime, flushPlayback, loadTrack],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) {
      audio.play().catch(() => setState("paused"));
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  const playNext = useCallback(() => {
    if (queueIndex < queue.length - 1) {
      const next = queueIndex + 1;
      setQueueIndex(next);
      loadTrack(queue[next]);
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
      const track = queueIndex >= 0 ? queue[queueIndex] : null;
      if (track) logPlaybackStart(track);
    };
    const onPause = () => setState("paused");
    const onWaiting = () => setState("loading");
    const onEnded = () => {
      const track = queueIndex >= 0 ? queue[queueIndex] : null;
      if (track) {
        flushPlayback(track, audio.duration || currentTime, true);
        loggedTrackRef.current = null;
      }
      playNext();
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
  }, [playNext, queue, queueIndex, currentTime, flushPlayback, logPlaybackStart]);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      currentTrack,
      queue,
      state,
      currentTime,
      duration,
      queueOpen,
      setQueueOpen,
      playTrack,
      setQueue,
      togglePlay,
      playNext,
      playPrevious,
      seek,
      appendToQueue,
      removeFromQueue,
    }),
    [
      currentTrack,
      queue,
      state,
      currentTime,
      duration,
      queueOpen,
      playTrack,
      setQueue,
      togglePlay,
      playNext,
      playPrevious,
      seek,
      appendToQueue,
      removeFromQueue,
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
