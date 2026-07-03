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
 * Whether automatic generation should queue jobs at all. When this is false,
 * creating QUEUED rows only manufactures guaranteed failures — skip them and
 * let creators add subtitles manually.
 */
export function isSubtitleGenerationEnabled(): boolean {
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
