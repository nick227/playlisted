import { Router } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../lib/requireAuth.js";
import {
  assertRecordingVisualReadAccess,
  assertRecordingVisualWriteAccess,
  listSongVisualAttachments,
  loadOwnedVisualMediaAsset,
  songVisualAttachmentInclude,
} from "../../lib/visualMedia/access.js";
import {
  buildSongVisualMediaResponse,
  mapSongVisualAttachment,
} from "../../lib/visualMedia/mapDto.js";
import { theatrePolicyToPrisma } from "../../lib/visualMedia/types.js";
import {
  formatValidationIssues,
  validateAttachmentBody,
  type AttachmentValidationIssue,
} from "../../lib/visualMedia/validateAttachment.js";
import { sanitizeAtmosphereFxJson, validateAtmosphereFxBody } from "../../lib/visualMedia/atmosphereFx.js";

export const songVisualMediaRouter = Router();

function parseSongId(req: { params: { songId?: string } }) {
  return req.params.songId?.trim() ?? "";
}

function validationErrorResponse(
  res: Parameters<typeof requireAuth>[1],
  issues: AttachmentValidationIssue[],
) {
  return res.status(400).json({
    error: "invalid_attachment",
    message: formatValidationIssues(issues),
    issues,
  });
}

function toJsonValue(
  value: Record<string, unknown> | string[] | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

songVisualMediaRouter.get("/:songId/visual-media", async (req, res, next) => {
  try {
    const songId = parseSongId(req);
    const access = await assertRecordingVisualReadAccess(songId, req);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const attachments = await listSongVisualAttachments(songId);
    res.json(buildSongVisualMediaResponse(songId, attachments, access.recording));
  } catch (error) {
    next(error);
  }
});

songVisualMediaRouter.post("/:songId/visual-media", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const songId = parseSongId(req);
    const access = await assertRecordingVisualWriteAccess(songId, auth.user.id, auth.user.role);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const parsed = validateAttachmentBody(req.body as Record<string, unknown>, "create");
    if (!parsed.ok) {
      return validationErrorResponse(res, parsed.issues);
    }

    const body = parsed.value;
    if (!body.mediaAssetId) {
      return res.status(400).json({
        error: "media_asset_required",
        message: "mediaAssetId is required.",
      });
    }

    const asset = await loadOwnedVisualMediaAsset(body.mediaAssetId, auth.user.id);
    if (!asset) {
      return res.status(404).json({
        error: "media_asset_not_found",
        message: "Visual media asset was not found.",
      });
    }

    const attachment = await prisma.songVisualAttachment.create({
      data: {
        recordingId: songId,
        mediaAssetId: asset.id,
        policy: theatrePolicyToPrisma(body.policy),
        weight: body.weight ?? 1,
        sortOrder: body.order ?? 0,
        label: body.label ?? null,
        enabled: body.enabled ?? true,
        playbackJson: toJsonValue(body.playback),
        rotationJson: toJsonValue(body.rotation),
        beatFxJson: toJsonValue(body.beatFx),
        tagsJson: toJsonValue(body.tags),
      },
      include: songVisualAttachmentInclude,
    });

    res.status(201).json(mapSongVisualAttachment(attachment, songId));
  } catch (error) {
    next(error);
  }
});

songVisualMediaRouter.patch("/:songId/visual-media/atmosphere-fx", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const songId = parseSongId(req);
    const access = await assertRecordingVisualWriteAccess(songId, auth.user.id, auth.user.role);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const body = req.body as { atmosphereFx?: unknown };
    if (!("atmosphereFx" in body)) {
      return res.status(400).json({
        error: "invalid_request",
        message: "atmosphereFx is required.",
      });
    }

    const parsed = validateAtmosphereFxBody(body.atmosphereFx);
    if (!parsed.ok) {
      return res.status(400).json({ error: "invalid_atmosphere_fx", message: parsed.message });
    }

    const updated = await prisma.recording.update({
      where: { id: songId },
      data: {
        atmosphereFxJson: parsed.value === null
          ? Prisma.DbNull
          : (parsed.value as Prisma.InputJsonValue),
      },
      select: { atmosphereFxJson: true },
    });

    res.json({
      songId,
      recordingId: songId,
      atmosphereFx: sanitizeAtmosphereFxJson(updated.atmosphereFxJson),
    });
  } catch (error) {
    next(error);
  }
});

songVisualMediaRouter.patch("/:songId/visual-media/:attachmentId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const songId = parseSongId(req);
    const attachmentId = req.params.attachmentId?.trim() ?? "";
    const access = await assertRecordingVisualWriteAccess(songId, auth.user.id, auth.user.role);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const existing = await prisma.songVisualAttachment.findFirst({
      where: { id: attachmentId, recordingId: songId },
      include: songVisualAttachmentInclude,
    });
    if (!existing) {
      return res.status(404).json({
        error: "attachment_not_found",
        message: "Visual attachment was not found.",
      });
    }

    const parsed = validateAttachmentBody(req.body as Record<string, unknown>, "patch");
    if (!parsed.ok) {
      return validationErrorResponse(res, parsed.issues);
    }

    const body = parsed.value;
    const attachment = await prisma.songVisualAttachment.update({
      where: { id: attachmentId },
      data: {
        ...(body.policy != null ? { policy: theatrePolicyToPrisma(body.policy) } : {}),
        ...(body.weight != null ? { weight: body.weight } : {}),
        ...(body.order != null ? { sortOrder: body.order } : {}),
        ...("label" in body ? { label: body.label ?? null } : {}),
        ...(body.enabled != null ? { enabled: body.enabled } : {}),
        ...("playback" in body ? { playbackJson: toJsonValue(body.playback) } : {}),
        ...("rotation" in body ? { rotationJson: toJsonValue(body.rotation) } : {}),
        ...("beatFx" in body ? { beatFxJson: toJsonValue(body.beatFx) } : {}),
        ...("tags" in body ? { tagsJson: toJsonValue(body.tags) } : {}),
      },
      include: songVisualAttachmentInclude,
    });

    res.json(mapSongVisualAttachment(attachment, songId));
  } catch (error) {
    next(error);
  }
});

songVisualMediaRouter.delete("/:songId/visual-media/:attachmentId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const songId = parseSongId(req);
    const attachmentId = req.params.attachmentId?.trim() ?? "";
    const access = await assertRecordingVisualWriteAccess(songId, auth.user.id, auth.user.role);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const existing = await prisma.songVisualAttachment.findFirst({
      where: { id: attachmentId, recordingId: songId },
    });
    if (!existing) {
      return res.status(404).json({
        error: "attachment_not_found",
        message: "Visual attachment was not found.",
      });
    }

    await prisma.songVisualAttachment.delete({ where: { id: attachmentId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
