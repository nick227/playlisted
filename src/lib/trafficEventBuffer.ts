import { prisma } from "./prisma.js";

export type BufferedTrafficEvent = {
  eventType: string;
  visitorId: string | null;
  sessionTokenHash: string | null;
  path: string;
  method: string | null;
  status: number | null;
  latencyMs: number | null;
  ipHash: string | null;
  userAgent: string | null;
  referrer: string | null;
  isBot: boolean;
  botReason: string | null;
  bytesSent: bigint | null;
  createdAt: Date;
};

const MAX_BUFFER_SIZE = Math.max(100, Number(process.env.TRAFFIC_BUFFER_MAX ?? 2_000));
const FLUSH_BATCH_SIZE = Math.max(25, Number(process.env.TRAFFIC_FLUSH_BATCH_SIZE ?? 250));
const FLUSH_INTERVAL_MS = Math.max(1_000, Number(process.env.TRAFFIC_FLUSH_INTERVAL_MS ?? 15_000));

let buffer: BufferedTrafficEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let flushInFlight = false;
let droppedEvents = 0;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushTrafficEvents();
  }, FLUSH_INTERVAL_MS);
  flushTimer.unref?.();
}

function takeBatch() {
  if (buffer.length <= FLUSH_BATCH_SIZE) {
    const batch = buffer;
    buffer = [];
    return batch;
  }

  const batch = buffer.slice(0, FLUSH_BATCH_SIZE);
  buffer = buffer.slice(FLUSH_BATCH_SIZE);
  return batch;
}

async function resolveSessionMap(events: BufferedTrafficEvent[]) {
  const tokenHashes = [...new Set(events.map((event) => event.sessionTokenHash).filter((value): value is string => Boolean(value)))];
  if (tokenHashes.length === 0) return new Map<string, { sessionId: string; userId: string }>();

  const sessions = await prisma.session.findMany({
    where: { tokenHash: { in: tokenHashes } },
    select: { id: true, userId: true, tokenHash: true },
  });

  return new Map(sessions.map((session) => [session.tokenHash, { sessionId: session.id, userId: session.userId }]));
}

export function enqueueTrafficEvent(event: BufferedTrafficEvent) {
  if (buffer.length >= MAX_BUFFER_SIZE) {
    buffer.shift();
    droppedEvents += 1;
  }

  buffer.push(event);

  if (buffer.length >= FLUSH_BATCH_SIZE) {
    void flushTrafficEvents();
    return;
  }

  scheduleFlush();
}

export async function flushTrafficEvents() {
  if (flushInFlight || buffer.length === 0) {
    if (buffer.length > 0) scheduleFlush();
    return;
  }

  flushInFlight = true;
  const batch = takeBatch();

  try {
    const sessionMap = await resolveSessionMap(batch);
    await prisma.trafficEvent.createMany({
      data: batch.map((event) => {
        const session = event.sessionTokenHash ? sessionMap.get(event.sessionTokenHash) : null;
        return {
          eventType: event.eventType,
          visitorId: event.visitorId,
          userId: session?.userId ?? null,
          sessionId: session?.sessionId ?? null,
          path: event.path,
          method: event.method,
          status: event.status,
          latencyMs: event.latencyMs,
          ipHash: event.ipHash,
          userAgent: event.userAgent,
          referrer: event.referrer,
          isBot: event.isBot,
          botReason: event.botReason,
          bytesSent: event.bytesSent,
          createdAt: event.createdAt,
        };
      }),
    });
  } catch (error) {
    const room = Math.max(0, MAX_BUFFER_SIZE - buffer.length);
    buffer = [...batch.slice(Math.max(0, batch.length - room)), ...buffer];
    console.error("Failed to flush traffic events", error);
  } finally {
    flushInFlight = false;
    if (buffer.length > 0) scheduleFlush();
    if (droppedEvents > 0) {
      console.warn(`Dropped ${droppedEvents} traffic events because the in-memory buffer was full.`);
      droppedEvents = 0;
    }
  }
}
