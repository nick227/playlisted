import { spawn } from "node:child_process";
import { once } from "node:events";

import type { SubtitleSegment } from "../vtt.js";
import type { SubtitleProviderInput, SubtitleProviderResult } from "./types.js";

type TranscriptionResult = {
  language?: string | null;
  segments: SubtitleSegment[];
};

const whisperModel = process.env.SUBTITLES_WHISPER_MODEL ?? "tiny";
const maxRuntimeSeconds = Number(process.env.SUBTITLES_MAX_RUNTIME_SECONDS ?? 1_200);
const pythonCommand = process.env.SUBTITLES_PYTHON_COMMAND ?? "python3";

export async function runLocalPythonProvider(input: SubtitleProviderInput): Promise<SubtitleProviderResult> {
  const args = [
    "scripts/transcribe.py",
    input.audioPath,
    "--model",
    whisperModel,
  ];

  const language = process.env.SUBTITLES_LANGUAGE;
  if (language) args.push("--language", language);

  const child = spawn(pythonCommand, args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const timeout = setTimeout(() => {
    child.kill("SIGTERM");
  }, maxRuntimeSeconds * 1000);

  const [code] = await once(child, "exit") as [number | null, NodeJS.Signals | null];
  clearTimeout(timeout);

  if (code !== 0) {
    throw new Error(stderr.trim() || `Transcription exited with code ${code ?? "unknown"}.`);
  }

  const parsed = JSON.parse(stdout) as TranscriptionResult;
  if (!Array.isArray(parsed.segments)) {
    throw new Error("Transcription output did not include segments.");
  }

  return {
    provider: "local-python",
    modelName: whisperModel,
    language: parsed.language ?? null,
    segments: parsed.segments.map((segment) => ({
      start: Number(segment.start),
      end: Number(segment.end),
      text: String(segment.text ?? ""),
    })),
  };
}
