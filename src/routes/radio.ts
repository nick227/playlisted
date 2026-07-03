import { Router, type Request, type Response } from "express";

import { getAuthContextFromRequest } from "../lib/auth.js";
import { normalizeUploadUrl, resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { prisma } from "../lib/prisma.js";
import { radioChatLimiter, radioHeartbeatLimiter } from "../lib/rateLimiter.js";
import { mapSubtitleSummary, subtitleInclude } from "../lib/subtitles/summary.js";
import { mapRecordingSubtitleStyle } from "../lib/subtitles/styleSettings.js";

const DEFAULT_STATION_SLUG = "main";
const LISTENER_TTL_MS = 60_000;
const STATION_EPOCH_MS = Date.UTC(2026, 0, 1);
const MAX_CHAT_MESSAGES = 50;
const MAX_CHAT_MESSAGE_LENGTH = 300;

type ListenerBucket = Map<string, number>;
type RadioRecording = Awaited<ReturnType<typeof getRadioRecordings>>[number];
type ChatMessage = {
  id: string;
  listenerId: string;
  displayName: string;
  avatarUrl: string | null;
  message: string;
  createdAt: string;
};

const listenersByStation = new Map<string, ListenerBucket>();
const chatMessagesByStation = new Map<string, ChatMessage[]>();

export const radioRouter = Router();

async function requireRadioAdmin(req: Request, res: Response) {
  const auth = await getAuthContextFromRequest(req);
  if (!auth) {
    res.status(401).json({ error: "unauthorized", message: "A valid bearer token is required." });
    return null;
  }
  if (auth.user.role !== "ADMIN") {
    res.status(403).json({ error: "forbidden", message: "Admin role required." });
    return null;
  }
  return auth;
}

function getListenerCount(stationSlug = DEFAULT_STATION_SLUG) {
  const now = Date.now();
  const bucket = listenersByStation.get(stationSlug);
  if (!bucket) return 0;

  for (const [listenerId, seenAt] of bucket.entries()) {
    if (now - seenAt > LISTENER_TTL_MS) {
      bucket.delete(listenerId);
    }
  }

  return bucket.size;
}

function touchListener(stationSlug: string, listenerId: string) {
  const bucket = listenersByStation.get(stationSlug) ?? new Map<string, number>();
  bucket.set(listenerId, Date.now());
  listenersByStation.set(stationSlug, bucket);
  return getListenerCount(stationSlug);
}

function getChatMessages(stationSlug = DEFAULT_STATION_SLUG) {
  return chatMessagesByStation.get(stationSlug) ?? [];
}

function addChatMessage(stationSlug: string, message: ChatMessage) {
  const messages = [...getChatMessages(stationSlug), message].slice(-MAX_CHAT_MESSAGES);
  chatMessagesByStation.set(stationSlug, messages);
  return messages;
}

function cleanChatText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function normalizeStationSlug(_value: unknown) {
  return DEFAULT_STATION_SLUG;
}

async function resolveChatAuthor(
  req: Request,
  bodyDisplayName: unknown,
  listenerId: string,
) {
  const auth = await getAuthContextFromRequest(req);
  if (auth) {
    return {
      displayName:
        cleanChatText(auth.user.displayName, 40) ||
        cleanChatText(auth.user.username, 40) ||
        "Listener",
      avatarUrl: auth.user.avatarUrl ?? null,
    };
  }

  const guestName = cleanChatText(bodyDisplayName, 40);
  if (guestName) {
    return { displayName: guestName, avatarUrl: null };
  }

  const id = cleanChatText(listenerId, 120);
  return {
    displayName: id ? `anon-${id.slice(0, 4)}` : "Listener",
    avatarUrl: null,
  };
}

async function getRadioRecordings() {
  return prisma.recording.findMany({
    where: {
      visibility: "PUBLIC",
      status: "PUBLISHED",
      durationSeconds: { gt: 0 },
      publishedPlaylist: {
        visibility: "PUBLIC",
        status: "PUBLISHED",
      },
    },
    include: {
      uploader: true,
      publishedPlaylist: true,
      subtitles: subtitleInclude(),
    },
    orderBy: [{ publishedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}

function mapRecording(recording: RadioRecording) {
  return {
    id: recording.id,
    title: recording.title,
    description: recording.description,
    audioUrl: normalizeUploadUrl(recording.audioUrl) ?? recording.audioUrl,
    audioMimeType: recording.audioMimeType,
    durationSeconds: recording.durationSeconds,
    artworkUrl: resolveRecordingArtworkUrl(recording, recording.publishedPlaylist),
    explicit: recording.explicit,
    ...mapRecordingSubtitleStyle(recording),
    subtitle: mapSubtitleSummary(recording.subtitles, recording.subtitlesDisabled),
    uploader: {
      id: recording.uploader.id,
      username: recording.uploader.username,
      displayName: recording.uploader.displayName,
      avatarUrl: normalizeUploadUrl(recording.uploader.avatarUrl),
    },
    playlist: {
      id: recording.publishedPlaylist.id,
      title: recording.publishedPlaylist.title,
      slug: recording.publishedPlaylist.slug,
    },
  };
}

async function getStationState() {
  const recordings = await getRadioRecordings();
  const nowMs = Date.now();
  const updatedAt = new Date(nowMs).toISOString();

  if (recordings.length === 0) {
    return {
      id: DEFAULT_STATION_SLUG,
      slug: DEFAULT_STATION_SLUG,
      name: "Playlisted Radio",
      status: "OFFLINE",
      listenerCount: getListenerCount(DEFAULT_STATION_SLUG),
      chatMessages: getChatMessages(DEFAULT_STATION_SLUG),
      sourcePlaylist: null,
      nowPlaying: null,
      upNext: [],
      updatedAt,
    };
  }

  const durations = recordings.map((recording) => recording.durationSeconds ?? 0);
  const cycleSeconds = durations.reduce((sum, duration) => sum + duration, 0);
  const cyclePosition = Math.floor((nowMs - STATION_EPOCH_MS) / 1000) % cycleSeconds;

  let elapsedBeforeTrack = 0;
  let currentIndex = 0;

  for (const [index, duration] of durations.entries()) {
    if (cyclePosition < elapsedBeforeTrack + duration) {
      currentIndex = index;
      break;
    }
    elapsedBeforeTrack += duration;
  }

  const current = recordings[currentIndex];
  const elapsedSeconds = cyclePosition - elapsedBeforeTrack;
  const startedAt = new Date(nowMs - elapsedSeconds * 1000).toISOString();
  const upNext = Array.from({ length: Math.min(5, recordings.length - 1) }, (_, offset) => {
    const index = (currentIndex + offset + 1) % recordings.length;
    return mapRecording(recordings[index]);
  });

  return {
    id: DEFAULT_STATION_SLUG,
    slug: DEFAULT_STATION_SLUG,
    name: "Playlisted Radio",
    status: "LIVE",
    listenerCount: getListenerCount(DEFAULT_STATION_SLUG),
    chatMessages: getChatMessages(DEFAULT_STATION_SLUG),
    sourcePlaylist: null,
    nowPlaying: {
      ...mapRecording(current),
      startedAt,
      elapsedSeconds,
    },
    upNext,
    updatedAt,
  };
}

radioRouter.get("/", async (_req, res, next) => {
  try {
    return res.json(await getStationState());
  } catch (error) {
    return next(error);
  }
});

radioRouter.post("/listeners/heartbeat", radioHeartbeatLimiter, async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as { listenerId?: string; station?: string };
    const stationSlug = normalizeStationSlug(body.station);
    const listenerId = body.listenerId?.trim() || crypto.randomUUID();
    const listenerCount = touchListener(stationSlug, listenerId);

    return res.json({
      listenerId,
      station: stationSlug,
      listenerCount,
    });
  } catch (error) {
    return next(error);
  }
});

radioRouter.post("/chat", radioChatLimiter, async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as {
      listenerId?: string;
      displayName?: string;
      message?: string;
      station?: string;
    };
    const stationSlug = normalizeStationSlug(body.station);
    const listenerId = cleanChatText(body.listenerId, 120) || crypto.randomUUID();
    const author = await resolveChatAuthor(req, body.displayName, listenerId);
    const message = cleanChatText(body.message, MAX_CHAT_MESSAGE_LENGTH);

    if (!message) {
      return res.status(400).json({
        error: "invalid_chat_message",
        message: "Chat message cannot be blank.",
      });
    }

    touchListener(stationSlug, listenerId);

    const chatMessage = {
      id: crypto.randomUUID(),
      listenerId,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
      message,
      createdAt: new Date().toISOString(),
    };

    addChatMessage(stationSlug, chatMessage);

    return res.status(201).json(chatMessage);
  } catch (error) {
    return next(error);
  }
});

radioRouter.get("/admin", async (req, res, next) => {
  try {
    if (!(await requireRadioAdmin(req, res))) return;
    return res.json(await getStationState());
  } catch (error) {
    return next(error);
  }
});
