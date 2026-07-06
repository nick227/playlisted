import { useEffect, useRef } from "react";

import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

/** Resumes site playback after route changes when audio was playing before navigation. */
export function useResumePlaybackAfterNav(pathname: string, radioPlaying: boolean) {
  const { state, resumePlaybackIfPaused } = useAudioPlayer();
  const resumeAfterNavRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      resumeAfterNavRef.current = stateRef.current === "playing" || stateRef.current === "loading";
    };
  }, [pathname]);

  useEffect(() => {
    if (!resumeAfterNavRef.current) return;
    resumeAfterNavRef.current = false;
    const timer = window.setTimeout(() => {
      if (radioPlaying) return;
      resumePlaybackIfPaused();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, radioPlaying, resumePlaybackIfPaused]);

  useEffect(() => {
    if (radioPlaying) resumeAfterNavRef.current = false;
  }, [radioPlaying]);
}
