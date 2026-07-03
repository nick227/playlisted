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

import { prefetchTrackVisualMedia } from "@/theatre/media/hydrateTrackVisualMedia";
import theatreController from "@/theatre/controller/lazyController";
import { syncTheatreTrackContext } from "@/theatre/syncTheatreTrackContext";
import {
  getRadioPlaybackActive,
  subscribeRadioPlayback,
} from "@/theatre/radioPlaybackBridge";
import { useTheatreTrackRotation } from "@/theatre/useTheatreTrackRotation";
import {
  buildAutoplayAvoidance,
  buildRelaxedAutoplayAvoidance,
  recordAutoplayPlaylistCompleted,
  recordAutoplayPlaylistRejected,
  recordAutoplayPlaylistStarted,
} from "@/lib/upNext/autoplayPointerStorage";
import { hydrateUpNextSegment } from "@/lib/upNext/hydrateSegment";
import type { PlaybackOriginScope } from "@/lib/playbackSurface";
import { shiftPlaybackOriginForTrack } from "@/lib/playbackOrigin";
import { prefetchAutoplayNext, type PrefetchedPlaylistNext } from "@/lib/upNext/prefetchAutoplayNext";
import { resolveAutopilotSegment } from "@/lib/upNext/resolveAutopilot";
import { readAutoplayEnabled, writeAutoplayEnabled } from "@/lib/upNext/storage";
import type { BeginSegmentOptions, UpNextSegment } from "@/lib/upNext/types";
import { isPlaybackFocusSuppressed } from "@/lib/playbackFocusSuppression";
import { isPlayerShortcutSuppressed } from "@/lib/playerKeyboard";
import { postPlaybackEvent } from "@/lib/playbackEvents";
import { readPlayerVolume, writePlayerVolume } from "@/lib/playerVolumeStorage";
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

const PLAYER_DISMISS_MS = 320;
const AUTOPLAY_ADVANCE_ATTEMPTS = 8;

type PlayerDismissSnapshot = {
  track: QueueTrack;
  playbackContext: PlaybackContext;
  currentTime: number;
  duration: number;
};

type CurrentSegmentSnapshot = {
  playlistId?: string;
  autoplay: boolean;
};

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
  /** True while the bar is visible or playing its exit animation (e.g. entering radio). */
  playerShellActive: boolean;
  playerBarExiting: boolean;
  playerDismissSnapshot: PlayerDismissSnapshot | null;
  isPlaying: boolean;
  playbackContext: PlaybackContext;
  /** UI element key for the surface that started the current segment (null = any track-id match). */
  activeOriginKey: string | null;
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
  adoptExternalPlayback: (
    audio: HTMLAudioElement,
    tracks: QueueTrack[],
    startIndex: number,
    context?: PlaybackContext,
    options?: BeginSegmentOptions,
  ) => boolean;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  skipToUpNext: () => void;
  appendToQueue: (track: QueueTrack) => void;
  appendUpNextSegment: (segment: UpNextSegment) => void;
  removeUpNextSegment: (segmentId: string) => void;
  removeFromQueue: (trackId: string) => void;
  updateQueuePlaylistTitle: (playlistId: string, title: string) => void;
  updateQueuePlaylistSlug: (playlistId: string, slug: string) => void;
  /** Pause, dismiss the bar (with fade), and clear the active track; queue is kept. */
  releasePlayback: () => void;
  /** Pause site audio and dismiss the bar only when it is currently visible. */
  yieldPlaybackToRadio: () => void;
  /** Resume the current audio element when it was paused without clearing the queue. */
  resumePlaybackIfPaused: () => void;
}

export type PlaybackTransportValue = {
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);
export const PlaybackTransportContext = createContext<PlaybackTransportValue | null>(null);

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
  const siteAudioRef = useRef<HTMLAudioElement | null>(null);
  const adoptedAudioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef<number>(readPlayerVolume());
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const bindAudioElement = useCallback((audio: HTMLAudioElement | null) => {
    siteAudioRef.current = audio;
    if (!adoptedAudioRef.current) {
      audioRef.current = audio;
      setActiveAudio(audio);
      theatreController.registerPlaybackSource(audio);
    }
    if (audio) audio.volume = volumeRef.current;
  }, []);
  const playbackContextRef = useRef<PlaybackContext>({ sourceContext: "player" });
  const loggedTrackRef = useRef<string | null>(null);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<"off" | "one" | "all">("off");
  const autoplayRef = useRef(readAutoplayEnabled());
  const segmentEndIndexRef = useRef(-1);
  const playedPlaylistIdsRef = useRef(new Set<string>());
  const upNextPipelineRef = useRef<UpNextSegment[]>([]);
  const advancingRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);
  const activeOriginScopeRef = useRef<PlaybackOriginScope | null>(null);
  const currentTimeRef = useRef(0);
  const currentSegmentRef = useRef<CurrentSegmentSnapshot>({ autoplay: false });

  const [queue, setQueueState] = useState<QueueTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [upNextPipeline, setUpNextPipeline] = useState<UpNextSegment[]>([]);
  const [segmentLabel, setSegmentLabel] = useState<string | null>(null);
  const [autoplayNextSegment, setAutoplayNextSegment] = useState<PrefetchedPlaylistNext | null>(null);
  const [autoplayEnabled, setAutoplayEnabledState] = useState(() => readAutoplayEnabled());
  const [state, setState] = useState<PlayerState>("idle");
  const [transportCurrentTime, setTransportCurrentTime] = useState(0);
  const [transportDuration, setTransportDuration] = useState(0);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext>({ sourceContext: "player" });
  const [activeOriginKey, setActiveOriginKey] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [shuffle, setShuffleState] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<"off" | "one" | "all">("off");
  const [volume, setVolumeState] = useState(() => readPlayerVolume());
  const [playerDismissSnapshot, setPlayerDismissSnapshot] = useState<PlayerDismissSnapshot | null>(null);
  const [playerBarExiting, setPlayerBarExiting] = useState(false);
  const [radioPlaying, setRadioPlaying] = useState(getRadioPlaybackActive);

  upNextPipelineRef.current = upNextPipeline;
  volumeRef.current = volume;

  const currentTrack = queueIndex >= 0 ? queue[queueIndex] ?? null : null;
  const playerBarVisible =
    currentTrack !== null &&
    (state === "playing" || state === "paused" || state === "loading" || state === "error");

  useEffect(() => {
    if (!currentTrack?.artworkUrl) return;
    theatreController.setArtwork(currentTrack.artworkUrl);
  }, [currentTrack?.artworkUrl]);

  useEffect(() => {
    syncTheatreTrackContext(currentTrack?.id ?? null);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!currentTrack?.id) return;
    prefetchTrackVisualMedia({ segmentId: currentTrack.id, trackId: currentTrack.id });
  }, [currentTrack?.id]);

  const playerShellActive = playerBarVisible || playerDismissSnapshot !== null;
  const isPlaying = currentTrack !== null && (state === "playing" || state === "loading");
  const playbackActive = isPlaying || radioPlaying;

  useEffect(() => subscribeRadioPlayback(setRadioPlaying), []);

  useTheatreTrackRotation(
    currentTrack?.id,
    playbackActive,
    transportDuration ? transportDuration * 1000 : null
  );

  useEffect(() => {
    theatreController.setCanEnter(playbackActive);
  }, [playbackActive]);

  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const stateRef = useRef(state);
  queueRef.current = queue;
  queueIndexRef.current = queueIndex;
  stateRef.current = state;

  const isPlayerBarUpNow = useCallback(() => {
    const idx = queueIndexRef.current;
    const track = idx >= 0 ? queueRef.current[idx] : null;
    const playerState = stateRef.current;
    return (
      track !== null &&
      (playerState === "playing" ||
        playerState === "paused" ||
        playerState === "loading" ||
        playerState === "error")
    );
  }, []);

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
    volumeRef.current = clamped;
    writePlayerVolume(clamped);
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

  const trackSrcMatches = useCallback((audio: HTMLAudioElement, audioUrl: string) => {
    try {
      return (
        new URL(audio.src, window.location.origin).href ===
        new URL(audioUrl, window.location.origin).href
      );
    } catch {
      return false;
    }
  }, []);

  const restoreSiteAudioElement = useCallback(() => {
    if (!adoptedAudioRef.current) return;
    adoptedAudioRef.current = null;
    audioRef.current = siteAudioRef.current;
    setActiveAudio(siteAudioRef.current);
    if (siteAudioRef.current) siteAudioRef.current.volume = volumeRef.current;
  }, []);

  /** Keep playback running when re-anchoring queue/context to the same audio source. */
  const tryContinueSameSource = useCallback(
    (track: QueueTrack): boolean => {
      const audio = audioRef.current;
      if (!audio || !track.audioUrl || audio.ended) return false;
      if (!trackSrcMatches(audio, track.audioUrl)) return false;

      syncTheatreTrackContext(track.id);

      if (audio.paused) {
        setState("loading");
        void audio.play().then(() => {
          if (!audio.paused) {
            setState("playing");
            logPlaybackStart(track);
            theatreController.setCanEnter(true);
          }
        }).catch(() => setState("paused"));
      } else {
        setState("playing");
        theatreController.setCanEnter(true);
      }
      return true;
    },
    [logPlaybackStart, trackSrcMatches],
  );

  const loadTrack = useCallback((track: QueueTrack) => {
    syncTheatreTrackContext(track.id);

    if (adoptedAudioRef.current) {
      adoptedAudioRef.current.pause();
      restoreSiteAudioElement();
    }

    const audio = audioRef.current;
    if (!audio || !track.audioUrl) {
      setState("error");
      return;
    }
    setState("loading");
    audio.src = track.audioUrl;
    audio.load();
    void audio.play().then(() => {
      if (!audio.paused) {
        setState("playing");
        logPlaybackStart(track);
        theatreController.setCanEnter(true);
      }
    }).catch(() => setState("paused"));
  }, [logPlaybackStart, restoreSiteAudioElement]);

  const completeAutoplaySegmentIfNeeded = useCallback(() => {
    const segment = currentSegmentRef.current;
    if (!segment.autoplay || !segment.playlistId) return;
    recordAutoplayPlaylistCompleted(segment.playlistId);
    currentSegmentRef.current = { ...segment, autoplay: false };
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

      currentSegmentRef.current = {
        playlistId: context?.playlistId,
        autoplay: options?.seedAutoplay === true,
      };
      segmentEndIndexRef.current = tracks.length - 1;
      setSegmentLabel(options?.segmentLabel ?? tracks[index]?.playlistTitle ?? null);
      const scope = options?.originScope ?? null;
      activeOriginScopeRef.current = scope;
      setActiveOriginKey(options?.playbackOrigin ?? null);
      setQueueState(tracks);
      setQueueIndex(index);
      const track = tracks[index];
      if (!tryContinueSameSource(track)) {
        loadTrack(track);
      }
    },
    [loadTrack, tryContinueSameSource],
  );

  const adoptExternalPlayback = useCallback(
    (
      audio: HTMLAudioElement,
      tracks: QueueTrack[],
      startIndex: number,
      context?: PlaybackContext,
      options?: BeginSegmentOptions,
    ) => {
      if (tracks.length === 0) return false;
      const index = Math.min(Math.max(startIndex, 0), tracks.length - 1);
      const track = tracks[index];
      if (!track?.audioUrl || audio.paused || audio.ended) return false;

      const currentSrc = new URL(audio.src, window.location.origin).href;
      const trackSrc = new URL(track.audioUrl, window.location.origin).href;
      if (currentSrc !== trackSrc) return false;

      if (currentTrack && currentTrack.id !== track.id) {
        flushPlayback(currentTrack, audioRef.current?.currentTime ?? currentTimeRef.current, false);
        loggedTrackRef.current = null;
      }

      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }

      audio.volume = volumeRef.current;
      adoptedAudioRef.current = audio;
      audioRef.current = audio;
      setActiveAudio(audio);
      syncTheatreTrackContext(track.id);
      theatreController.registerPlaybackSource(audio, {
        recordingId: track.id,
        artworkUrl: track.artworkUrl ?? null,
      });

      if (context) {
        playbackContextRef.current = context;
        setPlaybackContext(context);
        if (context.playlistId) {
          playedPlaylistIdsRef.current.add(context.playlistId);
        }
      }

      currentSegmentRef.current = {
        playlistId: context?.playlistId,
        autoplay: options?.seedAutoplay === true,
      };
      segmentEndIndexRef.current = tracks.length - 1;
      setSegmentLabel(options?.segmentLabel ?? track.playlistTitle ?? null);
      const scope = options?.originScope ?? null;
      activeOriginScopeRef.current = scope;
      setActiveOriginKey(options?.playbackOrigin ?? null);
      currentTimeRef.current = audio.currentTime;
      setTransportCurrentTime(audio.currentTime);
      setTransportDuration(audio.duration || track.durationSeconds || 0);
      setPlayerDismissSnapshot(null);
      setPlayerBarExiting(false);
      setQueueOpen(false);
      setQueueState(tracks);
      setQueueIndex(index);
      setState(audio.paused ? "paused" : "playing");
      logPlaybackStart(track);
      return true;
    },
    [currentTrack, flushPlayback, logPlaybackStart],
  );

  const advanceProgram = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setState("loading");

    try {
      let pipeline = [...upNextPipelineRef.current];

      for (let attempt = 0; attempt < AUTOPLAY_ADVANCE_ATTEMPTS; attempt += 1) {
        let segment = pipeline.shift();
        let autoplaySeedPlaylistId: string | undefined;
        if (!segment) {
          if (!autoplayRef.current) break;
          segment = autopilotTail(playbackContextRef.current);
        }

        setUpNextPipeline(pipeline);

        if (segment.kind === "autopilot") {
          autoplaySeedPlaylistId = segment.seedPlaylistId;
          const avoidance = buildAutoplayAvoidance(playedPlaylistIdsRef.current);
          const resolved =
            (await resolveAutopilotSegment(segment, avoidance.avoidedPlaylistIds)) ??
            (await resolveAutopilotSegment(
              segment,
              buildRelaxedAutoplayAvoidance(playedPlaylistIdsRef.current),
            ));
          if (!resolved) break;
          segment = resolved;
        }

        const hydrated = await hydrateUpNextSegment(segment, playedPlaylistIdsRef.current);
        if (!hydrated || hydrated.tracks.length === 0) {
          if (segment.kind === "playlist" && segment.source === "autopilot") {
            recordAutoplayPlaylistRejected(segment.playlistId);
            playedPlaylistIdsRef.current.add(segment.playlistId);
          }
          continue;
        }

        if (hydrated.playlistId) {
          playedPlaylistIdsRef.current.add(hydrated.playlistId);
          if (segment.kind === "playlist" && segment.source === "autopilot") {
            recordAutoplayPlaylistStarted(hydrated.playlistId, autoplaySeedPlaylistId);
          }
        }

        beginSegment(hydrated.tracks, 0, hydrated.context, {
          seedAutoplay: segment.source === "autopilot",
          segmentLabel:
            segment.source === "autopilot"
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
        flushPlayback(currentTrack, audioRef.current?.currentTime ?? currentTimeRef.current, false);
        loggedTrackRef.current = null;
      }
      const tracks = nextQueue ?? [track];
      const index = tracks.findIndex((t) => t.id === track.id);
      beginSegment(tracks, index >= 0 ? index : 0, context, options);
    },
    [currentTrack, flushPlayback, beginSegment],
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
        flushPlayback(currentTrack, audioRef.current?.currentTime ?? currentTimeRef.current, false);
        loggedTrackRef.current = null;
      }
      beginSegment(tracks, startIndex, context, options);
    },
    [currentTrack, flushPlayback, beginSegment],
  );

  const shiftOriginToTrack = useCallback((nextTrackId: string) => {
    setActiveOriginKey((prev) =>
      shiftPlaybackOriginForTrack(prev, activeOriginScopeRef.current, nextTrackId),
    );
  }, []);

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
    const idx = queueIndexRef.current;
    if (!audio || idx < 0) return;
    const track = queueRef.current[idx];
    if (audio.paused) {
      if (track) syncTheatreTrackContext(track.id);
      void audio.play().then(() => {
        if (!audio.paused) {
          setState("playing");
          theatreController.setCanEnter(true);
        }
      }).catch(() => setState("paused"));
    } else {
      audio.pause();
      setState("paused");
    }
  }, []);

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
      shiftOriginToTrack(q[next].id);
      loadTrack(q[next]);
      return;
    }

    if (idx < end) {
      const next = idx + 1;
      setQueueIndex(next);
      shiftOriginToTrack(q[next].id);
      loadTrack(q[next]);
      return;
    }

    if (repeatRef.current === "all" && q.length > 0) {
      setQueueIndex(0);
      shiftOriginToTrack(q[0].id);
      loadTrack(q[0]);
      return;
    }

    completeAutoplaySegmentIfNeeded();
    void advanceProgram();
  }, [loadTrack, advanceProgram, shiftOriginToTrack, completeAutoplaySegmentIfNeeded]);

  const skipToUpNext = useCallback(() => {
    if (upNextPipelineRef.current.length === 0 && !autoplayRef.current) return;
    if (advancingRef.current) return;

    const idx = queueIndexRef.current;
    const track = idx >= 0 ? queueRef.current[idx] : null;
    if (track) {
      flushPlayback(track, audioRef.current?.currentTime ?? currentTimeRef.current, false);
      loggedTrackRef.current = null;
    }

    void advanceProgram();
  }, [flushPlayback, advanceProgram]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (queueIndex > 0) {
      const prev = queueIndex - 1;
      setQueueIndex(prev);
      shiftOriginToTrack(queue[prev].id);
      loadTrack(queue[prev]);
    }
  }, [queue, queueIndex, loadTrack, shiftOriginToTrack]);

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

  const releasePlayback = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    const idx = queueIndexRef.current;
    const track = idx >= 0 ? queueRef.current[idx] : null;
    const audio = audioRef.current;
    if (track) {
      flushPlayback(track, audio?.currentTime ?? currentTimeRef.current, false);
      loggedTrackRef.current = null;
    }
    audio?.pause();

    if (isPlayerBarUpNow() && track) {
      setPlayerDismissSnapshot({
        track,
        playbackContext: { ...playbackContextRef.current },
        currentTime: audio?.currentTime ?? currentTimeRef.current,
        duration: audio?.duration || transportDuration,
      });
      setPlayerBarExiting(true);
      setQueueIndex(-1);
      setState("idle");
      setQueueOpen(false);
      dismissTimerRef.current = window.setTimeout(() => {
        setPlayerDismissSnapshot(null);
        setPlayerBarExiting(false);
        dismissTimerRef.current = null;
      }, PLAYER_DISMISS_MS);
      return;
    }

    setPlayerDismissSnapshot(null);
    setPlayerBarExiting(false);
    setQueueIndex(-1);
    setState("idle");
    setQueueOpen(false);
  }, [transportDuration, flushPlayback, isPlayerBarUpNow]);

  const yieldPlaybackToRadio = useCallback(() => {
    const ownedAudio = audioRef.current;
    ownedAudio?.pause();
    siteAudioRef.current?.pause();
    if (isPlayerBarUpNow()) {
      releasePlayback();
      restoreSiteAudioElement();
      return;
    }
    restoreSiteAudioElement();
  }, [isPlayerBarUpNow, releasePlayback, restoreSiteAudioElement]);

  const resumePlaybackIfPaused = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.ended || queueIndexRef.current < 0) return;
    if (!audio.paused) return;
    void audio.play().then(() => {
      if (!audio.paused) setState("playing");
    }).catch(() => setState("paused"));
  }, []);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
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
    const audio = activeAudio;
    if (!audio) return;

    const onTime = () => {
      const t = audio.currentTime;
      currentTimeRef.current = t;
      setTransportCurrentTime(t);
    };
    const onMeta = () => setTransportDuration(audio.duration || 0);
    const onPlay = () => {
      setState("playing");
      const idx = queueIndexRef.current;
      const track = idx >= 0 ? queueRef.current[idx] : null;
      if (track) logPlaybackStart(track);
    };
    const onPause = () => {
      setState(queueIndexRef.current >= 0 ? "paused" : "idle");
    };
    const onWaiting = () => {
      if (audio.paused) return;
      setState("loading");
    };
    const onEnded = () => {
      const idx = queueIndexRef.current;
      const track = idx >= 0 ? queueRef.current[idx] : null;
      if (track) {
        flushPlayback(track, audio.duration || currentTimeRef.current, true);
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
      const segment = currentSegmentRef.current;
      if (segment.autoplay && segment.playlistId) {
        recordAutoplayPlaylistRejected(segment.playlistId);
        playedPlaylistIdsRef.current.add(segment.playlistId);
        currentSegmentRef.current = { ...segment, autoplay: false };
      }
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
  }, [activeAudio, playNext, flushPlayback, logPlaybackStart, advanceProgram]);

  useEffect(() => {
    if (!autoplayEnabled || !playbackContext.playlistId) {
      setAutoplayNextSegment(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const strict = await prefetchAutoplayNext(
        playbackContext.playlistId,
        buildAutoplayAvoidance(playedPlaylistIdsRef.current).avoidedPlaylistIds,
      );
      const relaxed =
        strict ??
        (await prefetchAutoplayNext(
          playbackContext.playlistId,
          buildRelaxedAutoplayAvoidance(playedPlaylistIdsRef.current),
        ));
      if (!cancelled) setAutoplayNextSegment(relaxed);
    })();

    return () => {
      cancelled = true;
    };
  }, [autoplayEnabled, playbackContext.playlistId, segmentLabel, upNextPipeline.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isPlaybackFocusSuppressed()) return;
      if (isPlayerShortcutSuppressed(event)) return;
      if (!currentTrack) return;
      event.preventDefault();
      togglePlay();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentTrack, togglePlay]);

  const sessionValue = useMemo<AudioPlayerContextValue>(
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
      playerShellActive,
      playerBarExiting,
      playerDismissSnapshot,
      isPlaying,
      playbackContext,
      activeOriginKey,
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
      adoptExternalPlayback,
      togglePlay,
      playNext,
      playPrevious,
      skipToUpNext,
      appendToQueue,
      appendUpNextSegment,
      removeUpNextSegment,
      removeFromQueue,
      updateQueuePlaylistTitle,
      updateQueuePlaylistSlug,
      releasePlayback,
      yieldPlaybackToRadio,
      resumePlaybackIfPaused,
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
      playerShellActive,
      playerBarExiting,
      playerDismissSnapshot,
      isPlaying,
      playbackContext,
      activeOriginKey,
      queueOpen,
      shuffle,
      toggleShuffle,
      repeatMode,
      cycleRepeat,
      volume,
      setVolume,
      playTrack,
      setQueue,
      adoptExternalPlayback,
      togglePlay,
      playNext,
      playPrevious,
      skipToUpNext,
      appendToQueue,
      appendUpNextSegment,
      removeUpNextSegment,
      removeFromQueue,
      updateQueuePlaylistTitle,
      updateQueuePlaylistSlug,
      releasePlayback,
      yieldPlaybackToRadio,
      resumePlaybackIfPaused,
    ],
  );

  const transportValue = useMemo<PlaybackTransportValue>(
    () => ({
      currentTime: transportCurrentTime,
      duration: transportDuration,
      seek,
    }),
    [transportCurrentTime, transportDuration, seek],
  );

  return (
    <AudioPlayerContext.Provider value={sessionValue}>
      <PlaybackTransportContext.Provider value={transportValue}>
        {children}
        <audio
          ref={bindAudioElement}
          data-site-player
          preload="metadata"
          crossOrigin="anonymous"
          className="hidden"
        />
      </PlaybackTransportContext.Provider>
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
