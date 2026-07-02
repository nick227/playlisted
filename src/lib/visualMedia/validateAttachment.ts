import {
  BEAT_FX_EFFECTS,
  BEAT_FX_INTENSITIES,
  MAX_ATTACHMENT_LABEL_LENGTH,
  MAX_ATTACHMENT_ORDER,
  MAX_ATTACHMENT_TAG_LENGTH,
  MAX_ATTACHMENT_TAGS,
  MAX_ATTACHMENT_WEIGHT,
  MAX_PIN_PRESET_ID_LENGTH,
  MAX_ROTATION_HOLD_MS,
  MAX_START_OFFSET_MS,
  MAX_TIMELINE_SEC,
  PLAYBACK_OBJECT_FITS,
  ROTATION_GATE_KINDS,
  ROTATION_MODES,
  WRITABLE_SONG_VISUAL_POLICIES,
  type WritableSongVisualPolicy,
} from "./constants.js";

export type AttachmentValidationIssue = {
  field: string;
  code: string;
  message: string;
};

export type ValidatedAttachmentBody = {
  mediaAssetId?: string;
  policy?: WritableSongVisualPolicy;
  weight?: number;
  order?: number;
  label?: string | null;
  enabled?: boolean;
  playback?: Record<string, unknown> | null;
  rotation?: Record<string, unknown> | null;
  beatFx?: Record<string, unknown> | null;
  tags?: string[] | null;
};

type ValidationResult =
  | { ok: true; value: ValidatedAttachmentBody }
  | { ok: false; issues: AttachmentValidationIssue[] };

function issue(field: string, code: string, message: string): AttachmentValidationIssue {
  return { field, code, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNonNegativeMs(value: unknown, field: string, max: number, issues: AttachmentValidationIssue[]): number | null {
  if (!finiteNumber(value)) {
    issues.push(issue(field, "invalid_number", `${field} must be a finite number.`));
    return null;
  }
  if (value < 0) {
    issues.push(issue(field, "negative_value", `${field} cannot be negative.`));
    return null;
  }
  if (value > max) {
    issues.push(issue(field, "out_of_range", `${field} exceeds the allowed maximum.`));
    return null;
  }
  return Math.round(value);
}

function parseTimelineSec(value: unknown, field: string, issues: AttachmentValidationIssue[]): number | null {
  if (!finiteNumber(value)) {
    issues.push(issue(field, "invalid_number", `${field} must be a finite number.`));
    return null;
  }
  if (value < 0) {
    issues.push(issue(field, "negative_value", `${field} cannot be negative.`));
    return null;
  }
  if (value > MAX_TIMELINE_SEC) {
    issues.push(issue(field, "out_of_range", `${field} exceeds the allowed maximum.`));
    return null;
  }
  return value;
}

function validatePolicy(value: unknown, issues: AttachmentValidationIssue[]): WritableSongVisualPolicy | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    issues.push(issue("policy", "invalid_type", "policy must be a string."));
    return undefined;
  }
  if (value === "defaultOnly") {
    issues.push(issue("policy", "read_only_policy", "defaultOnly is read-only and cannot be stored."));
    return undefined;
  }
  if (!(WRITABLE_SONG_VISUAL_POLICIES as readonly string[]).includes(value)) {
    issues.push(issue("policy", "invalid_enum", `policy must be one of: ${WRITABLE_SONG_VISUAL_POLICIES.join(", ")}.`));
    return undefined;
  }
  return value as WritableSongVisualPolicy;
}

function validateWeight(value: unknown, issues: AttachmentValidationIssue[]): number | undefined {
  if (value === undefined) return undefined;
  if (!finiteNumber(value)) {
    issues.push(issue("weight", "invalid_number", "weight must be a finite number."));
    return undefined;
  }
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > MAX_ATTACHMENT_WEIGHT) {
    issues.push(issue("weight", "out_of_range", `weight must be between 1 and ${MAX_ATTACHMENT_WEIGHT}.`));
    return undefined;
  }
  return rounded;
}

function validateOrder(value: unknown, issues: AttachmentValidationIssue[]): number | undefined {
  if (value === undefined) return undefined;
  if (!finiteNumber(value)) {
    issues.push(issue("order", "invalid_number", "order must be a finite number."));
    return undefined;
  }
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > MAX_ATTACHMENT_ORDER) {
    issues.push(issue("order", "out_of_range", `order must be between 0 and ${MAX_ATTACHMENT_ORDER}.`));
    return undefined;
  }
  return rounded;
}

function validateLabel(value: unknown, issues: AttachmentValidationIssue[]): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    issues.push(issue("label", "invalid_type", "label must be a string or null."));
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_ATTACHMENT_LABEL_LENGTH) {
    issues.push(issue("label", "too_long", `label must be ${MAX_ATTACHMENT_LABEL_LENGTH} characters or fewer.`));
    return undefined;
  }
  return trimmed.length > 0 ? trimmed : null;
}

function validateEnabled(value: unknown, issues: AttachmentValidationIssue[]): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    issues.push(issue("enabled", "invalid_type", "enabled must be a boolean."));
    return undefined;
  }
  return value;
}

function validateTags(value: unknown, issues: AttachmentValidationIssue[]): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) {
    issues.push(issue("tags", "invalid_type", "tags must be an array of strings or null."));
    return undefined;
  }
  if (value.length > MAX_ATTACHMENT_TAGS) {
    issues.push(issue("tags", "too_many", `tags cannot contain more than ${MAX_ATTACHMENT_TAGS} entries.`));
    return undefined;
  }
  const tags: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (typeof entry !== "string") {
      issues.push(issue(`tags[${index}]`, "invalid_type", "each tag must be a string."));
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      issues.push(issue(`tags[${index}]`, "empty_tag", "tags cannot be empty strings."));
      continue;
    }
    if (trimmed.length > MAX_ATTACHMENT_TAG_LENGTH) {
      issues.push(issue(`tags[${index}]`, "too_long", `tags must be ${MAX_ATTACHMENT_TAG_LENGTH} characters or fewer.`));
      continue;
    }
    tags.push(trimmed);
  }
  if (issues.some((item) => item.field.startsWith("tags"))) return undefined;
  return tags.length > 0 ? tags : null;
}

function validatePlayback(value: unknown, issues: AttachmentValidationIssue[]): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!isPlainObject(value)) {
    issues.push(issue("playback", "invalid_type", "playback must be an object or null."));
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};

  if ("loop" in value) {
    if (typeof value.loop !== "boolean") {
      issues.push(issue("playback.loop", "invalid_type", "playback.loop must be a boolean."));
    } else {
      sanitized.loop = value.loop;
    }
  }

  if ("muted" in value) {
    if (typeof value.muted !== "boolean") {
      issues.push(issue("playback.muted", "invalid_type", "playback.muted must be a boolean."));
    } else {
      sanitized.muted = value.muted;
    }
  }

  if ("objectFit" in value) {
    if (typeof value.objectFit !== "string" || !(PLAYBACK_OBJECT_FITS as readonly string[]).includes(value.objectFit)) {
      issues.push(issue("playback.objectFit", "invalid_enum", `playback.objectFit must be one of: ${PLAYBACK_OBJECT_FITS.join(", ")}.`));
    } else {
      sanitized.objectFit = value.objectFit;
    }
  }

  if ("startOffsetMs" in value) {
    const parsed = parseNonNegativeMs(value.startOffsetMs, "playback.startOffsetMs", MAX_START_OFFSET_MS, issues);
    if (parsed != null) sanitized.startOffsetMs = parsed;
  }

  if ("timelineStartSec" in value) {
    const parsed = parseTimelineSec(value.timelineStartSec, "playback.timelineStartSec", issues);
    if (parsed != null) sanitized.timelineStartSec = parsed;
  }

  if ("timelineDurationSec" in value) {
    const parsed = parseTimelineSec(value.timelineDurationSec, "playback.timelineDurationSec", issues);
    if (parsed != null) sanitized.timelineDurationSec = parsed;
  }

  return sanitized;
}

function validateGate(value: unknown, field: string, issues: AttachmentValidationIssue[]): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) {
    issues.push(issue(field, "invalid_type", `${field} must be an object.`));
    return undefined;
  }
  if (typeof value.kind !== "string" || !(ROTATION_GATE_KINDS as readonly string[]).includes(value.kind)) {
    issues.push(issue(`${field}.kind`, "invalid_enum", `rotation.gate.kind must be one of: ${ROTATION_GATE_KINDS.join(", ")}.`));
    return undefined;
  }
  if (value.kind === "flux") {
    if (!finiteNumber(value.threshold) || value.threshold < 0 || value.threshold > 1) {
      issues.push(issue(`${field}.threshold`, "out_of_range", "rotation.gate.threshold must be between 0 and 1."));
      return undefined;
    }
    return { kind: "flux", threshold: value.threshold };
  }
  return { kind: value.kind };
}

function validateRotation(value: unknown, issues: AttachmentValidationIssue[]): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!isPlainObject(value)) {
    issues.push(issue("rotation", "invalid_type", "rotation must be an object or null."));
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};

  if ("mode" in value) {
    if (typeof value.mode !== "string" || !(ROTATION_MODES as readonly string[]).includes(value.mode)) {
      issues.push(issue("rotation.mode", "invalid_enum", `rotation.mode must be one of: ${ROTATION_MODES.join(", ")}.`));
    } else {
      sanitized.mode = value.mode;
    }
  }

  if ("pinPresetId" in value) {
    if (value.pinPresetId === null) {
      sanitized.pinPresetId = null;
    } else if (typeof value.pinPresetId !== "string") {
      issues.push(issue("rotation.pinPresetId", "invalid_type", "rotation.pinPresetId must be a string or null."));
    } else {
      const trimmed = value.pinPresetId.trim();
      if (trimmed.length > MAX_PIN_PRESET_ID_LENGTH) {
        issues.push(issue("rotation.pinPresetId", "too_long", `rotation.pinPresetId must be ${MAX_PIN_PRESET_ID_LENGTH} characters or fewer.`));
      } else if (trimmed.length > 0) {
        sanitized.pinPresetId = trimmed;
      }
    }
  }

  const holdFields = ["minHoldMs", "targetHoldMs", "maxHoldMs"] as const;
  for (const holdField of holdFields) {
    if (!(holdField in value)) continue;
    const parsed = parseNonNegativeMs(value[holdField], `rotation.${holdField}`, MAX_ROTATION_HOLD_MS, issues);
    if (parsed != null) sanitized[holdField] = parsed;
  }

  if (
    typeof sanitized.minHoldMs === "number"
    && typeof sanitized.targetHoldMs === "number"
    && sanitized.minHoldMs > sanitized.targetHoldMs
  ) {
    issues.push(issue(
      "rotation",
      "invalid_hold_window",
      "rotation hold timing must satisfy minHoldMs <= targetHoldMs <= maxHoldMs.",
    ));
  }
  if (
    typeof sanitized.targetHoldMs === "number"
    && typeof sanitized.maxHoldMs === "number"
    && sanitized.targetHoldMs > sanitized.maxHoldMs
  ) {
    issues.push(issue(
      "rotation",
      "invalid_hold_window",
      "rotation hold timing must satisfy minHoldMs <= targetHoldMs <= maxHoldMs.",
    ));
  }
  if (
    typeof sanitized.minHoldMs === "number"
    && typeof sanitized.maxHoldMs === "number"
    && sanitized.minHoldMs > sanitized.maxHoldMs
  ) {
    issues.push(issue(
      "rotation",
      "invalid_hold_window",
      "rotation hold timing must satisfy minHoldMs <= targetHoldMs <= maxHoldMs.",
    ));
  }

  if ("gate" in value) {
    const gate = validateGate(value.gate, "rotation.gate", issues);
    if (gate) sanitized.gate = gate;
  }

  return sanitized;
}

function validateBeatFx(value: unknown, issues: AttachmentValidationIssue[]): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!isPlainObject(value)) {
    issues.push(issue("beatFx", "invalid_type", "beatFx must be an object or null."));
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};

  if ("enabled" in value) {
    if (typeof value.enabled !== "boolean") {
      issues.push(issue("beatFx.enabled", "invalid_type", "beatFx.enabled must be a boolean."));
    } else {
      sanitized.enabled = value.enabled;
    }
  }

  if ("intensity" in value) {
    if (typeof value.intensity !== "string" || !(BEAT_FX_INTENSITIES as readonly string[]).includes(value.intensity)) {
      issues.push(issue("beatFx.intensity", "invalid_enum", `beatFx.intensity must be one of: ${BEAT_FX_INTENSITIES.join(", ")}.`));
    } else {
      sanitized.intensity = value.intensity;
    }
  }

  if ("effects" in value) {
    if (!Array.isArray(value.effects)) {
      issues.push(issue("beatFx.effects", "invalid_type", "beatFx.effects must be an array."));
    } else {
      const effects: string[] = [];
      for (let index = 0; index < value.effects.length; index += 1) {
        const effect = value.effects[index];
        if (typeof effect !== "string" || !(BEAT_FX_EFFECTS as readonly string[]).includes(effect)) {
          issues.push(issue(
            `beatFx.effects[${index}]`,
            "invalid_enum",
            `beatFx.effects must only contain: ${BEAT_FX_EFFECTS.join(", ")}.`,
          ));
          continue;
        }
        if (!effects.includes(effect)) effects.push(effect);
      }
      if (!issues.some((item) => item.field.startsWith("beatFx.effects"))) {
        sanitized.effects = effects;
      }
    }
  }

  return sanitized;
}

export function validateAttachmentBody(
  body: Record<string, unknown>,
  mode: "create" | "patch",
): ValidationResult {
  const issues: AttachmentValidationIssue[] = [];
  const value: ValidatedAttachmentBody = {};

  if (mode === "create" || "mediaAssetId" in body) {
    const mediaAssetId = typeof body.mediaAssetId === "string" ? body.mediaAssetId.trim() : "";
    if (mode === "create" && !mediaAssetId) {
      issues.push(issue("mediaAssetId", "required", "mediaAssetId is required."));
    } else if ("mediaAssetId" in body && !mediaAssetId) {
      issues.push(issue("mediaAssetId", "invalid_value", "mediaAssetId cannot be empty."));
    } else if (mediaAssetId) {
      value.mediaAssetId = mediaAssetId;
    }
  }

  if (mode === "create" || "policy" in body) {
    const policy = validatePolicy(body.policy, issues);
    if (policy) value.policy = policy;
  }

  if (mode === "create" || "weight" in body) {
    const weight = validateWeight(body.weight, issues);
    if (weight != null) value.weight = weight;
    else if (mode === "create") value.weight = 1;
  }

  if (mode === "create" || "order" in body) {
    const order = validateOrder(body.order, issues);
    if (order != null) value.order = order;
    else if (mode === "create") value.order = 0;
  }

  if (mode === "create" || "label" in body) {
    const label = validateLabel(body.label, issues);
    if (label !== undefined) value.label = label;
  }

  if (mode === "create" || "enabled" in body) {
    const enabled = validateEnabled(body.enabled, issues);
    if (enabled !== undefined) value.enabled = enabled;
    else if (mode === "create") value.enabled = true;
  }

  if (mode === "create" || "playback" in body) {
    const playback = validatePlayback(body.playback, issues);
    if (playback !== undefined) value.playback = playback;
  }

  if (mode === "create" || "rotation" in body) {
    const rotation = validateRotation(body.rotation, issues);
    if (rotation !== undefined) value.rotation = rotation;
  }

  if (mode === "create" || "beatFx" in body) {
    const beatFx = validateBeatFx(body.beatFx, issues);
    if (beatFx !== undefined) value.beatFx = beatFx;
  }

  if (mode === "create" || "tags" in body) {
    const tags = validateTags(body.tags, issues);
    if (tags !== undefined) value.tags = tags;
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value };
}

export function formatValidationIssues(issues: AttachmentValidationIssue[]): string {
  return issues.map((item) => `${item.field}: ${item.message}`).join(" ");
}
