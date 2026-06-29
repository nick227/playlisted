import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs() {
  const args = {
    limit: 50,
    dryRun: false,
    maxDuration: 900,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg.startsWith("--limit=")) {
      args.limit = parseInt(arg.split("=")[1], 10) || 50;
    } else if (arg.startsWith("--max-duration=")) {
      args.maxDuration = parseInt(arg.split("=")[1], 10) || 900;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return args;
}

async function main() {
  const { limit, dryRun, maxDuration } = parseArgs();

  console.log(`Starting backfill with limit=${limit}, maxDuration=${maxDuration}s, dryRun=${dryRun}`);

  // Fetch legacy recordings where no RecordingSubtitle row exists
  const legacyTracks = await prisma.recording.findMany({
    where: {
      subtitle: null,
      OR: [
        { durationSeconds: null },
        { durationSeconds: { lte: maxDuration } }
      ]
    },
    orderBy: { playCount: "desc" },
    take: limit,
  });

  if (legacyTracks.length === 0) {
    console.log("No legacy tracks found to backfill. You're all caught up!");
    return;
  }

  console.log(`Found ${legacyTracks.length} tracks to queue for subtitles:`);
  
  let totalDuration = 0;
  for (const track of legacyTracks) {
    console.log(` - [${track.id}] "${track.title}" (Duration: ${track.durationSeconds ?? "?"}s, Plays: ${track.playCount})`);
    if (track.durationSeconds) {
      totalDuration += track.durationSeconds;
    }
  }

  console.log(`\nEstimated total known duration: ${Math.round(totalDuration / 60)} minutes.`);

  if (dryRun) {
    console.log("\n[DRY RUN] No records were created. Run without --dry-run to insert them into the queue.");
    return;
  }

  console.log("\nInserting into queue...");
  
  const created = await prisma.$transaction(
    legacyTracks.map(track => 
      prisma.recordingSubtitle.create({
        data: {
          recordingId: track.id,
          status: "QUEUED"
        }
      })
    )
  );

  console.log(`Successfully queued ${created.length} tracks for subtitle generation!`);
  console.log("The subtitle worker will automatically pick these up in the background.");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
