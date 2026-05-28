import { prisma } from "./prisma.js";

export async function syncPlaylistStats(playlistId: string) {
  const items = await prisma.playlistItem.findMany({
    where: { playlistId },
    include: { recording: { select: { durationSeconds: true } } },
  });

  const itemCount = items.length;
  const totalDurationSeconds = items.reduce(
    (sum, item) => sum + (item.recording.durationSeconds ?? 0),
    0,
  );

  await prisma.playlist.update({
    where: { id: playlistId },
    data: { itemCount, totalDurationSeconds },
  });
}
