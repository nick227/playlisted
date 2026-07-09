import AnimationBridge from "../controller/AnimationBridge";
import type { AnimationContext, AnimationFactory, InternalAnimationOptions } from "../core/IAnimation";
import { withTheatreInitContext } from "../controller/theatreFrameContext";
import registry from "../registry";
import { getAtmosphereFxVisibility } from "./atmosphereFxStore";
import type { AtmospherePick } from "./pickAtmosphereState";
import { resolveAtmosphereFx } from "./resolveAtmosphereFx";
import type { ResolvedAtmosphereFx, SongAtmosphereFx } from "./types";

const LAYER_Z = 102;

export function blendModeForPreset(presetId: string): string {
  // Scenes that paint dark values need normal; additive scenes use screen.
  if (presetId === "vignette" || presetId === "bars") return "normal";
  return "screen";
}

/**
 * Theatre-owned post-FX overlay. Driven by the controller RAF only —
 * no separate clock, analyser, or requestAnimationFrame.
 * Global off / inactive resolve = zero mount cost.
 */
export class AtmosphereFxLayer {
  private bridge: AnimationBridge | null = null;
  private host: HTMLElement | null = null;
  private activeKey: string | null = null;
  private songOverride: SongAtmosphereFx | null = null;
  private layerOptions: InternalAnimationOptions | null = null;
  private autoPick: AtmospherePick | null = null;
  /** Serializes sync()/teardown() calls — the rotation engine, song-override
   * changes, and visibility toggles can all call in around the same time, and
   * overlapping async mount/teardown would otherwise race and corrupt
   * this.bridge/this.host (leaking mounted canvases). */
  private opChain: Promise<unknown> = Promise.resolve();

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.opChain.then(fn, fn);
    this.opChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  setSongOverride(song: SongAtmosphereFx | null) {
    this.songOverride = song;
  }

  getSongOverride(): SongAtmosphereFx | null {
    return this.songOverride;
  }

  /** Current rotation-engine pick. Passing null means "no opinion yet." */
  setAutoPick(pick: AtmospherePick | null) {
    this.autoPick = pick;
  }

  async sync(overlay: HTMLElement, ctx: AnimationContext): Promise<boolean> {
    return this.enqueue(() => this.syncInner(overlay, ctx));
  }

  private async syncInner(overlay: HTMLElement, ctx: AnimationContext): Promise<boolean> {
    const resolved = resolveAtmosphereFx({
      hidden: !getAtmosphereFxVisibility(),
      globalPresetId: this.autoPick?.presetId ?? null,
      globalIntensity: this.autoPick?.intensity ?? "normal",
      fxAmount: this.autoPick?.fxAmount,
      song: this.songOverride,
      reducedMotion: Boolean(ctx.shared?.reducedMotion),
      lowPower: Boolean(ctx.shared?.lowPower),
    });

    if (!resolved.active) {
      if (!this.bridge && !this.host) return false;
      await this.teardownInner();
      return false;
    }

    const key = `${resolved.animationId}:${resolved.intensity}:${resolved.intensityGain}:${resolved.fxAmount ?? "default"}`;
    if (this.activeKey === key && this.bridge && this.host?.isConnected) return true;

    await this.teardownInner();
    await this.mount(overlay, ctx, resolved);
    this.activeKey = key;
    return true;
  }

  renderFrame(ctx: AnimationContext) {
    if (this.host?.parentElement && this.host !== this.host.parentElement.lastElementChild) {
      this.host.parentElement.appendChild(this.host);
    }
    // Do not pass scene-preset options — CanvasAnimation merges ctx.options and
    // would overwrite atmosphere intensity / blendMode every frame.
    this.bridge?.renderFrame({
      ...ctx,
      options: this.layerOptions ?? {},
    });
  }

  pause() {
    this.bridge?.pause();
  }

  resume() {
    this.bridge?.resume();
  }

  async teardown() {
    return this.enqueue(() => this.teardownInner());
  }

  private async teardownInner() {
    if (this.bridge) {
      await this.bridge.exit({ presetId: "atmosphere-fx" });
      this.bridge = null;
    }
    if (this.host?.parentElement) {
      this.host.parentElement.removeChild(this.host);
    }
    this.host = null;
    this.activeKey = null;
    this.layerOptions = null;
  }

  private async mount(overlay: HTMLElement, ctx: AnimationContext, resolved: Extract<ResolvedAtmosphereFx, { active: true }>) {
    const entry = registry.get(resolved.animationId);
    if (!entry) {
      console.warn(`[Atmosphere FX] animation not registered: ${resolved.animationId}`);
      return;
    }

    const host = document.createElement("div");
    host.className = "theatre-atmosphere-layer absolute inset-0";
    host.dataset.atmospherePreset = resolved.presetId;
    host.style.pointerEvents = "none";
    host.style.zIndex = String(LAYER_Z);
    overlay.appendChild(host);
    this.host = host;

    const blendMode = blendModeForPreset(resolved.presetId);
    this.layerOptions = {
      role: "overlay",
      opacity: 1,
      zIndex: LAYER_Z,
      blendMode,
      intensity: resolved.intensityGain,
      sensitivity: resolved.intensityGain,
      preset: resolved.intensity === "strong" ? "chaos" : resolved.intensity === "subtle" ? "tame" : "vivid",
      fxAmount: resolved.fxAmount,
    };

    const layerOptions = this.layerOptions;
    const factory: AnimationFactory = (ctxParam) => {
      const initContext: AnimationContext = {
        ...ctxParam,
        options: { ...layerOptions },
      };
      return withTheatreInitContext(entry.factory(initContext), initContext);
    };

    const bridge = new AnimationBridge();
    await bridge.enter(host, [factory], ctx, { presetId: `atmosphere:${resolved.presetId}` });
    this.bridge = bridge;

    // Keep host above scene layers after deck transitions append siblings.
    overlay.appendChild(host);
  }
}
