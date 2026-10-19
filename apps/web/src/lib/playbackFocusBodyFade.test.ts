import { describe, expect, it } from "vitest";
import { getPlaybackFocusBodyFadeConfig } from "./playbackFocusBodyFade";

const radioOnStage = { radioStageVisible: true, radioPlaying: true };

describe("page inactivity policy", () => {
  it("fades home after 5 seconds while radio plays with its section on screen", () => {
    expect(getPlaybackFocusBodyFadeConfig("/", radioOnStage)).toEqual({ disabled: false, delayMs: 5000 });
  });

  it("keeps home visible while radio is loaded but not playing", () => {
    expect(getPlaybackFocusBodyFadeConfig("/", { ...radioOnStage, radioPlaying: false }).disabled).toBe(true);
  });

  it("keeps home visible once the radio section is scrolled away", () => {
    expect(getPlaybackFocusBodyFadeConfig("/", { ...radioOnStage, radioStageVisible: false }).disabled).toBe(true);
  });

  it.each([
    "/search", "/@artist", "/@artist/album/song",
    "/settings", "/admin/theatre", "/chat", "/studio/collections/123/edit",
    "/login", "/register", "/future-page", "/radio",
  ])("keeps %s visible", (path) => {
    expect(getPlaybackFocusBodyFadeConfig(path, radioOnStage).disabled).toBe(true);
  });
});
