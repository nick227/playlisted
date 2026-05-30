import {
  ExternalLink,
  Headphones,
  Instagram,
  Music,
  Music2,
  Radio,
  Youtube,
  type LucideIcon,
} from "lucide-react";

import type { ProfileLink } from "@playlisted/client-sdk";

export type ProfileLinkPlatform = ProfileLink["platform"];

export const PROFILE_LINK_PLATFORMS: Array<{ value: ProfileLinkPlatform; label: string; icon: LucideIcon }> = [
  { value: "soundcloud", label: "SoundCloud", icon: Radio },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "distrokid", label: "DistroKid", icon: Music2 },
  { value: "spotify", label: "Spotify", icon: Headphones },
  { value: "apple_music", label: "Apple Music", icon: Music },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "patreon", label: "Patreon", icon: ExternalLink },
  { value: "custom", label: "Custom", icon: ExternalLink },
];

const platformMap = new Map(PROFILE_LINK_PLATFORMS.map((platform) => [platform.value, platform]));

export function getProfileLinkPlatform(platform: ProfileLinkPlatform) {
  return platformMap.get(platform) ?? platformMap.get("custom")!;
}

export function createProfileLink(): ProfileLink {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `link-${Date.now()}`;

  return {
    id,
    platform: "custom",
    label: "Custom",
    url: "",
  };
}

export function prepareProfileLinks(links: ProfileLink[]): ProfileLink[] {
  return links
    .map((link) => {
      const platform = getProfileLinkPlatform(link.platform);
      return {
        id: link.id,
        platform: link.platform,
        label: link.label.trim() || platform.label,
        url: link.url.trim(),
      };
    })
    .filter((link) => link.url);
}
