import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const [recordings, subtitles, byStatus, attempts, recentSubtitles, recentAttempts] = await Promise.all([
    prisma.recording.count({ where: { recordingType: "SONG" } }),
    prisma.recordingSubtitle.count(),
    prisma.recordingSubtitle.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.recordingSubtitleAttempt.count(),
    prisma.recordingSubtitle.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        recordingId: true,
        status: true,
        language: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        generatedAt: true,
        recording: { select: { title: true, audioUrl: true, durationSeconds: true } },
      },
    }),
    prisma.recordingSubtitleAttempt.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true,
        subtitleId: true,
        provider: true,
        status: true,
        modelName: true,
        language: true,
        segmentCount: true,
        inputBytes: true,
        inputDurationSeconds: true,
        durationMs: true,
        costCents: true,
        providerJobId: true,
        error: true,
        startedAt: true,
        endedAt: true,
      },
    }),
  ]);

  console.log(`Songs: ${recordings}`);
  console.log(`Subtitle rows: ${subtitles}`);
  console.log(`Attempts: ${attempts}`);
  console.log("Statuses:");
  for (const row of byStatus) {
    console.log(`  ${row.status}: ${row._count.status}`);
  }

  console.log("\nRecent subtitles:");
  for (const subtitle of recentSubtitles) {
    const error = subtitle.errorMessage ? ` error="${subtitle.errorMessage}"` : "";
    console.log(
      `  ${subtitle.status.padEnd(10)} ${subtitle.recordingId} "${subtitle.recording.title}" duration=${subtitle.recording.durationSeconds ?? "?"}${error}`,
    );
  }

  console.log("\nRecent attempts:");
  if (recentAttempts.length === 0) {
    console.log("  none");
  }
  for (const attempt of recentAttempts) {
    const error = attempt.error ? ` error="${attempt.error}"` : "";
    const cost = attempt.costCents == null ? "" : ` cost=${attempt.costCents}c`;
    const model = attempt.modelName ? ` model=${attempt.modelName}` : "";
    const language = attempt.language ? ` language=${attempt.language}` : "";
    const segmentCount = attempt.segmentCount == null ? "" : ` segments=${attempt.segmentCount}`;
    const inputBytes = attempt.inputBytes == null ? "" : ` inputBytes=${attempt.inputBytes.toString()}`;
    const inputDuration = attempt.inputDurationSeconds == null ? "" : ` inputDuration=${attempt.inputDurationSeconds}s`;
    console.log(
      `  ${attempt.status.padEnd(10)} provider=${attempt.provider}${model}${language}${segmentCount}${inputDuration}${inputBytes} durationMs=${attempt.durationMs ?? "?"}${cost}${error}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
