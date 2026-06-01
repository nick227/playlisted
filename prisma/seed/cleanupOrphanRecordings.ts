import { PrismaClient } from "@prisma/client";

import { deleteRecordingMedia } from "../../src/lib/deleteMediaFile.js";
import { syncPlaylistStats } from "../../src/lib/playlistStats.js";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

/**
 * Recordings removed from a collection before delete-on-remove shipped only lost
 * their PlaylistItem row. They remain PUBLIC/PUBLISHED and still surface on charts.
 */
async function findOrphanRecordings() {
  return prisma.recording.findMany({
    where: { playlistItems: { none: {} } },
    select: {
      id: true,
      title: true,
      status: true,
      visibility: true,
      publishedPlaylistId: true,
      audioUrl: true,
      artworkUrl: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function main() {
  const orphans = await findOrphanRecordings();

  if (orphans.length === 0) {
    console.log("No orphan recordings found.");
    return;
  }

  console.log(`Found ${orphans.length} orphan recording(s) (not in any playlist):`);
  for (const recording of orphans) {
    console.log(
      `  - ${recording.id} "${recording.title}" [${recording.status}/${recording.visibility}] playlist=${recording.publishedPlaylistId}`,
    );
  }

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to delete these recordings and local media files.");
    return;
  }

  for (const recording of orphans) {
    await prisma.recording.delete({ where: { id: recording.id } });
    await deleteRecordingMedia(recording);
  }

  const playlistIds = [...new Set(orphans.map((r) => r.publishedPlaylistId))];
  for (const playlistId of playlistIds) {
    await syncPlaylistStats(playlistId);
  }

  console.log(`Deleted ${orphans.length} orphan recording(s) and refreshed ${playlistIds.length} playlist stat(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
