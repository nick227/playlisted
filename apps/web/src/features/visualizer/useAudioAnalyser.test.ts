import { describe, expect, it } from "vitest";

import { ANALYSER_FFT_SIZE } from "./useAudioAnalyser";

describe("useAudioAnalyser", () => {
  it("uses fftSize-length time-domain and half-length frequency buffers", () => {
    expect(ANALYSER_FFT_SIZE).toBe(1024);
    expect(ANALYSER_FFT_SIZE / 2).toBe(512);
  });
});
