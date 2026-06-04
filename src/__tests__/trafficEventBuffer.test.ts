import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
    },
    trafficEvent: {
      createMany: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import { enqueueTrafficEvent, flushTrafficEvents, type BufferedTrafficEvent } from "../lib/trafficEventBuffer.js";

const createdAt = new Date("2026-06-04T12:00:00.000Z");

function event(overrides: Partial<BufferedTrafficEvent> = {}): BufferedTrafficEvent {
  return {
    eventType: "REQUEST",
    visitorId: "visitor-1",
    sessionTokenHash: null,
    path: "/api/v1/radio",
    method: "GET",
    status: 200,
    latencyMs: 42,
    ipHash: "ip-hash",
    userAgent: "vitest",
    referrer: null,
    isBot: false,
    botReason: null,
    bytesSent: 123n,
    createdAt,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.session.findMany).mockResolvedValue([]);
  vi.mocked(prisma.trafficEvent.createMany).mockResolvedValue({ count: 0 });
});

describe("traffic event buffer", () => {
  it("buffers events and flushes them in one createMany call", async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([
      { id: "session-1", userId: "user-1", tokenHash: "token-hash-1" },
    ] as never);

    enqueueTrafficEvent(event({ sessionTokenHash: "token-hash-1" }));
    enqueueTrafficEvent(event({ visitorId: "visitor-2", path: "/@/nick", sessionTokenHash: null }));

    expect(prisma.trafficEvent.createMany).not.toHaveBeenCalled();

    await flushTrafficEvents();

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: { tokenHash: { in: ["token-hash-1"] } },
      select: { id: true, userId: true, tokenHash: true },
    });
    expect(prisma.trafficEvent.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.trafficEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          visitorId: "visitor-1",
          userId: "user-1",
          sessionId: "session-1",
          path: "/api/v1/radio",
          bytesSent: 123n,
          createdAt,
        }),
        expect.objectContaining({
          visitorId: "visitor-2",
          userId: null,
          sessionId: null,
          path: "/@/nick",
        }),
      ],
    });
  });

  it("flushes anonymous events without querying sessions", async () => {
    enqueueTrafficEvent(event({ visitorId: "guest-only", sessionTokenHash: null }));

    await flushTrafficEvents();

    expect(prisma.session.findMany).not.toHaveBeenCalled();
    expect(prisma.trafficEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          visitorId: "guest-only",
          userId: null,
          sessionId: null,
        }),
      ],
    });
  });
});
