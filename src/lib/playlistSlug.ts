import { prisma } from "./prisma.js";
import { slugify } from "../utils/slug.js";

export async function resolveUniquePlaylistSlug(
  ownerId: string,
  title: string,
  excludePlaylistId?: string,
): Promise<string> {
  const baseSlug = slugify(title) || "playlist";
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await prisma.playlist.findFirst({
      where: {
        ownerId,
        slug,
        ...(excludePlaylistId ? { id: { not: excludePlaylistId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return slug;

    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}
