import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { parseTrackHash } from "@/lib/browsePaths";

const HIGHLIGHT_CLASS = "ring-2 ring-[var(--color-brand)] ring-inset bg-white/[0.08]";

export function usePlaylistHashTrack(ready: boolean) {
  const { hash } = useLocation();

  useEffect(() => {
    if (!ready) return;

    const recordingId = parseTrackHash(hash);
    if (!recordingId) return;

    let timer: number | undefined;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(`track-${recordingId}`);
      if (!element) return;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add(HIGHLIGHT_CLASS);
      timer = window.setTimeout(() => {
        element.classList.remove(HIGHLIGHT_CLASS);
      }, 2500);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [hash, ready]);
}
