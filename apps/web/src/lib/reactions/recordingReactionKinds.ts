export const RECORDING_REACTION_KINDS = ["LOVE", "FIRE", "SPARKLE", "THUMBS"] as const;

export type RecordingReactionKind = (typeof RECORDING_REACTION_KINDS)[number];

export type RecordingReactionsResponse = {
  recordingId: string;
  kinds: RecordingReactionKind[];
};
