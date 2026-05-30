import { spawnSync } from "node:child_process";

function logDatabaseTarget() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  try {
    const url = new URL(raw);
    console.log(`DATABASE_URL target: ${url.protocol}//${url.username}:***@${url.hostname}:${url.port}${url.pathname}`);
  } catch {
    console.log("DATABASE_URL is set, but could not be parsed for safe logging.");
  }
}

function run(command, args, options = {}) {
  console.log(`Running: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    if (options.allowFailure) {
      console.log(`Command exited with status ${result.status}; continuing.`);
      return;
    }
    process.exit(result.status ?? 1);
  }
}

logDatabaseTarget();
run("npx", ["prisma", "migrate", "status"], { allowFailure: true });
run("npx", ["prisma", "migrate", "deploy"]);
