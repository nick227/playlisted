import { registerUserMediaEngine } from "@/theatre/media/userMediaEngine";
import "@/theatre/registry/seed";

let previewEngineReady = false;

export function ensureSongVisualPreviewEngine(): void {
  if (previewEngineReady) return;
  registerUserMediaEngine();
  previewEngineReady = true;
}
