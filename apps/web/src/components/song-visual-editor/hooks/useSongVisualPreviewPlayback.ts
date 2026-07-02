import { useCallback, useEffect, useRef, useState } from "react";

import { getAudioAnalyserConnection } from "@/features/playback-indicators/audioAnalyser";

import { resolveAssetUrl } from "../types";

async function resumeAnalyserContext(audio: HTMLAudioElement) {
  const connection = getAudioAnalyserConnection(audio);
  if (!connection || connection.context.state === "running") return;
  try {
    await connection.context.resume();
  } catch {
    // ignore resume failures during preview
  }
}

async function playPreviewAudio(audio: HTMLAudioElement) {
  await resumeAnalyserContext(audio);
  await audio.play();
}

export function useSongVisualPreviewPlayback(audioUrl?: string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

  const bindAudioElement = useCallback((audio: HTMLAudioElement | null) => {
    audioRef.current = audio;
    setAudioReady(audio != null);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTimeSec(audio.currentTime);
    const onPlay = () => {
      setIsPlaying(true);
      void resumeAnalyserContext(audio);
    };
    const onPause = () => setIsPlaying(false);
    const onLoadedMetadata = () => setDurationSec(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTimeSec(0);
    };
    const onPlaybackIntent = () => {
      void resumeAnalyserContext(audio);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("playing", onPlaybackIntent);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("playing", onPlaybackIntent);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioReady]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioUrl) {
      audio.removeAttribute("src");
      audio.load();
      setCurrentTimeSec(0);
      setDurationSec(0);
      setIsPlaying(false);
      return;
    }

    audio.src = resolveAssetUrl(audioUrl);
    audio.load();
    setCurrentTimeSec(0);
  }, [audioReady, audioUrl]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (audio.paused) {
      void playPreviewAudio(audio).catch(() => undefined);
      return;
    }
    audio.pause();
  }, [audioUrl]);

  const seekTo = useCallback((timeSec: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(timeSec)) return;
    audio.currentTime = Math.max(0, Math.min(timeSec, audio.duration || timeSec));
    setCurrentTimeSec(audio.currentTime);
  }, []);

  return {
    audioRef,
    bindAudioElement,
    currentTimeSec,
    durationSec,
    isPlaying,
    togglePlayback,
    seekTo,
  };
}
