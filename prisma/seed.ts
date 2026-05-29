import { disconnectSeed, runSeed } from "./seed/runSeed.js";

type SeedCliArgs = {
  seedDataPath?: string;
  only?: "users";
};

function parseSeedArgs(argv: string[]): SeedCliArgs {
  const args = argv.slice(2);
  let seedDataPath: string | undefined;
  let only: SeedCliArgs["only"];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === "--users-only") {
      only = "users";
      continue;
    }

    if (arg === "--only") {
      const value = args[i + 1];
      if (value === "users") {
        only = "users";
        i += 1;
        continue;
      }
      throw new Error(`Invalid --only value: ${value ?? "(missing)"}`);
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (seedDataPath) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
    seedDataPath = arg;
  }

  return { seedDataPath, only };
}

const { seedDataPath, only } = parseSeedArgs(process.argv);

runSeed(seedDataPath, { only })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeed();
  });
