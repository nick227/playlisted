import {
  BEAT_FX_EFFECTS,
  BEAT_FX_INTENSITIES,
  MAX_ATTACHMENT_LABEL_LENGTH,
  MAX_ATTACHMENT_ORDER,
  MAX_ATTACHMENT_TAG_LENGTH,
  MAX_ATTACHMENT_TAGS,
  MAX_ATTACHMENT_WEIGHT,
  MAX_MEDIA_DIMENSION_PX,
  MAX_MEDIA_DURATION_MS,
  MAX_PIN_PRESET_ID_LENGTH,
  MAX_ROTATION_HOLD_MS,
  MAX_START_OFFSET_MS,
  MAX_TIMELINE_SEC,
  PLAYBACK_OBJECT_FITS,
  ROTATION_GATE_KINDS,
  ROTATION_MODES,
} from "./constants.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampNonNegativeMs(value: unknown, max: number): number | undefined {
  if (!finiteNumber(value) || value < 0) return undefined;
  return clampInt(value, 0, max);
}

function clampTimelineSec(value: unknown): number | undefined {
  if (!finiteNumber(value) || value < 0) return undefined;
  return Math.min(value, MAX_TIMELINE_SEC);
}

export function sanitizeWeight(value: number): number {
  if (!finiteNumber(value)) return 1;
  return clampInt(value, 1, MAX_ATTACHMENT_WEIGHT);
}

export function sanitizeOrder(value: number): number {
  if (!finiteNumber(value)) return 0;
  return clampInt(value, 0, MAX_ATTACHMENT_ORDER);
}

export function sanitizeLabel(value: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_ATTACHMENT_LABEL_LENGTH);
}

export function sanitizeMediaDurationMs(value: number | null): number | null {
  if (value == null) return null;
  const clamped = clampNonNegativeMs(value, MAX_MEDIA_DURATION_MS);
  return clamped ?? null;
}

export function sanitizeMediaDimension(value: number | null): number | null {
  if (value == null) return null;
  const clamped = clampNonNegativeMs(value, MAX_MEDIA_DIMENSION_PX);
  return clamped ?? null;
}

export function sanitizePlaybackJson(value: unknown): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null;

  const sanitized: Record<string, unknown> = {};

  if (typeof value.loop === "boolean") sanitized.loop = value.loop;
  if (typeof value.muted === "boolean") sanitized.muted = value.muted;
  if (typeof value.objectFit === "string" && (PLAYBACK_OBJECT_FITS as readonly string[]).includes(value.objectFit)) {
    sanitized.objectFit = value.objectFit;
  }

  const startOffsetMs = clampNonNegativeMs(value.startOffsetMs, MAX_START_OFFSET_MS);
  if (startOffsetMs != null) sanitized.startOffsetMs = startOffsetMs;

  const timelineStartSec = clampTimelineSec(value.timelineStartSec);
  if (timelineStartSec != null) sanitized.timelineStartSec = timelineStartSec;

  const timelineDurationSec = clampTimelineSec(value.timelineDurationSec);
  if (timelineDurationSec != null) sanitized.timelineDurationSec = timelineDurationSec;

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function normalizeRotationHolds(sanitized: Record<string, unknown>) {
  if (
    typeof sanitized.minHoldMs !== "number"
    && typeof sanitized.targetHoldMs !== "number"
    && typeof sanitized.maxHoldMs !== "number"
  ) {
    return;
  }

  let minHoldMs = typeof sanitized.minHoldMs === "number" ? sanitized.minHoldMs : 0;
  let targetHoldMs = typeof sanitized.targetHoldMs === "number" ? sanitized.targetHoldMs : minHoldMs;
  let maxHoldMs = typeof sanitized.maxHoldMs === "number" ? sanitized.maxHoldMs : targetHoldMs;

  if (minHoldMs > maxHoldMs) {
    const collapsed = maxHoldMs;
    minHoldMs = collapsed;
    targetHoldMs = collapsed;
    maxHoldMs = collapsed;
  } else {
    if (minHoldMs > targetHoldMs) targetHoldMs = minHoldMs;
    if (targetHoldMs > maxHoldMs) maxHoldMs = targetHoldMs;
  }

  sanitized.minHoldMs = minHoldMs;
  sanitized.targetHoldMs = targetHoldMs;
  sanitized.maxHoldMs = maxHoldMs;
}

export function sanitizeRotationJson(value: unknown): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null;

  const sanitized: Record<string, unknown> = {};

  if (typeof value.mode === "string" && (ROTATION_MODES as readonly string[]).includes(value.mode)) {
    sanitized.mode = value.mode;
  }

  if (typeof value.pinPresetId === "string") {
    const trimmed = value.pinPresetId.trim();
    if (trimmed.length > 0) {
      sanitized.pinPresetId = trimmed.slice(0, MAX_PIN_PRESET_ID_LENGTH);
    }
  }

  for (const holdField of ["minHoldMs", "targetHoldMs", "maxHoldMs"] as const) {
    const parsed = clampNonNegativeMs(value[holdField], MAX_ROTATION_HOLD_MS);
    if (parsed != null) sanitized[holdField] = parsed;
  }
  normalizeRotationHolds(sanitized);

  if (isPlainObject(value.gate) && typeof value.gate.kind === "string") {
    if ((ROTATION_GATE_KINDS as readonly string[]).includes(value.gate.kind)) {
      if (value.gate.kind === "flux") {
        if (finiteNumber(value.gate.threshold) && value.gate.threshold >= 0 && value.gate.threshold <= 1) {
          sanitized.gate = { kind: "flux", threshold: value.gate.threshold };
        }
      } else {
        sanitized.gate = { kind: value.gate.kind };
      }
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export function sanitizeBeatFxJson(value: unknown): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null;

  const sanitized: Record<string, unknown> = {};

  if (typeof value.enabled === "boolean") sanitized.enabled = value.enabled;
  if (typeof value.intensity === "string" && (BEAT_FX_INTENSITIES as readonly string[]).includes(value.intensity)) {
    sanitized.intensity = value.intensity;
  }

  if (Array.isArray(value.effects)) {
    const effects = value.effects.filter(
      (effect): effect is string =>
        typeof effect === "string" && (BEAT_FX_EFFECTS as readonly string[]).includes(effect),
    );
    if (effects.length > 0) sanitized.effects = [...new Set(effects)];
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export function sanitizeTagsJson(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const tags: string[] = [];
  for (const entry of value.slice(0, MAX_ATTACHMENT_TAGS)) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    tags.push(trimmed.slice(0, MAX_ATTACHMENT_TAG_LENGTH));
  }

  return tags.length > 0 ? tags : null;
}
