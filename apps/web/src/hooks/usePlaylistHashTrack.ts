import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { parseTrackHash } from "@/lib/browsePaths";

const HIGHLIGHT_CLASSES = ["ring-2", "ring-[var(--color-brand)]", "ring-inset", "bg-white/[0.08]"] as const;
const MAX_ATTEMPTS = 60;

function setTrackHighlight(element: HTMLElement, on: boolean) {
  for (const className of HIGHLIGHT_CLASSES) {
    element.classList[on ? "add" : "remove"](className);
  }
}

export function usePlaylistHashTrack(ready: boolean) {
  const { hash } = useLocation();

  useEffect(() => {
    if (!ready) return;

    const recordingId = parseTrackHash(hash);
    if (!recordingId) return;

    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    function tick() {
      if (cancelled || attempts++ > MAX_ATTEMPTS) return;

      const element = document.getElementById(`track-${recordingId}`);
      if (!element) {
        requestAnimationFrame(tick);
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setTrackHighlight(element, true);
      timer = window.setTimeout(() => {
        setTrackHighlight(element, false);
      }, 2500);
    }

    tick();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [hash, ready]);
}
