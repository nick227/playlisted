import fs from "node:fs/promises";
import path from "node:path";

import type { SubtitleProviderInput, SubtitleProviderResult } from "./types.js";

type ModalResponse = {
  engine?: string;
  modelName?: string;
  language?: string | null;
  providerJobId?: string | null;
  estimatedCostCents?: number | null;
  segments?: { start: number; end: number; text: string }[];
};

/**
 * Thrown for provider-level failures (auth, billing, rate-limit, 5xx,
 * network/timeout, or missing config) — the worker requeues the job and
 * pauses further Modal calls on this. Never thrown for a request/content
 * problem (bad audio, oversized upload) — those are permanent per-file
 * failures and should not pause the provider for everyone else.
 */
export class ModalProviderCallError extends Error {}

// Modal rejected the request itself — not a provider health problem.
const CONTENT_FAILURE_STATUSES = new Set([400, 413, 422]);

function requireModalEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Modal subtitles.`);
  return value;
}

export async function runModalProvider(input: SubtitleProviderInput): Promise<SubtitleProviderResult> {
  if (process.env.SUBTITLES_PROVIDER !== "modal") {
    throw new ModalProviderCallError("Modal provider selected without SUBTITLES_PROVIDER=modal.");
  }

  let url: string;
  let token: string;
  try {
    url = requireModalEnv("MODAL_SUBTITLES_URL");
    token = requireModalEnv("MODAL_SUBTITLES_TOKEN");
  } catch (error) {
    throw new ModalProviderCallError(error instanceof Error ? error.message : String(error));
  }

  const model = process.env.SUBTITLES_WHISPER_MODEL ?? "small";
  const audio = await fs.readFile(input.audioPath);
  const form = new FormData();
  form.set("model", model);
  form.set("wordTimestamps", "true");
  form.set("file", new Blob([audio]), path.basename(input.audioPath));

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
  } catch (error) {
    throw new ModalProviderCallError(
      `Modal request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = `Modal subtitles failed (${response.status}): ${body || response.statusText}`;
    if (CONTENT_FAILURE_STATUSES.has(response.status)) {
      throw new Error(message);
    }
    throw new ModalProviderCallError(message);
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
