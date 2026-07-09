import type { AnimationFactory } from "../../core/IAnimation";
import { AtmosphereBarsScene } from "./BarsScene";
import { AtmosphereColorWashScene } from "./ColorWashScene";
import { AtmosphereGlowScene } from "./GlowScene";
import { AtmosphereRadialScene } from "./RadialScene";
import { AtmosphereVignetteScene } from "./VignetteScene";
import { AtmosphereKaleidoscopeScene } from "./KaleidoscopeScene";
import { AtmosphereSonarScene } from "./SonarScene";
import { AtmosphereGlitchScene } from "./GlitchScene";
import { AtmosphereShatterScene } from "./ShatterScene";
import { AtmosphereLaserGridScene } from "./LaserGridScene";
import { AtmosphereGlyphRainScene } from "./GlyphRainScene";
import { AtmosphereFireflyScene } from "./FireflyScene";
import { AtmosphereWarpStarfieldScene } from "./WarpStarfieldScene";
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
export const atmosphereSonarFactory = factory(AtmosphereSonarScene);
export const atmosphereGlitchFactory = factory(AtmosphereGlitchScene);
export const atmosphereShatterFactory = factory(AtmosphereShatterScene);
export const atmosphereLaserGridFactory = factory(AtmosphereLaserGridScene);
export const atmosphereGlyphRainFactory = factory(AtmosphereGlyphRainScene);
export const atmosphereFireflyFactory = factory(AtmosphereFireflyScene);
export const atmosphereWarpStarfieldFactory = factory(AtmosphereWarpStarfieldScene);
