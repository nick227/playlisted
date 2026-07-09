export const ATMOSPHERE_FX_MODES = ["inherit", "off", "subtle", "normal", "strong"] as const;
export type AtmosphereFxMode = (typeof ATMOSPHERE_FX_MODES)[number];

export const MAX_ATMOSPHERE_FX_PRESET_ID_LENGTH = 128;

export type SongAtmosphereFxDto = {
  mode: AtmosphereFxMode;
  presetId: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeAtmosphereFxJson(value: unknown): SongAtmosphereFxDto | null {
  if (!isPlainObject(value)) return null;

  const mode =
    typeof value.mode === "string" && (ATMOSPHERE_FX_MODES as readonly string[]).includes(value.mode)
      ? (value.mode as AtmosphereFxMode)
      : null;
  if (!mode) return null;

  let presetId: string | null = null;
  if (value.presetId === null) {
    presetId = null;
  } else if (typeof value.presetId === "string") {
    const trimmed = value.presetId.trim().slice(0, MAX_ATMOSPHERE_FX_PRESET_ID_LENGTH);
    presetId = trimmed.length > 0 ? trimmed : null;
  }

  return { mode, presetId };
}

export function validateAtmosphereFxBody(
  value: unknown,
): { ok: true; value: SongAtmosphereFxDto | null } | { ok: false; message: string } {
  if (value === null) return { ok: true, value: null };
  if (!isPlainObject(value)) {
    return { ok: false, message: "atmosphereFx must be an object or null." };
  }
  if (typeof value.mode !== "string" || !(ATMOSPHERE_FX_MODES as readonly string[]).includes(value.mode)) {
    return {
      ok: false,
      message: `atmosphereFx.mode must be one of: ${ATMOSPHERE_FX_MODES.join(", ")}.`,
    };
  }
  if (value.presetId !== undefined && value.presetId !== null && typeof value.presetId !== "string") {
    return { ok: false, message: "atmosphereFx.presetId must be a string or null." };
  }
  return { ok: true, value: sanitizeAtmosphereFxJson(value) };
}
