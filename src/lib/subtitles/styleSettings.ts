export type SubtitlePosition = "top" | "middle" | "bottom";

export const DEFAULT_SUBTITLE_POSITION: SubtitlePosition = "middle";
export const DEFAULT_SUBTITLE_STYLE_ID = "classic";

const VALID_POSITIONS = new Set<SubtitlePosition>(["top", "middle", "bottom"]);

const VALID_STYLE_IDS = new Set([
  "classic",
  "super-giant",
  "cinema",
  "neon",
  "karaoke",
  "minimal",
  "bubble",
  "retro",
  "outline",
  "pop",
  "glow",
  "vaporwave",
  "glitch",
  "broadcast",
  "documentary",
  "studio",
  "closed-caption",
  "frost",
  "slate",
  "editorial",
  "prestige",
  "corporate",
  "stream",
  "lecture",
  "legal",
  "conference",
  "night-mode",
]);

export function isSubtitlePosition(value: string): value is SubtitlePosition {
  return VALID_POSITIONS.has(value as SubtitlePosition);
}

export function isSubtitleStyleId(value: string): boolean {
  return VALID_STYLE_IDS.has(value);
}

export function normalizeSubtitlePosition(value: unknown): SubtitlePosition {
  return typeof value === "string" && isSubtitlePosition(value) ? value : DEFAULT_SUBTITLE_POSITION;
}

export function normalizeSubtitleStyleId(value: unknown): string {
  return typeof value === "string" && isSubtitleStyleId(value) ? value : DEFAULT_SUBTITLE_STYLE_ID;
}

export function mapRecordingSubtitleStyle(recording: {
  subtitlePosition?: string | null;
  subtitleStyleId?: string | null;
}) {
  return {
    subtitlePosition: normalizeSubtitlePosition(recording.subtitlePosition),
    subtitleStyleId: normalizeSubtitleStyleId(recording.subtitleStyleId),
  };
}
