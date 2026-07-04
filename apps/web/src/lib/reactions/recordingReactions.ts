import { Flame, Heart, Sparkles, ThumbsUp, type LucideIcon } from "lucide-react";

import type { RecordingReactionKind } from "./recordingReactionKinds";

export type RecordingReactionId = "love" | "fire" | "sparkle" | "thumbs";

export type RecordingReactionDef = {
  id: RecordingReactionId;
  kind: RecordingReactionKind;
  label: string;
  icon: LucideIcon;
};

export const RECORDING_REACTIONS: RecordingReactionDef[] = [
  { id: "love", kind: "LOVE", label: "Love", icon: Heart },
  { id: "fire", kind: "FIRE", label: "Fire", icon: Flame },
  { id: "sparkle", kind: "SPARKLE", label: "Sparkle", icon: Sparkles },
  { id: "thumbs", kind: "THUMBS", label: "Thumbs up", icon: ThumbsUp },
];

const kindById = new Map(RECORDING_REACTIONS.map((reaction) => [reaction.id, reaction.kind]));
const idByKind = new Map(RECORDING_REACTIONS.map((reaction) => [reaction.kind, reaction.id]));

export function reactionKindForId(id: RecordingReactionId): RecordingReactionKind {
  return kindById.get(id)!;
}

export function reactionIdForKind(kind: RecordingReactionKind): RecordingReactionId {
  return idByKind.get(kind)!;
}
