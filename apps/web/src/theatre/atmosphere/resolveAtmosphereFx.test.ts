import { describe, expect, it } from "vitest";

import { resolveAtmosphereFx } from "./resolveAtmosphereFx";

describe("resolveAtmosphereFx", () => {
  it("global off always wins with inactive result", () => {
    const resolved = resolveAtmosphereFx({
      globalMode: "off",
      globalPresetId: "glow",
      song: { mode: "strong", presetId: "bars" },
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved).toEqual({ active: false, reason: "global-off" });
  });

  it("song off wins when global is on", () => {
    const resolved = resolveAtmosphereFx({
      globalMode: "normal",
      globalPresetId: "glow",
      song: { mode: "off", presetId: "radial" },
      reducedMotion: false,
      lowPower: false,
    });
    expect(resolved).toEqual({ active: false, reason: "song-off" });
  });

  it("inherits global intensity and song preset when song mode is inherit", () => {
    const resolved = resolveAtmosphereFx({
      globalMode: "subtle",
      globalPresetId: "glow",
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
      globalMode: "normal",
      globalPresetId: "glow",
      song: { mode: "inherit", presetId: null },
      reducedMotion: false,
      lowPower: true,
    });
    expect(resolved).toEqual({ active: false, reason: "policy" });
  });
});
