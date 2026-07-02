import type { TimelineClip } from "./types";

export type SnapGuideKind = "song-start" | "song-end" | "playhead" | "clip-edge";

export type SnapGuide = {
  timeSec: number;
  kind: SnapGuideKind;
  label?: string;
};

export type SnapResult = {
  timeSec: number;
  snapped: boolean;
  guide?: SnapGuide;
};

const SNAP_THRESHOLD_MIN_SEC = 0.15;
const SNAP_THRESHOLD_MAX_SEC = 0.25;
const SNAP_THRESHOLD_PX = 10;

export function resolveSnapThresholdSec(songDurationSec: number, trackWidthPx: number): number {
  if (trackWidthPx <= 0 || songDurationSec <= 0) {
    return (SNAP_THRESHOLD_MIN_SEC + SNAP_THRESHOLD_MAX_SEC) / 2;
  }
  const pixelEquivalentSec = (SNAP_THRESHOLD_PX / trackWidthPx) * songDurationSec;
  return Math.min(SNAP_THRESHOLD_MAX_SEC, Math.max(SNAP_THRESHOLD_MIN_SEC, pixelEquivalentSec));
}

type CollectSnapTargetsArgs = {
  songDurationSec: number;
  playheadSec: number;
  clips: TimelineClip[];
  excludeAttachmentId: string;
};

export function collectSnapTargets({
  songDurationSec,
  playheadSec,
  clips,
  excludeAttachmentId,
}: CollectSnapTargetsArgs): SnapGuide[] {
  const targets: SnapGuide[] = [
    { timeSec: 0, kind: "song-start", label: "Song start" },
    { timeSec: songDurationSec, kind: "song-end", label: "Song end" },
    { timeSec: playheadSec, kind: "playhead", label: "Playhead" },
  ];

  for (const clip of clips) {
    if (clip.attachment.id === excludeAttachmentId) continue;
    targets.push({ timeSec: clip.startSec, kind: "clip-edge" });
    targets.push({ timeSec: clip.endSec, kind: "clip-edge" });
  }

  return targets;
}

export function snapTimeSec(
  proposedSec: number,
  targets: SnapGuide[],
  thresholdSec: number,
): SnapResult {
  if (!Number.isFinite(proposedSec)) {
    return { timeSec: proposedSec, snapped: false };
  }

  let bestGuide: SnapGuide | undefined;
  let bestDelta = thresholdSec;

  for (const guide of targets) {
    const delta = Math.abs(guide.timeSec - proposedSec);
    if (delta <= bestDelta) {
      bestGuide = guide;
      bestDelta = delta;
    }
  }

  if (!bestGuide) {
    return { timeSec: proposedSec, snapped: false };
  }

  return { timeSec: bestGuide.timeSec, snapped: true, guide: bestGuide };
}

export function snapClipMoveStart(
  proposedStartSec: number,
  durationSec: number,
  targets: SnapGuide[],
  thresholdSec: number,
): { startSec: number; guide?: SnapGuide } {
  const proposedEndSec = proposedStartSec + durationSec;
  const startSnap = snapTimeSec(proposedStartSec, targets, thresholdSec);
  const endSnap = snapTimeSec(proposedEndSec, targets, thresholdSec);

  const startDelta = startSnap.snapped ? Math.abs(startSnap.timeSec - proposedStartSec) : Number.POSITIVE_INFINITY;
  const endDelta = endSnap.snapped ? Math.abs(endSnap.timeSec - proposedEndSec) : Number.POSITIVE_INFINITY;

  if (startSnap.snapped && startDelta <= endDelta) {
    return { startSec: startSnap.timeSec, guide: startSnap.guide };
  }
  if (endSnap.snapped) {
    return { startSec: endSnap.timeSec - durationSec, guide: endSnap.guide };
  }

  return { startSec: proposedStartSec };
}

export function snapClipResizeStart(
  proposedStartSec: number,
  targets: SnapGuide[],
  thresholdSec: number,
): { startSec: number; guide?: SnapGuide } {
  const snap = snapTimeSec(proposedStartSec, targets, thresholdSec);
  return { startSec: snap.timeSec, guide: snap.guide };
}

export function snapClipResizeEnd(
  proposedEndSec: number,
  targets: SnapGuide[],
  thresholdSec: number,
): { endSec: number; guide?: SnapGuide } {
  const snap = snapTimeSec(proposedEndSec, targets, thresholdSec);
  return { endSec: snap.timeSec, guide: snap.guide };
}
