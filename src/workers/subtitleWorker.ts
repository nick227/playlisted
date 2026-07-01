import "dotenv/config";

import type { Prisma } from "@prisma/client";
import fs from "node:fs/promises";

import { prisma } from "../lib/prisma.js";
import { prepareSubtitleAudioFile } from "../lib/subtitles/audioFile.js";
import { getSubtitleProvider, runSubtitleProvider } from "../lib/subtitles/providers/index.js";
import { checkLocalPythonProvider } from "../lib/subtitles/providers/localPythonProvider.js";
import { segmentsToVtt } from "../lib/subtitles/vtt.js";

const sleepMs = Number(process.env.SUBTITLES_WORKER_SLEEP_MS ?? 10_000);
const maxAudioSeconds = Number(process.env.SUBTITLES_MAX_AUDIO_SECONDS ?? 900);
const maxRuntimeSeconds = Number(process.env.SUBTITLES_MAX_RUNTIME_SECONDS ?? 1_200);
const staleProcessingMinutes = Number(process.env.SUBTITLES_STALE_PROCESSING_MINUTES ?? 30);
const whisperModel = process.env.SUBTITLES_WHISPER_MODEL ?? "tiny";
const whisperDevice = process.env.SUBTITLES_DEVICE ?? "cpu";
const whisperComputeType = process.env.SUBTITLES_COMPUTE_TYPE ?? "int8";
const vadFilter = process.env.SUBTITLES_VAD_FILTER ?? "true";
const requireModalProvider =
  process.env.SUBTITLES_WORKER_REQUIRE_MODAL === "true" ||
  (process.env.NODE_ENV === "production" && process.env.SUBTITLES_WORKER_ALLOW_NON_MODAL !== "true");

let shuttingDown = false;

function parseProcessLimit() {
  if (process.argv.includes("--once")) return 1;
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  if (!limitArg) return null;
  const limit = Number(limitArg.slice("--limit=".length));
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("--limit must be a positive integer.");
  }
  return limit;
}

function log(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...details, ts: new Date().toISOString() }));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function jsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function assertProductionProvider(provider: string) {
  if (provider === "whisper") return; // Allow whisper anywhere
  if (requireModalProvider && provider !== "modal") {
    throw new Error(
      "Production subtitle worker requires SUBTITLES_PROVIDER=modal. Set SUBTITLES_WORKER_ALLOW_NON_MODAL=true only for an intentional non-production override.",
    );
  }
}

async function getAudioDurationSeconds(filePath: string) {
  const { parseFile } = await import("music-metadata");
  const metadata = await parseFile(filePath);
  return metadata.format.duration ?? null;
}

async function resetStaleProcessingRows() {
  const cutoff = new Date(Date.now() - staleProcessingMinutes * 60 * 1000);
  const result = await prisma.recordingSubtitle.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: cutoff },
    },
    data: {
      status: "QUEUED",
      errorMessage: "Reset after stale processing timeout.",
    },
  });

  if (result.count > 0) {
    log("subtitle.worker.reset_stale", { count: result.count });
  }
}

async function processNextSubtitle() {
  const next = await prisma.recordingSubtitle.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    include: {
      recording: {
        select: {
          id: true,
          title: true,
          audioUrl: true,
          durationSeconds: true,
        },
      },
    },
  });

  if (!next) return false;

  const claimed = await prisma.recordingSubtitle.updateMany({
    where: { id: next.id, status: "QUEUED" },
    data: {
      status: "PROCESSING",
      errorMessage: null,
    },
  });

  if (claimed.count !== 1) return true;

  log("subtitle.job.claimed", { recordingId: next.recordingId, subtitleId: next.id });
  const provider = next.source === "WHISPER" ? "whisper" : getSubtitleProvider();
  const attempt = await prisma.recordingSubtitleAttempt.create({
    data: {
      subtitleId: next.id,
      provider,
      status: "PROCESSING",
    },
  });
  const attemptStartedAt = Date.now();
  let inputBytes: bigint | null = null;
  let inputDurationSeconds: number | null = null;
  let cleanupAudioFile: (() => Promise<void>) | null = null;
  let attemptMetadata: Record<string, unknown> = {
    worker: {
      maxAudioSeconds,
      maxRuntimeSeconds,
      whisperModel,
      whisperDevice,
      whisperComputeType,
      vadFilter,
    },
  };

  try {
    const preparedAudio = await prepareSubtitleAudioFile(next.recording.audioUrl);
    const audioPath = preparedAudio.audioPath;
    cleanupAudioFile = preparedAudio.cleanup;
    await fs.access(audioPath);
    const fileStat = await fs.stat(audioPath);
    if (fileStat.size <= 0) {
      throw new Error("Resolved audio file is empty.");
    }

    log("subtitle.audio.resolved", {
      recordingId: next.recordingId,
      audioUrl: next.recording.audioUrl,
      resolvedPath: audioPath,
      source: preparedAudio.source,
      exists: true,
      bytes: fileStat.size,
      downloadedBytes: preparedAudio.downloadedBytes,
    });

    const measuredDuration = next.recording.durationSeconds == null
      ? await getAudioDurationSeconds(audioPath)
      : null;
    const rawDurationSeconds = next.recording.durationSeconds ?? measuredDuration;
    if (rawDurationSeconds == null || !Number.isFinite(rawDurationSeconds) || rawDurationSeconds <= 0) {
      throw new Error("Audio duration is unavailable; refusing transcription to avoid unbounded provider usage.");
    }
    const durationSeconds = Math.ceil(rawDurationSeconds);
    inputBytes = BigInt(fileStat.size);
    inputDurationSeconds = durationSeconds;
    attemptMetadata = {
      ...attemptMetadata,
      input: {
        recordingId: next.recordingId,
        title: next.recording.title,
        audioUrl: next.recording.audioUrl,
        resolvedAudioPath: audioPath,
        source: preparedAudio.source,
        downloadedBytes: preparedAudio.downloadedBytes,
        fileBytes: fileStat.size,
        durationSeconds,
        measuredDurationSeconds: measuredDuration,
      },
    };

    log("subtitle.job.input", {
      recordingId: next.recordingId,
      title: next.recording.title,
      audioUrl: next.recording.audioUrl,
      resolvedAudioPath: audioPath,
      source: preparedAudio.source,
      downloadedBytes: preparedAudio.downloadedBytes,
      exists: true,
      fileBytes: fileStat.size,
      durationSeconds,
      measuredDurationSeconds: measuredDuration,
    });

    await prisma.recordingSubtitleAttempt.update({
      where: { id: attempt.id },
      data: {
        modelName: whisperModel,
        inputBytes,
        inputDurationSeconds,
        metadata: jsonObject(attemptMetadata),
      },
    });

    if (durationSeconds > maxAudioSeconds) {
      throw new Error(`Audio duration ${durationSeconds}s exceeds subtitle limit ${maxAudioSeconds}s.`);
    }

    const result = await runSubtitleProvider({
      subtitleId: next.id,
      recordingId: next.recordingId,
      audioPath,
      durationSeconds,
    });
    if (result.segments.length === 0) {
      throw new Error("Transcription completed but produced no subtitle segments.");
    }
    const vttText = segmentsToVtt(result.segments);
    const durationMs = Date.now() - attemptStartedAt;

    await prisma.$transaction([
      prisma.recordingSubtitle.update({
        where: { id: next.id },
        data: {
          status: "READY",
          language: result.language ?? null,
          segments: result.segments,
          vttText,
          errorMessage: null,
          generatedAt: new Date(),
        },
      }),
      prisma.recordingSubtitleAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "READY",
          modelName: result.modelName ?? whisperModel,
          language: result.language ?? null,
          segmentCount: result.segments.length,
          inputBytes,
          inputDurationSeconds,
          durationMs,
          costCents: result.estimatedCostCents ?? null,
          providerJobId: result.providerJobId ?? null,
          metadata: jsonObject({
            ...attemptMetadata,
            output: {
              language: result.language ?? null,
              segmentCount: result.segments.length,
            },
          }),
          endedAt: new Date(),
        },
      }),
    ]);

    log("subtitle.job.completed", {
      recordingId: next.recordingId,
      subtitleId: next.id,
      provider: result.provider,
      durationMs,
      costCents: result.estimatedCostCents ?? null,
      segmentCount: result.segments.length,
      language: result.language ?? null,
    });
  } catch (error) {
    const message = cleanError(error);
    const durationMs = Date.now() - attemptStartedAt;
    await prisma.$transaction([
      prisma.recordingSubtitle.update({
        where: { id: next.id },
        data: {
          status: "FAILED",
          errorMessage: message,
        },
      }),
      prisma.recordingSubtitleAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          modelName: whisperModel,
          inputBytes,
          inputDurationSeconds,
          durationMs,
          error: message,
          metadata: jsonObject(attemptMetadata),
          endedAt: new Date(),
        },
      }),
    ]);
    log("subtitle.job.failed", { recordingId: next.recordingId, subtitleId: next.id, provider, durationMs, error: message });
  } finally {
    if (cleanupAudioFile) {
      await cleanupAudioFile();
    }
  }

  return true;
}

process.once("SIGTERM", () => {
  shuttingDown = true;
  log("subtitle.worker.shutdown", { signal: "SIGTERM" });
});

process.once("SIGINT", () => {
  shuttingDown = true;
  log("subtitle.worker.shutdown", { signal: "SIGINT" });
});

async function main() {
  const provider = getSubtitleProvider();
  assertProductionProvider(provider);

  if (process.env.SUBTITLES_ENABLED === "false") {
    log("subtitle.worker.disabled");
    return;
  }
  if (provider === "disabled") {
    log("subtitle.worker.provider_disabled");
    return;
  }
  if (provider === "local-python") {
    checkLocalPythonProvider();
  }

  log("subtitle.worker.start", {
    provider,
    sleepMs,
    maxAudioSeconds,
    maxRuntimeSeconds,
    staleProcessingMinutes,
    whisperModel,
    backfill: "manual_only",
    requireModalProvider,
  });

  await resetStaleProcessingRows();

  const processLimit = parseProcessLimit();
  if (processLimit != null) {
    let processedCount = 0;
    for (let i = 0; i < processLimit && !shuttingDown; i++) {
      const processed = await processNextSubtitle();
      if (!processed) break;
      processedCount += 1;
    }
    await prisma.$disconnect();
    log("subtitle.worker.exit", { mode: processLimit === 1 ? "once" : "limit", limit: processLimit, processedCount });
    return;
  }

  while (!shuttingDown) {
    const processed = await processNextSubtitle();
    await sleep(processed ? Math.min(sleepMs, 1_000) : sleepMs);
  }

  await prisma.$disconnect();
  log("subtitle.worker.exit");
}

main().catch(async (error) => {
  log("subtitle.worker.crashed", { error: cleanError(error) });
  await prisma.$disconnect();
  process.exit(1);
});
