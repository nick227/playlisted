import { prisma } from "./prisma.js";
import { slugify } from "../utils/slug.js";

const INBOX_TITLE = "My Uploads";

export async function ensureInboxPlaylist(userId: string) {
  const existing = await prisma.playlist.findFirst({
    where: {
      ownerId: userId,
      type: "RELEASE",
      slug: { startsWith: "my-uploads" },
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const baseSlug = slugify(INBOX_TITLE);
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.playlist.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const created = await prisma.playlist.create({
    data: {
      ownerId: userId,
      title: INBOX_TITLE,
      slug,
      description: "Your uploaded tracks live here until you add them to a collection.",
      type: "RELEASE",
      visibility: "PUBLIC",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  return created.id;
}
