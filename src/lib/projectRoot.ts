import path from "node:path";
import { fileURLToPath } from "node:url";

export function getBackendRoot() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../..");
}
