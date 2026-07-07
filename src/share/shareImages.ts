import { OG_IMAGE_PATHS, PUBLIC_ORIGIN } from "./constants.js";

export function toAbsoluteUrl(
  value: string | null | undefined,
  origin = PUBLIC_ORIGIN,
): string | null {
  if (!value) return null;

  if (value.startsWith("https://") || value.startsWith("http://")) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("/")) {
    return `${origin}${value}`;
  }

  return `${origin}/${value}`;
}

export function pickShareImage(
  origin: string,
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const absolute = toAbsoluteUrl(candidate, origin);
    if (absolute) return absolute;
  }

  return `${origin}${OG_IMAGE_PATHS.default}`;
}

export function defaultShareImage(origin: string, kind: keyof typeof OG_IMAGE_PATHS = "default"): string {
  return `${origin}${OG_IMAGE_PATHS[kind]}`;
}
