export const PROFILE_LINK_PLATFORMS = [
  "soundcloud",
  "instagram",
  "distrokid",
  "spotify",
  "apple_music",
  "youtube",
  "patreon",
  "custom",
] as const;

export type ProfileLinkPlatform = (typeof PROFILE_LINK_PLATFORMS)[number];

export type ProfileLink = {
  id: string;
  platform: ProfileLinkPlatform;
  label: string;
  url: string;
};

const platformLabels: Record<ProfileLinkPlatform, string> = {
  soundcloud: "SoundCloud",
  instagram: "Instagram",
  distrokid: "DistroKid",
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube: "YouTube",
  patreon: "Patreon",
  custom: "Custom",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeProfileLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 12).flatMap((item, index) => {
    if (!isObject(item)) return [];

    const rawPlatform = typeof item.platform === "string" ? item.platform : "custom";
    const platform = PROFILE_LINK_PLATFORMS.includes(rawPlatform as ProfileLinkPlatform)
      ? (rawPlatform as ProfileLinkPlatform)
      : "custom";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!url || !validHttpUrl(url)) return [];

    const fallbackLabel = platformLabels[platform];
    const label = (typeof item.label === "string" ? item.label.trim() : fallbackLabel).slice(0, 80);
    const id = (typeof item.id === "string" ? item.id.trim() : "").slice(0, 80) || `${platform}-${index}`;

    return [{ id, platform, label: label || fallbackLabel, url: url.slice(0, 2048) }];
  });
}

export function assertProfileLinks(value: unknown): ProfileLink[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error("profileLinks must be an array.");
  }

  const normalized = normalizeProfileLinks(value);
  const submittedLinks = value.filter((item) => isObject(item) && typeof item.url === "string" && item.url.trim());
  if (normalized.length !== submittedLinks.length) {
    throw new Error("Profile links must use valid http or https URLs.");
  }

  return normalized;
}
