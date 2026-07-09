import type { AnimationFactory } from "../../core/IAnimation";
import { AtmosphereBarsScene } from "./BarsScene";
import { AtmosphereColorWashScene } from "./ColorWashScene";
import { AtmosphereGlowScene } from "./GlowScene";
import { AtmosphereRadialScene } from "./RadialScene";
import { AtmosphereVignetteScene } from "./VignetteScene";
import { AtmosphereKaleidoscopeScene } from "./KaleidoscopeScene";
import { CanvasAnimation } from "../../core/CanvasAnimation";

function factory(Ctor: new () => CanvasAnimation): AnimationFactory {
  return () => new Ctor();
}

export const atmosphereGlowFactory = factory(AtmosphereGlowScene);
export const atmosphereVignetteFactory = factory(AtmosphereVignetteScene);
export const atmosphereBarsFactory = factory(AtmosphereBarsScene);
export const atmosphereRadialFactory = factory(AtmosphereRadialScene);
export const atmosphereColorWashFactory = factory(AtmosphereColorWashScene);
export const atmosphereKaleidoscopeFactory = factory(AtmosphereKaleidoscopeScene);
