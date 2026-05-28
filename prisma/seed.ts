import { disconnectSeed, runSeed } from "./seed/runSeed.js";

const seedDataPath = process.argv[2];

runSeed(seedDataPath)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeed();
  });
