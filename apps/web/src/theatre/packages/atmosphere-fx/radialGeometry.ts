/** Fractal pattern dispatcher for Atmosphere Multi-Shape (Radial). */

export type {
  DrawFractalInput,
  FractalKind,
  FractalMood,
  FractalRecipe,
  FxMode,
  Rng,
} from "./radialTypes";
export { createSeededRng } from "./radialTypes";
export { pickFractalRecipe, pickFxMode } from "./radialRecipes";

import {
  drawApollonian,
  drawFlowField,
  drawIfsDust,
  drawJuliaOrbit,
  drawKochBurst,
  drawMandalaNest,
  drawPhyllotaxis,
  drawSpiralTree,
} from "./radialDrawCore";
import {
  drawBurstRays,
  drawLissajous,
  drawRoseCurve,
  drawStarLattice,
  drawVortex,
  drawWeave,
} from "./radialDrawExtra";
import type { DrawFractalInput } from "./radialTypes";

function drawOnce(input: DrawFractalInput) {
  const { recipe, cx, cy, maxR } = input;
  switch (recipe.kind) {
    case "juliaOrbit":
      drawJuliaOrbit(input);
      break;
    case "spiralTree":
      drawSpiralTree(input, recipe.depth + 1, cx, cy, -Math.PI / 2 + recipe.twist, maxR * recipe.scale * 0.38);
      drawSpiralTree(input, recipe.depth, cx, cy, Math.PI / 2 + recipe.twist, maxR * recipe.scale * 0.3);
      break;
    case "ifsDust":
      drawIfsDust(input);
      break;
    case "mandalaNest":
      drawMandalaNest(input);
      break;
    case "phyllotaxis":
      drawPhyllotaxis(input);
      break;
    case "kochBurst":
      drawKochBurst(input);
      break;
    case "apollonian":
      drawApollonian(input, cx, cy, maxR * recipe.scale * 0.55, recipe.depth);
      break;
    case "roseCurve":
      drawRoseCurve(input);
      break;
    case "lissajous":
      drawLissajous(input);
      break;
    case "vortex":
      drawVortex(input);
      break;
    case "starLattice":
      drawStarLattice(input);
      break;
    case "burstRays":
      drawBurstRays(input);
      break;
    case "weave":
      drawWeave(input);
      break;
    case "flowField":
    default:
      drawFlowField(input);
      break;
  }
}

export function drawFractalPattern(input: DrawFractalInput) {
  drawOnce(input);
  if (!input.recipe.mirror) return;
  const { ctx, cx, cy } = input;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(-1, 1);
  ctx.translate(-cx, -cy);
  drawOnce({
    ...input,
    recipe: {
      ...input.recipe,
      hueSeed: input.recipe.hueSeed + 40,
      twist: input.recipe.twist + Math.PI * 0.15,
      mirror: false,
    },
    g: input.g * 0.75,
  });
  ctx.restore();
}
