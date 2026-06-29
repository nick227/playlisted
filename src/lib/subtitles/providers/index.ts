import type { SubtitleProviderInput, SubtitleProviderName, SubtitleProviderResult } from "./types.js";
import { runLocalPythonProvider } from "./localPythonProvider.js";
import { runModalProvider } from "./modalProvider.js";

export function getSubtitleProvider(): SubtitleProviderName {
  const provider = process.env.SUBTITLES_PROVIDER ?? "disabled";
  if (provider === "local-python" || provider === "modal" || provider === "disabled") {
    return provider;
  }
  throw new Error(`Unsupported SUBTITLES_PROVIDER: ${provider}`);
}

export async function runSubtitleProvider(input: SubtitleProviderInput): Promise<SubtitleProviderResult> {
  const provider = getSubtitleProvider();

  switch (provider) {
    case "local-python":
      return runLocalPythonProvider(input);
    case "modal":
      return runModalProvider(input);
    case "disabled":
      throw new Error("Subtitle provider disabled");
  }
}
