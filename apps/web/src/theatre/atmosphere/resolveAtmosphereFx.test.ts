import { describe, expect, it } from "vitest";

import { resolveAtmosphereFx } from "./resolveAtmosphereFx";

describe("resolveAtmosphereFx", () => {
  it("hidden always wins with inactive result", () => {
    const resolved = resolveAtmosphereFx({
      hidden: true,
      globalPresetId: "glow",
      globalIntensity: "normal",
      song: { mode: "strong", presetId: "bars" },
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved).toEqual({ active: false, reason: "global-off" });
  });

  it("song off wins when global is on", () => {
    const resolved = resolveAtmosphereFx({
      hidden: false,
      globalPresetId: "glow",
      globalIntensity: "normal",
      song: { mode: "off", presetId: "radial" },
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved).toEqual({ active: false, reason: "song-off" });
  });

  it("inherits global intensity and song preset when song mode is inherit", () => {
    const resolved = resolveAtmosphereFx({
      hidden: false,
      globalPresetId: "glow",
      globalIntensity: "subtle",
      song: { mode: "inherit", presetId: "vignette" },
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved.active).toBe(true);
    if (!resolved.active) return;
    expect(resolved.presetId).toBe("vignette");
    expect(resolved.intensity).toBe("subtle");
    expect(resolved.animationId).toBe("atmosphereVignette");
  });

  it("forces off on low power", () => {
    const resolved = resolveAtmosphereFx({
      hidden: false,
      globalPresetId: "glow",
      globalIntensity: "normal",
      song: { mode: "inherit", presetId: null },
      reducedMotion: false,
      lowPower: true,
    });
    expect(resolved).toEqual({ active: false, reason: "policy" });
  });

  it("resolves inactive (not a glow fallback) when the rotation engine picks nothing and song has no opinion", () => {
    const resolved = resolveAtmosphereFx({
      hidden: false,
      globalPresetId: null,
      globalIntensity: "normal",
      song: { mode: "inherit", presetId: null },
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved).toEqual({ active: false, reason: "policy" });
  });

  it("a song's own preset still shows when the global rotation picked nothing this cycle", () => {
    const resolved = resolveAtmosphereFx({
      hidden: false,
      globalPresetId: null,
      globalIntensity: "normal",
      song: { mode: "inherit", presetId: "bars" },
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved.active).toBe(true);
    if (!resolved.active) return;
    expect(resolved.presetId).toBe("bars");
  });

  it("passes fxAmount through when the global preset wins", () => {
    const resolved = resolveAtmosphereFx({
      hidden: false,
      globalPresetId: "glow",
      globalIntensity: "strong",
      fxAmount: 72,
      song: null,
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved.active).toBe(true);
    if (!resolved.active) return;
    expect(resolved.fxAmount).toBe(72);
  });

  it("drops fxAmount when the song's own preset wins instead of the global pick", () => {
    // fxAmount was tuned by the rotation engine for its own current pick
    // (glow) — it must not leak onto an unrelated song-pinned preset (bars).
    const resolved = resolveAtmosphereFx({
      hidden: false,
      globalPresetId: "glow",
      globalIntensity: "normal",
      fxAmount: 95,
      song: { mode: "inherit", presetId: "bars" },
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved.active).toBe(true);
    if (!resolved.active) return;
    expect(resolved.presetId).toBe("bars");
    expect(resolved.fxAmount).toBeUndefined();
  });
});
