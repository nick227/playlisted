import type { AnimationPackageManifest } from "../../registry/packages";

export const atmosphereFxManifest: AnimationPackageManifest = {
  id: "atmosphere-fx",
  label: "Atmosphere FX",
  version: "1.0.0",
  kind: "effect-system",
  category: "production",
  description: "Optional full-frame audio-reactive post-FX overlay (not in scene rotation).",
  capabilities: ["audio-features", "external-raf", "reduced-motion", "low-power"],
  reducedMotionSafe: true,
  weight: 0,
};
