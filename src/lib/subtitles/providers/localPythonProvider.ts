import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";

import { getBackendRoot } from "../../projectRoot.js";
import type { SubtitleSegment } from "../vtt.js";
import type { SubtitleProviderInput, SubtitleProviderResult } from "./types.js";

type TranscriptionResult = {
  language?: string | null;
  segments: SubtitleSegment[];
};

const whisperModel = process.env.SUBTITLES_WHISPER_MODEL ?? "tiny";
const maxRuntimeSeconds = Number(process.env.SUBTITLES_MAX_RUNTIME_SECONDS ?? 1_200);

export function getProjectRoot() {
  return getBackendRoot();
}

export function getPythonCommand() {
  if (process.env.SUBTITLES_PYTHON_COMMAND) return process.env.SUBTITLES_PYTHON_COMMAND;

  const projectRoot = getProjectRoot();
  const localVenv = path.resolve(projectRoot, ".venv/bin/python");
  if (fs.existsSync(localVenv)) return localVenv;
  const modalVenv = path.resolve(projectRoot, ".modal-venv/bin/python");
  if (fs.existsSync(modalVenv)) return modalVenv;

  const localVenvWin = path.resolve(projectRoot, ".venv/Scripts/python.exe");
  if (fs.existsSync(localVenvWin)) return localVenvWin;
  const modalVenvWin = path.resolve(projectRoot, ".modal-venv/Scripts/python.exe");
  if (fs.existsSync(modalVenvWin)) return modalVenvWin;

  return "python3";
}

export function resolveLocalPythonCommand() {
  const pythonCommand = getPythonCommand();
  if (pythonCommand === "python3") {
    throw new Error(
      `No project virtualenv python found under ${getProjectRoot()}. Expected .venv or .modal-venv, or set SUBTITLES_PYTHON_COMMAND.`,
    );
  }
  return pythonCommand;
}

export function checkLocalPythonProvider() {
  const pythonCmd = resolveLocalPythonCommand();
  const result = spawnSync(pythonCmd, ["-c", "import faster_whisper"], { encoding: "utf8" });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`faster-whisper is not installed or could not be imported using '${pythonCmd}'. Detail: ${detail}`);
  }
  return pythonCmd;
}

export async function runLocalPythonProvider(input: SubtitleProviderInput): Promise<SubtitleProviderResult> {
  const pythonCommand = resolveLocalPythonCommand();
  const projectRoot = getProjectRoot();
  const args = [
    "scripts/transcribe.py",
    input.audioPath,
    "--model",
    whisperModel,
  ];

  const language = process.env.SUBTITLES_LANGUAGE;
  if (language) args.push("--language", language);

  const child = spawn(pythonCommand, args, {
    cwd: projectRoot,
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
