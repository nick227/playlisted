import { Flame, Heart, Sparkles, ThumbsUp, type LucideIcon } from "lucide-react";

import type { RecordingReactionKind } from "./recordingReactionKinds";

export type RecordingReactionId = "love" | "fire" | "sparkle" | "thumbs";

export type RecordingReactionDef = {
  id: RecordingReactionId;
  kind: RecordingReactionKind;
  /** Short name for aria-label. */
  label: string;
  /** Tooltip explaining what this reaction means. */
  title: string;
  /** When true, guests see a disabled button instead of toggling. */
  requiresAuth: boolean;
  icon: LucideIcon;
};

export const RECORDING_REACTIONS: RecordingReactionDef[] = [
  {
    id: "love",
    kind: "LOVE",
    label: "Love",
    title: "Love — this track really hits for you",
    requiresAuth: true,
    icon: Heart,
  },
  {
    id: "fire",
    kind: "FIRE",
    label: "Fire",
    title: "Fire — peak energy, hard to ignore",
    requiresAuth: true,
    icon: Flame,
  },
  {
    id: "sparkle",
    kind: "SPARKLE",
    label: "Sparkle",
    title: "Sparkle — a standout moment worth remembering",
    requiresAuth: true,
    icon: Sparkles,
  },
  {
    id: "thumbs",
    kind: "THUMBS",
    label: "Thumbs up",
    title: "Thumbs up — solid track, would play again",
    requiresAuth: true,
    icon: ThumbsUp,
  },
];

const kindById = new Map(RECORDING_REACTIONS.map((reaction) => [reaction.id, reaction.kind]));
const idByKind = new Map(RECORDING_REACTIONS.map((reaction) => [reaction.kind, reaction.id]));
const defById = new Map(RECORDING_REACTIONS.map((reaction) => [reaction.id, reaction]));

export function reactionKindForId(id: RecordingReactionId): RecordingReactionKind {
  return kindById.get(id)!;
}

export function reactionIdForKind(kind: RecordingReactionKind): RecordingReactionId {
  return idByKind.get(kind)!;
}

export function getRecordingReactionDef(id: RecordingReactionId): RecordingReactionDef {
  return defById.get(id)!;
}

export function canToggleRecordingReaction(
  def: RecordingReactionDef,
  options: { isAuthenticated: boolean; hasRecording: boolean },
): boolean {
  if (!options.hasRecording) return false;
  if (def.requiresAuth && !options.isAuthenticated) return false;
  return true;
}

export function reactionButtonTitle(
  def: RecordingReactionDef,
  options: { isAuthenticated: boolean; isActive: boolean },
): string {
  if (def.requiresAuth && !options.isAuthenticated) {
    return `${def.title} — sign in to react`;
  }
  if (options.isActive) {
    return `${def.title} — remove your reaction`;
  }
  return def.title;
}
