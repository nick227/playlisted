import { afterEach, describe, expect, it, vi } from "vitest";

import { getTrafficVisitorId, trafficHeaders } from "./trafficIdentity";

describe("trafficIdentity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a stable ephemeral visitor id when localStorage is full", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      },
    });

    const visitorId = getTrafficVisitorId();

    expect(visitorId).toMatch(/^[a-zA-Z0-9_-]{12,64}$/);
    expect(getTrafficVisitorId()).toBe(visitorId);
    expect(trafficHeaders()["X-Playlisted-Visitor-Id"]).toBe(visitorId);
  });
});