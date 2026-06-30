import "dotenv/config";

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function requireMysqlPublicUrl() {
  const value = process.env.MYSQL_PUBLIC_URL;
  if (!value) {
    throw new Error("MYSQL_PUBLIC_URL is required in .env to run the local prod subtitle worker.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("MYSQL_PUBLIC_URL is not a valid URL.");
  }

  if (parsed.protocol !== "mysql:") {
    throw new Error("MYSQL_PUBLIC_URL must use the mysql:// protocol.");
  }
  if (!parsed.hostname || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    throw new Error("MYSQL_PUBLIC_URL must point at the Railway public MySQL host, not localhost.");
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    throw new Error("MYSQL_PUBLIC_URL must include the database name in the path.");
  }

  return value;
}

function defaultPythonCommand() {
  const localVenvPython = path.resolve(process.cwd(), ".venv/bin/python");
  if (existsSync(localVenvPython)) return localVenvPython;
  const modalVenvPython = path.resolve(process.cwd(), ".modal-venv/bin/python");
  if (existsSync(modalVenvPython)) return modalVenvPython;
  return "python3";
}

function assertFasterWhisperInstalled(pythonCommand: string) {
  const result = spawnSync(pythonCommand, ["-c", "import faster_whisper"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(
      [
        `Python preflight failed for ${pythonCommand}.`,
        "Install faster-whisper in that interpreter before running the prod-local worker.",
        "Suggested command: <venv>/bin/python -m pip install faster-whisper",
        detail ? `Python said: ${detail}` : "",
      ].filter(Boolean).join("\n"),
    );
  }
}

async function main() {
  process.env.DATABASE_URL = requireMysqlPublicUrl();
  process.env.SUBTITLES_PROVIDER = "local-python";
  process.env.SUBTITLES_PYTHON_COMMAND = process.env.PROD_LOCAL_SUBTITLES_PYTHON_COMMAND ?? defaultPythonCommand();
  process.env.SUBTITLES_DEVICE = process.env.PROD_LOCAL_SUBTITLES_DEVICE ?? "cuda";
  process.env.SUBTITLES_COMPUTE_TYPE = process.env.PROD_LOCAL_SUBTITLES_COMPUTE_TYPE ?? "float16";
  process.env.SUBTITLES_WHISPER_MODEL = process.env.PROD_LOCAL_SUBTITLES_WHISPER_MODEL ?? "small";
  process.env.SUBTITLES_VAD_FILTER = process.env.PROD_LOCAL_SUBTITLES_VAD_FILTER ?? "false";
  process.env.SUBTITLES_WORKER_ALLOW_NON_MODAL = "true";
  const language = process.env.PROD_LOCAL_SUBTITLES_LANGUAGE ?? "en";
  if (language === "auto") {
    delete process.env.SUBTITLES_LANGUAGE;
  } else {
    process.env.SUBTITLES_LANGUAGE = language;
  }
  assertFasterWhisperInstalled(process.env.SUBTITLES_PYTHON_COMMAND);

  if (!process.argv.includes("--once")) {
    process.argv.push("--once");
  }

  await import("../src/workers/subtitleWorker.ts");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
