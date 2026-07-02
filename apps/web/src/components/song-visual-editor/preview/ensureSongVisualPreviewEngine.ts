import { registerUserMediaEngine } from "@/theatre/media/userMediaEngine";

let previewEngineReady = false;

export function ensureSongVisualPreviewEngine(): void {
  if (previewEngineReady) return;
  registerUserMediaEngine();
  previewEngineReady = true;
}
