import { normalizeUploadUrl } from "../mediaUrls.js";
import { prisma } from "../prisma.js";

export type UserLibraryImageSource = "avatar" | "hero" | "playlist" | "recording";

export type UserLibraryImageDto = {
  url: string;
  label: string;
  source: UserLibraryImageSource;
  updatedAt: string;
};

export async function listUserLibraryImages(userId: string): Promise<UserLibraryImageDto[]> {
  const [user, playlists, recordings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true, heroImageUrl: true, updatedAt: true },
    }),
    prisma.playlist.findMany({
      where: { ownerId: userId, coverArtUrl: { not: null } },
      select: { title: true, coverArtUrl: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.recording.findMany({
      where: { uploaderId: userId, artworkUrl: { not: null } },
      select: { title: true, artworkUrl: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const items: UserLibraryImageDto[] = [];
  const seen = new Set<string>();

  function push(
    url: string | null | undefined,
    label: string,
    source: UserLibraryImageSource,
    updatedAt: Date,
  ) {
    const normalized = normalizeUploadUrl(url ?? null);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    items.push({
      url: normalized,
      label,
      source,
      updatedAt: updatedAt.toISOString(),
    });
  }

  if (user) {
    push(user.avatarUrl, "Avatar", "avatar", user.updatedAt);
    push(user.heroImageUrl, "Profile hero", "hero", user.updatedAt);
  }

  for (const playlist of playlists) {
    push(playlist.coverArtUrl, `${playlist.title} cover`, "playlist", playlist.updatedAt);
  }

  for (const recording of recordings) {
    push(recording.artworkUrl, `${recording.title} artwork`, "recording", recording.updatedAt);
  }

  return items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
