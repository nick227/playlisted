import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { parseTrackHash } from "@/lib/browsePaths";
import { recordingSlug } from "@/lib/routes";

const HIGHLIGHT_CLASSES = ["ring-2", "ring-[var(--color-brand)]", "ring-inset", "bg-white/[0.08]"] as const;
const MAX_ATTEMPTS = 60;

type HashTrack = {
  id: string;
  title: string;
};

function setTrackHighlight(element: HTMLElement, on: boolean) {
  for (const className of HIGHLIGHT_CLASSES) {
    element.classList[on ? "add" : "remove"](className);
  }
}

function decodeHashSlug(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const value = hash.slice(1).trim();
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function findHashTrack<TTrack extends HashTrack>(hash: string, tracks: TTrack[]): TTrack | HashTrack | null {
  const legacyId = parseTrackHash(hash);
  if (legacyId) return tracks.find((track) => track.id === legacyId) ?? { id: legacyId, title: "" };

  const slug = decodeHashSlug(hash);
  if (!slug) return null;

  return tracks.find((track) => recordingSlug(track.title) === slug) ?? null;
}

export function usePlaylistHashTrack<TTrack extends HashTrack>(
  tracks: TTrack[],
  onTargetTrack?: (track: TTrack, index: number) => void,
) {
  const { hash } = useLocation();
  const handledPlaybackHashRef = useRef<string | null>(null);
  const ready = tracks.length > 0;

  useEffect(() => {
    if (!ready) return;

    const target = findHashTrack(hash, tracks);
    if (!target) return;

    const recordingId = target.id;
    const targetIndex = tracks.findIndex((track) => track.id === recordingId);

    if (targetIndex >= 0 && handledPlaybackHashRef.current !== hash) {
      handledPlaybackHashRef.current = hash;
      onTargetTrack?.(tracks[targetIndex], targetIndex);
    }

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
  }, [hash, onTargetTrack, ready, tracks]);
}
