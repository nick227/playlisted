import {
  MAX_MEDIA_DIMENSION_PX,
  MAX_MEDIA_DURATION_MS,
} from "./constants.js";

export type UploadMetadataInput = {
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
};

function parseOptionalPositiveInt(
  value: unknown,
  max: number,
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const rounded = Math.round(parsed);
  if (rounded > max) return null;
  return rounded;
}

export function parseVisualUploadMetadata(
  body: Record<string, unknown>,
  kind: "video" | "image",
): UploadMetadataInput {
  const width = parseOptionalPositiveInt(body.width, MAX_MEDIA_DIMENSION_PX);
  const height = parseOptionalPositiveInt(body.height, MAX_MEDIA_DIMENSION_PX);
  const durationMs = kind === "image"
    ? null
    : parseOptionalPositiveInt(body.durationMs, MAX_MEDIA_DURATION_MS);

  return {
    durationMs,
    width,
    height,
  };
}
