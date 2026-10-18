import type { SubtitleProviderInput, SubtitleProviderName, SubtitleProviderResult } from "./types.js";
import { runLocalPythonProvider } from "./localPythonProvider.js";
import { runModalProvider } from "./modalProvider.js";
import { runOpenAIWhisperProvider } from "./openaiWhisperProvider.js";

export function getSubtitleProvider(): SubtitleProviderName {
  const provider = process.env.SUBTITLES_PROVIDER ?? "disabled";
  if (provider === "local-python" || provider === "modal" || provider === "whisper" || provider === "disabled") {
    return provider;
  }
  throw new Error(`Unsupported SUBTITLES_PROVIDER: ${provider}`);
}

/**
 * Subtitle generation is shelved alongside the theatre: nothing is queued,
 * regenerated, or processed regardless of env. Flip to false to restore
 * env-driven behavior (SUBTITLES_ENABLED / SUBTITLES_PROVIDER).
 */
export const SUBTITLE_GENERATION_SHELVED = true;

/**
 * Whether automatic generation should queue jobs at all. When this is false,
 * creating QUEUED rows only manufactures guaranteed failures — skip them and
 * let creators add subtitles manually.
 */
export function isSubtitleGenerationEnabled(): boolean {
  if (SUBTITLE_GENERATION_SHELVED) return false;
  return process.env.SUBTITLES_ENABLED !== "false" && getSubtitleProvider() !== "disabled";
}

export async function runSubtitleProvider(input: SubtitleProviderInput): Promise<SubtitleProviderResult> {
  const provider = getSubtitleProvider();

  switch (provider) {
    case "local-python":
      return runLocalPythonProvider(input);
    case "modal":
      return runModalProvider(input);
    case "whisper":
      return runOpenAIWhisperProvider(input);
    case "disabled":
      throw new Error("Subtitle provider disabled");
  }
}
