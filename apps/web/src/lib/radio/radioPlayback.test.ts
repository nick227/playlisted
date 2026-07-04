import { afterEach, describe, expect, it, vi } from "vitest";

import { getListenerId } from "./radioPlayback";

describe("radioPlayback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an ephemeral listener id when localStorage is full", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        },
      },
    });
    vi.stubGlobal("crypto", { randomUUID: () => "listener-ephemeral" });

    expect(getListenerId()).toBe("listener-ephemeral");
  });
});
