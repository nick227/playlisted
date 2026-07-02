#!/usr/bin/env node
/**
 * Baseline an existing database that was created outside Prisma Migrate
 * (e.g. via db push or manual SQL). Marks every migration in prisma/migrations
 * as applied without running SQL, then `prisma migrate deploy` works for new migrations.
 *
 * Usage: npm run prisma:baseline
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const migrationsDir = join(process.cwd(), "prisma", "migrations");
const names = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (names.length === 0) {
  console.error("No migrations found in prisma/migrations");
  process.exit(1);
}

console.log(`Baselining ${names.length} migration(s)...`);

for (const name of names) {
  const result = spawnSync("npx", ["prisma", "migrate", "resolve", "--applied", name], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Done. Run: npx prisma migrate deploy");
