import "dotenv/config";

import type { Prisma } from "@prisma/client";
import fs from "node:fs/promises";

import { prisma } from "../lib/prisma.js";
import { prepareSubtitleAudioFile } from "../lib/subtitles/audioFile.js";
import { getSubtitleProvider, runSubtitleProvider } from "../lib/subtitles/providers/index.js";
import { ModalProviderCallError } from "../lib/subtitles/providers/modalProvider.js";
import {
  checkLocalPythonProvider,
  getProjectRoot,
} from "../lib/subtitles/providers/localPythonProvider.js";
import type { SubtitleProviderResult } from "../lib/subtitles/providers/types.js";
import { checkDurationBudget, clearPause, getActivePause, pauseProvider } from "../lib/subtitles/providerGate.js";
import { SUBTITLES_PROCESSING_STALE_MS } from "../lib/subtitles/staleness.js";
import { segmentsToVtt } from "../lib/subtitles/vtt.js";

const sleepMs = Number(process.env.SUBTITLES_WORKER_SLEEP_MS ?? 10_000);
const maxAudioSeconds = Number(process.env.SUBTITLES_MAX_AUDIO_SECONDS ?? 900);
const whisperModel = process.env.SUBTITLES_WHISPER_MODEL ?? "tiny";
const whisperDevice = process.env.SUBTITLES_DEVICE ?? "cpu";
const whisperComputeType = process.env.SUBTITLES_COMPUTE_TYPE ?? "int8";
const vadFilter = process.env.SUBTITLES_VAD_FILTER ?? "true";
const requireModalProvider =
  process.env.SUBTITLES_WORKER_REQUIRE_MODAL === "true" ||
  (process.env.NODE_ENV === "production" && process.env.SUBTITLES_WORKER_ALLOW_NON_MODAL !== "true");

// Cost-containment ceilings for the Modal provider. These are an internal
// backstop, not the primary safety net — Modal's own workspace/environment
// spend budget is the ultimate hard-dollar limit. Set these well below
// whatever Modal's free-credit allowance actually is; that gap is the buffer
// against inaccuracy in this accounting, not the whole plan.
const maxAudioSecondsPerDay = Number(process.env.SUBTITLES_MAX_AUDIO_SECONDS_PER_DAY ?? 3_600);
const maxAudioSecondsPerMonth = Number(process.env.SUBTITLES_MAX_AUDIO_SECONDS_PER_MONTH ?? 18_000);
const providerFailureCooldownMs = Number(process.env.SUBTITLES_PROVIDER_FAILURE_COOLDOWN_MS ?? 21_600_000);

/**
 * Optional backlog cutoff. When set, the worker only ever claims rows whose
 * Recording.createdAt >= this timestamp. This is a deliberate "no backlog
 * recovery" switch, not a staleness heuristic: it exists so a redeploy (or a
 * re-queue via an audio change on an old recording) can never silently wake
 * pre-cutover work. Pair with the one-time `exclude-backlog` maintenance
 * command, which actively fails existing QUEUED/PROCESSING rows — this env
 * var is the ongoing guard in case anything old ends up QUEUED again after.
 */
function parseProcessAfter(): Date | null {
  const raw = process.env.SUBTITLES_PROCESS_AFTER;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`SUBTITLES_PROCESS_AFTER is not a valid date/timestamp: ${raw}`);
  }
  return parsed;
}
const processAfter = parseProcessAfter();

let shuttingDown = false;

type ProcessOutcome = "processed" | "empty" | "blocked";

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

/**
 * One-shot pipeline for content outcomes: a PROCESSING row past the
 * staleness window means a worker died mid-job. Fail it — never requeue.
 * (A row can still return to QUEUED deliberately — see the Modal
 * pause/budget handling below — that's not staleness, it's a live decision.)
 */
async function failStaleProcessingRows() {
  const cutoff = new Date(Date.now() - SUBTITLES_PROCESSING_STALE_MS);
  const result = await prisma.recordingSubtitle.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: cutoff } },
    data: {
      status: "FAILED",
      errorMessage: "Subtitle generation did not finish. Add subtitles manually or regenerate.",
    },
  });
  if (result.count > 0) {
    log("subtitle.worker.failed_stale_processing", { count: result.count });
  }
}

async function requeue(subtitleId: string) {
  await prisma.recordingSubtitle.updateMany({
    where: { id: subtitleId, status: "PROCESSING" },
    data: { status: "QUEUED" },
  });
}

async function processNextSubtitle(): Promise<ProcessOutcome> {
  const next = await prisma.recordingSubtitle.findFirst({
    where: {
      status: "QUEUED",
      ...(processAfter ? { recording: { createdAt: { gte: processAfter } } } : {}),
    },
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

  if (!next) return "empty";

  // One shot: claim QUEUED → PROCESSING. The row only returns to QUEUED via
  // an explicit requeue() call below (provider pause / budget cap) — it
  // never silently reverts on its own.
  const claimed = await prisma.recordingSubtitle.updateMany({
    where: { id: next.id, status: "QUEUED" },
    data: { status: "PROCESSING", errorMessage: null },
  });

  if (claimed.count !== 1) return "processed";

  log("subtitle.job.claimed", { recordingId: next.recordingId, subtitleId: next.id });
  const provider = next.source === "WHISPER" ? "whisper" : getSubtitleProvider();
  const startedAt = new Date();
  let inputBytes: bigint | null = null;
  let inputDurationSeconds: number | null = null;
  let cleanupAudioFile: (() => Promise<void>) | null = null;
  let attemptId: string | null = null;
  let attemptMetadata: Record<string, unknown> = {
    worker: {
      maxAudioSeconds,
      whisperModel,
      whisperDevice,
      whisperComputeType,
      vadFilter,
    },
  };

  try {
    if (provider === "modal") {
      const pause = await getActivePause();
      if (pause) {
        await requeue(next.id);
        log("subtitle.job.blocked", {
          recordingId: next.recordingId,
          subtitleId: next.id,
          reason: "provider_paused",
          pausedUntil: pause.pausedUntil.toISOString(),
        });
        return "blocked";
      }
    }

    const preparedAudio = await prepareSubtitleAudioFile(next.recording.audioUrl);
    const audioPath = preparedAudio.audioPath;
    cleanupAudioFile = preparedAudio.cleanup;
    await fs.access(audioPath);
    const fileStat = await fs.stat(audioPath);
    if (fileStat.size <= 0) {
      throw new Error("Resolved audio file is empty.");
    }

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
      fileBytes: fileStat.size,
      durationSeconds,
    });

    if (durationSeconds > maxAudioSeconds) {
      throw new Error(`Audio duration ${durationSeconds}s exceeds subtitle limit ${maxAudioSeconds}s.`);
    }

    if (provider === "modal") {
      const budget = await checkDurationBudget(durationSeconds, maxAudioSecondsPerDay, maxAudioSecondsPerMonth);
      if (budget.dailyExceeded || budget.monthlyExceeded) {
        await requeue(next.id);
        log("subtitle.job.blocked", {
          recordingId: next.recordingId,
          subtitleId: next.id,
          reason: budget.dailyExceeded ? "daily_cap" : "monthly_cap",
          dailyUsed: budget.dailyUsed,
          monthlyUsed: budget.monthlyUsed,
        });
        return "blocked";
      }
    }

    // Pessimistic reservation: create the attempt (with inputDurationSeconds
    // set) only now, immediately before the authorized call. It is never
    // refunded — a failed/crashed call still counts against the day's and
    // month's allowance, by design.
    const attempt = await prisma.recordingSubtitleAttempt.create({
      data: {
        subtitleId: next.id,
        provider,
        status: "PROCESSING",
        modelName: whisperModel,
        inputBytes,
        inputDurationSeconds,
        metadata: jsonObject(attemptMetadata),
        startedAt,
      },
    });
    attemptId = attempt.id;

    let result: SubtitleProviderResult;
    try {
      result = await runSubtitleProvider({
        subtitleId: next.id,
        recordingId: next.recordingId,
        audioPath,
        durationSeconds,
      });
    } catch (error) {
      if (provider === "modal" && error instanceof ModalProviderCallError) {
        const message = cleanError(error);
        const durationMs = Date.now() - startedAt.getTime();
        await prisma.$transaction([
          prisma.recordingSubtitleAttempt.update({
            where: { id: attempt.id },
            data: { status: "FAILED", error: message, durationMs, endedAt: new Date() },
          }),
        ]);
        await requeue(next.id);
        const pausedUntil = await pauseProvider(providerFailureCooldownMs, message);
        log("subtitle.job.provider_failed", {
          recordingId: next.recordingId,
          subtitleId: next.id,
          provider,
          error: message,
          pausedUntil: pausedUntil.toISOString(),
        });
        return "blocked";
      }
      throw error;
    }

    if (result.segments.length === 0) {
      const message = "Transcription completed but produced no subtitle segments.";
      const durationMs = Date.now() - startedAt.getTime();
      await prisma.$transaction([
        prisma.recordingSubtitleAttempt.update({
          where: { id: attempt.id },
          data: { status: "FAILED", error: message, durationMs, endedAt: new Date() },
        }),
        prisma.recordingSubtitle.update({
          where: { id: next.id },
          data: { status: "FAILED", errorMessage: message },
        }),
      ]);
      log("subtitle.job.failed", { recordingId: next.recordingId, subtitleId: next.id, provider, durationMs, error: message });
      return "processed";
    }

    const vttText = segmentsToVtt(result.segments);
    const durationMs = Date.now() - startedAt.getTime();

    if (provider === "modal") {
      await clearPause();
    }

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
      segmentCount: result.segments.length,
      language: result.language ?? null,
    });
  } catch (error) {
    const message = cleanError(error);
    const durationMs = Date.now() - startedAt.getTime();
    // If a pessimistic attempt reservation was already created for this job,
    // finalize that same row (never create a second one — it would leave the
    // reservation orphaned at status: PROCESSING forever).
    const attemptWrite = attemptId
      ? prisma.recordingSubtitleAttempt.update({
          where: { id: attemptId },
          data: { status: "FAILED", error: message, durationMs, endedAt: new Date() },
        })
      : prisma.recordingSubtitleAttempt.create({
          data: {
            subtitleId: next.id,
            provider,
            status: "FAILED",
            modelName: whisperModel,
            inputBytes,
            inputDurationSeconds,
            durationMs,
            error: message,
            metadata: jsonObject(attemptMetadata),
            startedAt,
            endedAt: new Date(),
          },
        });
    await prisma.$transaction([
      prisma.recordingSubtitle.update({
        where: { id: next.id },
        data: {
          status: "FAILED",
          errorMessage: message,
        },
      }),
      attemptWrite,
    ]);
    log("subtitle.job.failed", { recordingId: next.recordingId, subtitleId: next.id, provider, durationMs, error: message });
  } finally {
    if (cleanupAudioFile) {
      await cleanupAudioFile();
    }
  }

  return "processed";
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
  let localPythonCommand: string | null = null;
  if (provider === "local-python") {
    localPythonCommand = checkLocalPythonProvider();
    process.env.SUBTITLES_PYTHON_COMMAND = localPythonCommand;
  }

  log("subtitle.worker.start", {
    provider,
    sleepMs,
    maxAudioSeconds,
    whisperModel,
    mode: "one-shot",
    requireModalProvider,
    processAfter: processAfter?.toISOString() ?? null,
    ...(provider === "modal"
      ? { maxAudioSecondsPerDay, maxAudioSecondsPerMonth, providerFailureCooldownMs }
      : {}),
    ...(localPythonCommand
      ? { localPythonCommand, projectRoot: getProjectRoot() }
      : {}),
  });

  await failStaleProcessingRows();

  const processLimit = parseProcessLimit();
  if (processLimit != null) {
    let processedCount = 0;
    for (let i = 0; i < processLimit && !shuttingDown; i++) {
      const outcome = await processNextSubtitle();
      if (outcome === "empty" || outcome === "blocked") break;
      processedCount += 1;
    }
    await prisma.$disconnect();
    log("subtitle.worker.exit", { mode: processLimit === 1 ? "once" : "limit", limit: processLimit, processedCount });
    return;
  }

  while (!shuttingDown) {
    const outcome = await processNextSubtitle();
    await sleep(outcome === "processed" ? Math.min(sleepMs, 1_000) : sleepMs);
  }

  await prisma.$disconnect();
  log("subtitle.worker.exit");
}

main().catch(async (error) => {
  log("subtitle.worker.crashed", { error: cleanError(error) });
  await prisma.$disconnect();
  process.exit(1);
});
