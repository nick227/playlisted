import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn().mockResolvedValue(Buffer.from("fake-audio")),
  },
}));

import { ModalProviderCallError, runModalProvider } from "../lib/subtitles/providers/modalProvider.js";

const ORIGINAL_ENV = { ...process.env };

function mockFetchOnce(init: { ok: boolean; status?: number; statusText?: string; body?: unknown; text?: string }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: init.ok,
      status: init.status ?? (init.ok ? 200 : 500),
      statusText: init.statusText ?? "",
      text: async () => init.text ?? "",
      json: async () => init.body ?? {},
    }),
  );
}

beforeEach(() => {
  process.env.SUBTITLES_PROVIDER = "modal";
  process.env.MODAL_SUBTITLES_URL = "https://example.modal.run";
  process.env.MODAL_SUBTITLES_TOKEN = "test-token";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const input = { subtitleId: "sub-1", recordingId: "rec-1", audioPath: "/tmp/audio.mp3", durationSeconds: 60 };

describe("runModalProvider — success", () => {
  it("returns parsed segments on a 200 response", async () => {
    mockFetchOnce({
      ok: true,
      body: { modelName: "small", language: "en", segments: [{ start: 0, end: 1, text: "hi" }] },
    });
    const result = await runModalProvider(input);
    expect(result.segments).toEqual([{ start: 0, end: 1, text: "hi" }]);
    expect(result.language).toBe("en");
  });
});

describe("runModalProvider — content failures (should NOT pause the provider)", () => {
  it.each([400, 413, 422])("throws a plain Error, not ModalProviderCallError, on %d", async (status) => {
    mockFetchOnce({ ok: false, status, text: "bad request" });
    try {
      await runModalProvider(input);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(ModalProviderCallError);
    }
  });

  it("throws a plain Error when the response has no segments array", async () => {
    mockFetchOnce({ ok: true, body: { modelName: "small" } });
    try {
      await runModalProvider(input);
      expect.unreachable();
    } catch (error) {
      expect(error).not.toBeInstanceOf(ModalProviderCallError);
    }
  });
});

describe("runModalProvider — provider-level failures (should pause the provider)", () => {
  it.each([401, 402, 429, 500, 503])("throws ModalProviderCallError on %d", async (status) => {
    mockFetchOnce({ ok: false, status, text: "provider unhappy" });
    await expect(runModalProvider(input)).rejects.toBeInstanceOf(ModalProviderCallError);
  });

  it("throws ModalProviderCallError on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(runModalProvider(input)).rejects.toBeInstanceOf(ModalProviderCallError);
  });

  it("throws ModalProviderCallError when required config is missing", async () => {
    delete process.env.MODAL_SUBTITLES_TOKEN;
    await expect(runModalProvider(input)).rejects.toBeInstanceOf(ModalProviderCallError);
  });

  it("throws ModalProviderCallError when SUBTITLES_PROVIDER is not modal", async () => {
    process.env.SUBTITLES_PROVIDER = "disabled";
    await expect(runModalProvider(input)).rejects.toBeInstanceOf(ModalProviderCallError);
  });
});
