import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { parseTrackHash } from "@/lib/browsePaths";
import { recordingSlug } from "@/lib/routes";

const MAX_ATTEMPTS = 60;

type HashTrack = {
  id: string;
  title: string;
};

function decodeHashSlug(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const value = hash.slice(1).split("?")[0]?.trim() ?? "";
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

/** Deep-link once from the arrival hash. Playlist hash updates use replaceState, so router hash stays sticky. */
export function usePlaylistHashTrack<TTrack extends HashTrack>(
  tracks: TTrack[],
  onTargetTrack?: (track: TTrack, index: number) => void,
) {
  const { hash } = useLocation();
  const onTargetTrackRef = useRef(onTargetTrack);
  onTargetTrackRef.current = onTargetTrack;

  const playedHashRef = useRef<string | null>(null);
  const scrolledHashRef = useRef<string | null>(null);
  const ready = tracks.length > 0;

  useEffect(() => {
    if (!ready || !hash) return;

    const target = findHashTrack(hash, tracks);
    if (!target) return;

    const targetId = target.id;
    const targetIndex = tracks.findIndex((track) => track.id === targetId);
    if (targetIndex < 0) return;

    if (playedHashRef.current !== hash) {
      playedHashRef.current = hash;
      onTargetTrackRef.current?.(tracks[targetIndex], targetIndex);
    }

    if (scrolledHashRef.current === hash) return;

    let cancelled = false;
    let attempts = 0;

    function tick() {
      if (cancelled || attempts++ > MAX_ATTEMPTS) return;

      const element = document.getElementById(`track-${targetId}`);
      if (!element) {
        requestAnimationFrame(tick);
        return;
      }

      scrolledHashRef.current = hash;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    tick();

    return () => {
      cancelled = true;
    };
  }, [hash, ready, tracks]);
}
