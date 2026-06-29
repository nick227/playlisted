import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../prisma.js";
import type { SubtitleProviderInput, SubtitleProviderResult } from "./types.js";

type ModalResponse = {
  engine?: string;
  modelName?: string;
  language?: string | null;
  providerJobId?: string | null;
  estimatedCostCents?: number | null;
  segments?: { start: number; end: number; text: string }[];
};

function requireModalEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Modal subtitles.`);
  return value;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

async function assertModalBudget(input: SubtitleProviderInput) {
  if (process.env.SUBTITLES_MODAL_ENABLED !== "true") {
    throw new Error("Modal subtitles are not explicitly enabled.");
  }

  const maxAudioSeconds = Number(process.env.SUBTITLES_MODAL_MAX_AUDIO_SECONDS ?? process.env.SUBTITLES_MAX_AUDIO_SECONDS ?? 900);
  if (input.durationSeconds > maxAudioSeconds) {
    throw new Error(`Audio duration ${input.durationSeconds}s exceeds Modal subtitle limit ${maxAudioSeconds}s.`);
  }

  const dailyMaxJobs = Number(process.env.SUBTITLES_MODAL_DAILY_MAX_JOBS ?? 0);
  const monthlyBudgetCents = Number(process.env.SUBTITLES_MODAL_MONTHLY_BUDGET_CENTS ?? 0);

  if (dailyMaxJobs <= 0) throw new Error("SUBTITLES_MODAL_DAILY_MAX_JOBS must be greater than 0.");
  if (monthlyBudgetCents <= 0) throw new Error("SUBTITLES_MODAL_MONTHLY_BUDGET_CENTS must be greater than 0.");

  const now = new Date();
  const [dailyJobs, monthlySpend] = await Promise.all([
    prisma.recordingSubtitleAttempt.count({
      where: {
        provider: "modal",
        startedAt: { gte: startOfDay(now) },
      },
    }),
    prisma.recordingSubtitleAttempt.aggregate({
      where: {
        provider: "modal",
        startedAt: { gte: startOfMonth(now) },
      },
      _sum: { costCents: true },
    }),
  ]);

  // The worker creates the current attempt before provider budget checks run.
  if (dailyJobs > dailyMaxJobs) {
    throw new Error(`Modal daily subtitle job cap reached (${dailyJobs}/${dailyMaxJobs}).`);
  }

  const spentCents = monthlySpend._sum.costCents ?? 0;
  if (spentCents >= monthlyBudgetCents) {
    throw new Error(`Modal monthly subtitle budget reached (${spentCents}/${monthlyBudgetCents} cents).`);
  }
}

export async function runModalProvider(input: SubtitleProviderInput): Promise<SubtitleProviderResult> {
  if (process.env.SUBTITLES_PROVIDER !== "modal") {
    throw new Error("Modal provider selected without SUBTITLES_PROVIDER=modal.");
  }

  await assertModalBudget(input);

  const url = requireModalEnv("MODAL_SUBTITLES_URL");
  const token = requireModalEnv("MODAL_SUBTITLES_TOKEN");
  const model = process.env.SUBTITLES_WHISPER_MODEL ?? "small";
  const audio = await fs.readFile(input.audioPath);
  const form = new FormData();
  form.set("model", model);
  form.set("wordTimestamps", "true");
  form.set("file", new Blob([audio]), path.basename(input.audioPath));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Modal subtitles failed (${response.status}): ${body || response.statusText}`);
  }

  const payload = await response.json() as ModalResponse;
  if (!Array.isArray(payload.segments)) {
    throw new Error("Modal response did not include segments.");
  }

  return {
    provider: "modal",
    modelName: payload.modelName ?? model,
    language: payload.language ?? null,
    providerJobId: payload.providerJobId ?? null,
    estimatedCostCents: payload.estimatedCostCents ?? null,
    segments: payload.segments.map((segment) => ({
      start: Number(segment.start),
      end: Number(segment.end),
      text: String(segment.text ?? ""),
    })),
  };
}
