import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/requireAuth.js";
import {
  assertRecordingVisualReadAccess,
  assertRecordingVisualWriteAccess,
  listSongVisualAttachments,
  loadOwnedVisualMediaAsset,
  songVisualAttachmentInclude,
} from "../lib/visualMedia/access.js";
import {
  buildSongVisualMediaResponse,
  mapSongVisualAttachment,
} from "../lib/visualMedia/mapDto.js";
import {
  theatrePolicyToPrisma,
  type TheatreSongVisualPolicy,
} from "../lib/visualMedia/types.js";

export const songVisualMediaRouter = Router();

function parseSongId(req: { params: { songId?: string } }) {
  return req.params.songId?.trim() ?? "";
}

function parseAttachmentBody(body: Record<string, unknown>) {
  const mediaAssetId = typeof body.mediaAssetId === "string" ? body.mediaAssetId.trim() : "";
  const policy = typeof body.policy === "string" ? body.policy as TheatreSongVisualPolicy : undefined;
  const weight = typeof body.weight === "number" && Number.isFinite(body.weight) ? Math.max(1, Math.round(body.weight)) : 1;
  const order = typeof body.order === "number" && Number.isFinite(body.order) ? Math.max(0, Math.round(body.order)) : 0;
  const label = typeof body.label === "string" ? body.label.trim() : undefined;
  const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
  const playback = body.playback && typeof body.playback === "object" ? body.playback : undefined;
  const rotation = body.rotation && typeof body.rotation === "object" ? body.rotation : undefined;
  const beatFx = body.beatFx && typeof body.beatFx === "object" ? body.beatFx : undefined;
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : undefined;

  return {
    mediaAssetId,
    policy,
    weight,
    order,
    label,
    enabled,
    playback,
    rotation,
    beatFx,
    tags,
  };
}

songVisualMediaRouter.get("/:songId/visual-media", async (req, res, next) => {
  try {
    const songId = parseSongId(req);
    const access = await assertRecordingVisualReadAccess(songId, req);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const attachments = await listSongVisualAttachments(songId);
    res.json(buildSongVisualMediaResponse(songId, attachments));
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

    const body = parseAttachmentBody(req.body as Record<string, unknown>);
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
        weight: body.weight,
        sortOrder: body.order,
        label: body.label || null,
        enabled: body.enabled,
        playbackJson: body.playback,
        rotationJson: body.rotation,
        beatFxJson: body.beatFx,
        tagsJson: body.tags,
      },
      include: songVisualAttachmentInclude,
    });

    res.status(201).json(mapSongVisualAttachment(attachment, songId));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return res.status(409).json({
        error: "attachment_exists",
        message: "This media asset is already attached to the song.",
      });
    }
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

    const body = parseAttachmentBody(req.body as Record<string, unknown>);
    const attachment = await prisma.songVisualAttachment.update({
      where: { id: attachmentId },
      data: {
        ...(body.policy ? { policy: theatrePolicyToPrisma(body.policy) } : {}),
        ...(req.body && "weight" in (req.body as object) ? { weight: body.weight } : {}),
        ...(req.body && "order" in (req.body as object) ? { sortOrder: body.order } : {}),
        ...(req.body && "label" in (req.body as object) ? { label: body.label || null } : {}),
        ...(req.body && "enabled" in (req.body as object) ? { enabled: body.enabled } : {}),
        ...(req.body && "playback" in (req.body as object) ? { playbackJson: body.playback ?? null } : {}),
        ...(req.body && "rotation" in (req.body as object) ? { rotationJson: body.rotation ?? null } : {}),
        ...(req.body && "beatFx" in (req.body as object) ? { beatFxJson: body.beatFx ?? null } : {}),
        ...(req.body && "tags" in (req.body as object) ? { tagsJson: body.tags ?? null } : {}),
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
