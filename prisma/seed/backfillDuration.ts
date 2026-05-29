import { PrismaClient } from "@prisma/client";

import { backfillRecordingDurations } from "./audioDuration.js";

const prisma = new PrismaClient();

async function main() {
  const missing = await prisma.recording.findMany({
    where: { durationSeconds: null },
    select: { id: true, audioUrl: true },
  });

  if (missing.length === 0) {
    console.log("All recordings already have duration.");
    return;
  }

  const updated = await backfillRecordingDurations(missing, async (id, durationSeconds) => {
    await prisma.recording.update({ where: { id }, data: { durationSeconds } });
  });

  console.log(`Updated duration for ${updated} of ${missing.length} recording(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
