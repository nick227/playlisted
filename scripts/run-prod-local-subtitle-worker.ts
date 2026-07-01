import "dotenv/config";

import {
  checkLocalPythonProvider,
} from "../src/lib/subtitles/providers/localPythonProvider.ts";

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

async function main() {
  process.env.DATABASE_URL = requireMysqlPublicUrl();
  process.env.SUBTITLES_PROVIDER = "local-python";
  if (process.env.PROD_LOCAL_SUBTITLES_PYTHON_COMMAND) {
    process.env.SUBTITLES_PYTHON_COMMAND = process.env.PROD_LOCAL_SUBTITLES_PYTHON_COMMAND;
  }
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
  process.env.SUBTITLES_PYTHON_COMMAND = checkLocalPythonProvider();

  const hasLimit = process.argv.some((arg) => arg.startsWith("--limit="));
  if (!process.argv.includes("--once") && !hasLimit) {
    process.argv.push("--once");
  }

  await import("../src/workers/subtitleWorker.ts");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
