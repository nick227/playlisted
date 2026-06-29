import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const includeFailed = process.argv.includes("--failed");
const requiredConfirmation = "QUEUE_SUBTITLES";
const publicUploadBaseUrl = (process.env.UPLOADS_PUBLIC_BASE_URL ?? process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

function assertManualConfirmation() {
  if (!apply) return;

  if (process.env.SUBTITLES_BACKFILL_CONFIRM !== requiredConfirmation) {
    console.error(
      [
        "Refusing to enqueue subtitle backfill rows.",
        `Set SUBTITLES_BACKFILL_CONFIRM=${requiredConfirmation} and pass --apply to confirm this manual operation.`,
        "Worker startup never runs this backfill; upload/create paths are responsible for new QUEUED rows.",
      ].join("\n"),
    );
    process.exit(1);
  }
}

async function main() {
  assertManualConfirmation();

  const supportedAudioUrls = [
    { audioUrl: { startsWith: "/uploads/" } },
    ...(publicUploadBaseUrl ? [{ audioUrl: { startsWith: `${publicUploadBaseUrl}/` } }] : []),
  ];

  const missing = await prisma.recording.findMany({
    where: {
      recordingType: "SONG",
      subtitle: null,
      OR: supportedAudioUrls,
    },
    select: {
      id: true,
      title: true,
      audioUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const failed = includeFailed
    ? await prisma.recordingSubtitle.findMany({
        where: {
          status: "FAILED",
          recording: { recordingType: "SONG" },
        },
        select: {
          id: true,
          recordingId: true,
          errorMessage: true,
          recording: { select: { title: true } },
        },
        orderBy: { updatedAt: "asc" },
      })
    : [];

  if (missing.length === 0 && failed.length === 0) {
    console.log("No subtitle backfill work found.");
    return;
  }

  if (missing.length > 0) {
    console.log(`Found ${missing.length} song recording(s) missing subtitle rows:`);
    for (const recording of missing) {
      console.log(`  - ${recording.id} "${recording.title}"`);
    }
  }

  if (failed.length > 0) {
    console.log(`Found ${failed.length} failed subtitle row(s) to requeue:`);
    for (const subtitle of failed) {
      console.log(`  - ${subtitle.recordingId} "${subtitle.recording.title}" (${subtitle.errorMessage ?? "no error"})`);
    }
  }

  if (!apply) {
    const failedHint = includeFailed ? "" : " Add --failed to include failed subtitle rows for retry.";
    console.log(
      `\nDry run only. Re-run manually with SUBTITLES_BACKFILL_CONFIRM=${requiredConfirmation} and --apply to enqueue missing subtitles.${failedHint}`,
    );
    return;
  }

  if (missing.length > 0) {
    await prisma.recordingSubtitle.createMany({
      data: missing.map((recording) => ({
        recordingId: recording.id,
        status: "QUEUED" as const,
      })),
      skipDuplicates: true,
    });
  }

  for (const subtitle of failed) {
    await prisma.recordingSubtitle.update({
      where: { id: subtitle.id },
      data: {
        status: "QUEUED",
        language: null,
        segments: Prisma.JsonNull,
        vttText: null,
        errorMessage: null,
        generatedAt: null,
      },
    });
  }

  console.log(
    `Queued ${missing.length} missing subtitle row(s)` +
      (failed.length > 0 ? ` and requeued ${failed.length} failed subtitle row(s).` : "."),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
