import { useCallback, useState } from "react";

import {
  collectSnapTargets,
  resolveSnapThresholdSec,
  snapClipMoveStart,
  snapClipResizeEnd,
  snapClipResizeStart,
  type SnapGuide,
} from "../timelineSnap";
import type { TimelineClip } from "../types";

type UseTimelineSnapGuidesArgs = {
  clips: TimelineClip[];
  songDurationSec: number;
  playheadSec: number;
  getTrackRect: () => DOMRect | null;
};

export function useTimelineSnapGuides({
  clips,
  songDurationSec,
  playheadSec,
  getTrackRect,
}: UseTimelineSnapGuidesArgs) {
  const [activeGuide, setActiveGuide] = useState<SnapGuide | null>(null);

  const getThresholdSec = useCallback(() => {
    const width = getTrackRect()?.width ?? 0;
    return resolveSnapThresholdSec(songDurationSec, width);
  }, [songDurationSec, getTrackRect]);

  const buildTargets = useCallback((excludeAttachmentId: string) => {
    return collectSnapTargets({
      songDurationSec,
      playheadSec,
      clips,
      excludeAttachmentId,
    });
  }, [songDurationSec, playheadSec, clips]);

  const snapMoveStart = useCallback((
    excludeAttachmentId: string,
    clip: Pick<TimelineClip, "durationSec">,
    proposedStartSec: number,
  ) => {
    const result = snapClipMoveStart(
      proposedStartSec,
      clip.durationSec,
      buildTargets(excludeAttachmentId),
      getThresholdSec(),
    );
    setActiveGuide(result.guide ?? null);
    return result.startSec;
  }, [buildTargets, getThresholdSec]);

  const snapResizeStart = useCallback((
    excludeAttachmentId: string,
    proposedStartSec: number,
  ) => {
    const result = snapClipResizeStart(
      proposedStartSec,
      buildTargets(excludeAttachmentId),
      getThresholdSec(),
    );
    setActiveGuide(result.guide ?? null);
    return result.startSec;
  }, [buildTargets, getThresholdSec]);

  const snapResizeEnd = useCallback((
    excludeAttachmentId: string,
    proposedEndSec: number,
  ) => {
    const result = snapClipResizeEnd(
      proposedEndSec,
      buildTargets(excludeAttachmentId),
      getThresholdSec(),
    );
    setActiveGuide(result.guide ?? null);
    return result.endSec;
  }, [buildTargets, getThresholdSec]);

  const clearSnapGuide = useCallback(() => {
    setActiveGuide(null);
  }, []);

  return {
    activeGuide,
    snapMoveStart,
    snapResizeStart,
    snapResizeEnd,
    clearSnapGuide,
  };
}
