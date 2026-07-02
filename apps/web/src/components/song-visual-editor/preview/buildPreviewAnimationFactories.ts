import type { AnimationContext, AnimationFactory } from "@/theatre/core/IAnimation";
import { withTheatreInitContext } from "@/theatre/controller/theatreFrameContext";
import registry from "@/theatre/registry";
import type { ScenePresetDef } from "@/theatre/registry/scenePresets";

export function buildPreviewAnimationFactories(preset: ScenePresetDef): AnimationFactory[] {
  const factories: AnimationFactory[] = [];

  for (const layer of preset.layers) {
    const entry = registry.get(layer.animationId);
    if (!entry) continue;

    const layerOptions = layer.options;
    factories.push((ctxParam: AnimationContext) => {
      const initContext: AnimationContext = {
        ...ctxParam,
        options: layerOptions
          ? {
            ...ctxParam.options,
            ...layerOptions,
            objectTheatrePresetId: preset.id,
          }
          : { ...ctxParam.options, objectTheatrePresetId: preset.id },
      };
      return withTheatreInitContext(entry.factory(initContext), initContext);
    });
  }

  return factories;
}
