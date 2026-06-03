import { resolveAutopilotSegment } from "./resolveAutopilot";
import type { UpNextSegment } from "./types";

export type PrefetchedPlaylistNext = Extract<UpNextSegment, { kind: "playlist" }>;

function autopilotProbe(seedPlaylistId: string | undefined): Extract<UpNextSegment, { kind: "autopilot" }> {
  return {
    id: "",
    kind: "autopilot",
    label: "",
    resolver: "continue",
    seedPlaylistId,
    source: "autopilot",
  };
}

export async function prefetchAutoplayNext(
  seedPlaylistId: string | undefined,
  avoidedPlaylistIds: Set<string>,
): Promise<PrefetchedPlaylistNext | null> {
  const resolved = await resolveAutopilotSegment(autopilotProbe(seedPlaylistId), avoidedPlaylistIds);
  if (!resolved || resolved.kind !== "playlist") return null;
  return resolved;
}
