import type { AnimationPackage } from "../../registry/packages";
import {
  atmosphereBarsFactory,
  atmosphereColorWashFactory,
  atmosphereGlowFactory,
  atmosphereRadialFactory,
  atmosphereVignetteFactory,
} from "./AtmosphereFxScenes";
import { atmosphereFxManifest } from "./manifest";

/**
 * Atmosphere FX package registers animations only — no ScenePresetDef entries,
 * so presets never enter the theatre rotation bag.
 */
export const atmosphereFxPackage: AnimationPackage = {
  manifest: atmosphereFxManifest,
  animations: [
    {
      id: "atmosphereGlow",
      label: "Atmosphere Glow",
      factory: atmosphereGlowFactory,
      visualType: "canvas",
      mood: "calm",
      role: "overlay",
      weight: 0,
    },
    {
      id: "atmosphereVignette",
      label: "Atmosphere Vignette",
      factory: atmosphereVignetteFactory,
      visualType: "canvas",
      mood: "calm",
      role: "overlay",
      weight: 0,
    },
    {
      id: "atmosphereBars",
      label: "Atmosphere Bars",
      factory: atmosphereBarsFactory,
      visualType: "canvas",
      mood: "dynamic",
      role: "overlay",
      weight: 0,
    },
    {
      id: "atmosphereRadial",
      label: "Atmosphere Multi-Shape",
      factory: atmosphereRadialFactory,
      visualType: "canvas",
      mood: "dynamic",
      role: "overlay",
      weight: 0,
    },
    {
      id: "atmosphereColorWash",
      label: "Atmosphere Color Wash",
      factory: atmosphereColorWashFactory,
      visualType: "canvas",
      mood: "calm",
      role: "overlay",
      weight: 0,
    },
  ],
  presets: [],
};
