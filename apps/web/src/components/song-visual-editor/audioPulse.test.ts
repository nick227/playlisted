import { describe, expect, it } from "vitest";

import {
  beatFxForAudioPulse,
  defaultAssetAudioPulse,
  readClipAudioPulse,
} from "./audioPulse";

describe("audioPulse", () => {
  it("defaults asset audio pulse off for video and image", () => {
    expect(defaultAssetAudioPulse("video")).toBe(false);
    expect(defaultAssetAudioPulse("image")).toBe(false);
  });

  it("reads clip pulse from beatFx.enabled", () => {
    expect(readClipAudioPulse({ beatFx: null })).toBe(false);
    expect(readClipAudioPulse({ beatFx: { enabled: false } })).toBe(false);
    expect(
      readClipAudioPulse({
        beatFx: { enabled: true, intensity: "subtle", effects: ["scale"] },
      }),
    ).toBe(true);
  });

  it("builds beatFx payloads for enable and disable", () => {
    expect(beatFxForAudioPulse(false)).toEqual({ enabled: false });
    expect(beatFxForAudioPulse(true)).toEqual({
      enabled: true,
      intensity: "subtle",
      effects: ["scale", "brightness"],
    });
    expect(
      beatFxForAudioPulse(false, {
        enabled: true,
        intensity: "strong",
        effects: ["dropPunch"],
      }),
    ).toEqual({
      enabled: false,
      intensity: "strong",
      effects: ["dropPunch"],
    });
  });
});
