import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    subtitleProviderPause: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    recordingSubtitleAttempt: {
      aggregate: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import { checkDurationBudget, clearPause, getActivePause, pauseProvider } from "../lib/subtitles/providerGate.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getActivePause", () => {
  it("returns null when no pause row exists", async () => {
    vi.mocked(prisma.subtitleProviderPause.findUnique).mockResolvedValue(null as never);
    await expect(getActivePause()).resolves.toBeNull();
  });

  it("returns null once pausedUntil is in the past", async () => {
    vi.mocked(prisma.subtitleProviderPause.findUnique).mockResolvedValue({
      provider: "modal",
      pausedUntil: new Date(Date.now() - 1000),
      lastError: "boom",
      updatedAt: new Date(),
    } as never);
    await expect(getActivePause()).resolves.toBeNull();
  });

  it("returns the pause when pausedUntil is in the future", async () => {
    const pausedUntil = new Date(Date.now() + 60_000);
    vi.mocked(prisma.subtitleProviderPause.findUnique).mockResolvedValue({
      provider: "modal",
      pausedUntil,
      lastError: "billing failure",
      updatedAt: new Date(),
    } as never);
    await expect(getActivePause()).resolves.toEqual({ pausedUntil, lastError: "billing failure" });
  });
});

describe("pauseProvider / clearPause", () => {
  it("upserts a pausedUntil cooldownMs in the future", async () => {
    vi.mocked(prisma.subtitleProviderPause.upsert).mockResolvedValue({} as never);
    const before = Date.now();
    const pausedUntil = await pauseProvider(60_000, "network error");
    expect(pausedUntil.getTime()).toBeGreaterThanOrEqual(before + 60_000);
    expect(prisma.subtitleProviderPause.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { provider: "modal" },
        create: expect.objectContaining({ provider: "modal", lastError: "network error" }),
        update: expect.objectContaining({ lastError: "network error" }),
      }),
    );
  });

  it("clears an active pause", async () => {
    vi.mocked(prisma.subtitleProviderPause.updateMany).mockResolvedValue({ count: 1 } as never);
    await clearPause();
    expect(prisma.subtitleProviderPause.updateMany).toHaveBeenCalledWith({
      where: { provider: "modal", pausedUntil: { not: null } },
      data: { pausedUntil: null, lastError: null },
    });
  });
});

describe("checkDurationBudget", () => {
  it("allows a job that fits under both ceilings", async () => {
    vi.mocked(prisma.recordingSubtitleAttempt.aggregate)
      .mockResolvedValueOnce({ _sum: { inputDurationSeconds: 1000 } } as never)
      .mockResolvedValueOnce({ _sum: { inputDurationSeconds: 5000 } } as never);

    const result = await checkDurationBudget(500, 3600, 18000);
    expect(result).toEqual({
      dailyUsed: 1000,
      monthlyUsed: 5000,
      dailyExceeded: false,
      monthlyExceeded: false,
    });
  });

  it("flags dailyExceeded when today's usage plus this job would cross the daily ceiling", async () => {
    vi.mocked(prisma.recordingSubtitleAttempt.aggregate)
      .mockResolvedValueOnce({ _sum: { inputDurationSeconds: 3500 } } as never)
      .mockResolvedValueOnce({ _sum: { inputDurationSeconds: 3500 } } as never);

    const result = await checkDurationBudget(200, 3600, 18000);
    expect(result.dailyExceeded).toBe(true);
    expect(result.monthlyExceeded).toBe(false);
  });

  it("flags monthlyExceeded independently of the daily ceiling", async () => {
    vi.mocked(prisma.recordingSubtitleAttempt.aggregate)
      .mockResolvedValueOnce({ _sum: { inputDurationSeconds: 100 } } as never)
      .mockResolvedValueOnce({ _sum: { inputDurationSeconds: 17_900 } } as never);

    const result = await checkDurationBudget(200, 3600, 18000);
    expect(result.dailyExceeded).toBe(false);
    expect(result.monthlyExceeded).toBe(true);
  });

  it("treats a null sum (no attempts yet) as zero usage", async () => {
    vi.mocked(prisma.recordingSubtitleAttempt.aggregate)
      .mockResolvedValueOnce({ _sum: { inputDurationSeconds: null } } as never)
      .mockResolvedValueOnce({ _sum: { inputDurationSeconds: null } } as never);

    const result = await checkDurationBudget(900, 3600, 18000);
    expect(result).toEqual({
      dailyUsed: 0,
      monthlyUsed: 0,
      dailyExceeded: false,
      monthlyExceeded: false,
    });
  });
});
