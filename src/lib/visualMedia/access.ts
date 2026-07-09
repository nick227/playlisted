import type { Prisma } from "@prisma/client";

import { prisma } from "../prisma.js";
import { canViewerAccessRecording } from "../publicRecordingFilter.js";
import { getAuthContextFromRequest } from "../auth.js";
import type { Request } from "express";

export async function loadRecordingForVisualAccess(recordingId: string) {
  return prisma.recording.findUnique({
    where: { id: recordingId },
    select: {
      id: true,
      uploaderId: true,
      visibility: true,
      status: true,
      atmosphereFxJson: true,
    },
  });
}

export async function assertRecordingVisualReadAccess(
  recordingId: string,
  req: Request,
) {
  const auth = await getAuthContextFromRequest(req);
  const recording = await loadRecordingForVisualAccess(recordingId);
  if (!recording) {
    return { ok: false as const, status: 404, error: "recording_not_found", message: "Recording not found." };
  }

  if (!canViewerAccessRecording(recording, {
    userId: auth?.user.id ?? null,
    role: auth?.user.role ?? null,
  }, recording.uploaderId)) {
    return { ok: false as const, status: 403, error: "forbidden", message: "You cannot view visuals for this recording." };
  }

  return { ok: true as const, recording };
}

export async function assertRecordingVisualWriteAccess(
  recordingId: string,
  userId: string,
  role: string,
) {
  const recording = await loadRecordingForVisualAccess(recordingId);
  if (!recording) {
    return { ok: false as const, status: 404, error: "recording_not_found", message: "Recording not found." };
  }

  if (recording.uploaderId !== userId && role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "forbidden", message: "You cannot edit visuals for this recording." };
  }

  return { ok: true as const, recording };
}

export async function loadOwnedVisualMediaAsset(assetId: string, ownerId: string) {
  return prisma.visualMediaAsset.findFirst({
    where: { id: assetId, ownerId },
  });
}

export const songVisualAttachmentInclude = {
  mediaAsset: true,
} satisfies Prisma.SongVisualAttachmentInclude;

export async function listSongVisualAttachments(recordingId: string) {
  return prisma.songVisualAttachment.findMany({
    where: { recordingId },
    include: songVisualAttachmentInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}
