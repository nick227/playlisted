import { resolveAutopilotSegment } from "./resolveAutopilot";
import type { UpNextSegment } from "./types";

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

export async function prefetchAutoplayLabel(
  seedPlaylistId: string | undefined,
  playedIds: Set<string>,
): Promise<string | null> {
  const resolved = await resolveAutopilotSegment(autopilotProbe(seedPlaylistId), playedIds);
  if (!resolved || resolved.kind === "autopilot") return null;
  return resolved.label;
}
