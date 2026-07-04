export const RECORDING_REACTION_KINDS = ["LOVE", "FIRE", "SPARKLE", "THUMBS"] as const;

export type RecordingReactionKind = (typeof RECORDING_REACTION_KINDS)[number];

export function parseRecordingReactionKind(value: string): RecordingReactionKind | null {
  const normalized = value.trim().toUpperCase();
  return RECORDING_REACTION_KINDS.includes(normalized as RecordingReactionKind)
    ? (normalized as RecordingReactionKind)
    : null;
}
