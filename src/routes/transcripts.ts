import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../lib/requireAuth.js";
import { prisma } from "../lib/prisma.js";
import { getAuthContextFromRequest } from "../lib/auth.js";
import { canViewerAccessRecording } from "../lib/publicRecordingFilter.js";
import { srtToSegments, vttToSrt } from "../lib/subtitles/srtUtils.js";
import { segmentsToVtt } from "../lib/subtitles/vtt.js";
import { Prisma } from "@prisma/client";
import { canViewerAccessPlaylist } from "../lib/publicPlaylistFilter.js";
import { getSubtitleProvider, runSubtitleProvider } from "../lib/subtitles/providers/index.js";
import { checkLocalPythonProvider } from "../lib/subtitles/providers/localPythonProvider.js";
const upload = multer({ storage: multer.memoryStorage() });

export const transcriptsRouter = Router({ mergeParams: true });

transcriptsRouter.get("/", async (req, res, next) => {
  try {
    const recordingId = (req.params as any).recordingId;
    
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: { uploader: { select: { id: true } }, publishedPlaylist: true },
    });
    
    if (!recording) return res.status(404).json({ error: "not_found", message: "Recording not found" });

    const auth = await getAuthContextFromRequest(req);
    const viewer = { userId: auth?.user.id, role: auth?.user.role };
    if (!canViewerAccessRecording(recording, viewer, recording.uploaderId) || 
        !canViewerAccessPlaylist(recording.publishedPlaylist, viewer, recording.publishedPlaylist.ownerId)) {
      return res.status(404).json({ error: "not_found", message: "Recording not found" });
    }

    const transcripts = await prisma.recordingSubtitle.findMany({
      where: { recordingId },
      orderBy: { createdAt: "desc" },
    });

    if (transcripts.length > 0 && !transcripts.some((t) => t.isActive)) {
      transcripts[0].isActive = true;
    }

    return res.json(transcripts.map(t => ({
      id: t.id,
      recordingId: t.recordingId,
      source: t.source,
      status: t.status,
      language: t.language,
      vttText: t.vttText,
      srtText: t.vttText ? vttToSrt(t.vttText) : null,
      errorMessage: t.errorMessage,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      generatedAt: t.generatedAt ? t.generatedAt.toISOString() : null,
    })));
  } catch (error) {
    next(error);
  }
});

transcriptsRouter.patch("/:transcriptId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const recordingId = (req.params as any).recordingId;
    const transcriptId = (req.params as any).transcriptId;
    const { isActive, srtText } = req.body;

    const transcript = await prisma.recordingSubtitle.findUnique({
      where: { id: transcriptId },
      include: { recording: true },
    });

    if (!transcript || transcript.recordingId !== recordingId) {
      return res.status(404).json({ error: "not_found", message: "Transcript not found" });
    }

    if (transcript.recording.uploaderId !== auth.user.id && auth.user.role !== "ADMIN") {
      return res.status(401).json({ error: "unauthorized", message: "Not authorized" });
    }

    // Process updates
    const updates: any = {};
    
    if (typeof srtText === "string") {
      const segments = srtToSegments(srtText);
      updates.vttText = segmentsToVtt(segments);
      updates.segments = segments as any;
    }
    
    if (isActive === true) {
      // Deactivate all others
      await prisma.recordingSubtitle.updateMany({
        where: { recordingId, id: { not: transcriptId } },
        data: { isActive: false },
      });
      updates.isActive = true;
    } else if (isActive === false) {
      updates.isActive = false;
    }

    const updated = await prisma.recordingSubtitle.update({
      where: { id: transcriptId },
      data: updates,
    });

    return res.json({
      id: updated.id,
      recordingId: updated.recordingId,
      source: updated.source,
      status: updated.status,
      language: updated.language,
      vttText: updated.vttText,
      srtText: updated.vttText ? vttToSrt(updated.vttText) : null,
      errorMessage: updated.errorMessage,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      generatedAt: updated.generatedAt ? updated.generatedAt.toISOString() : null,
    });
  } catch (error) {
    next(error);
  }
});

transcriptsRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const recordingId = (req.params as any).recordingId;
    
    const recording = await prisma.recording.findUnique({ where: { id: recordingId } });
    if (!recording) return res.status(404).json({ error: "not_found", message: "Recording not found" });
    if (recording.uploaderId !== auth.user.id && auth.user.role !== "ADMIN") {
      return res.status(401).json({ error: "unauthorized", message: "Not authorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "bad_request", message: "No file uploaded" });
    }

    const fileContent = req.file.buffer.toString("utf-8");
    let vttText = "";
    let segments: any[] = [];

    if (fileContent.includes("WEBVTT")) {
      vttText = fileContent;
      segments = srtToSegments(vttToSrt(fileContent));
    } else {
      // Assuming SRT
      segments = srtToSegments(fileContent);
      vttText = segmentsToVtt(segments);
    }

    // Set other transcripts to inactive
    await prisma.recordingSubtitle.updateMany({
      where: { recordingId },
      data: { isActive: false },
    });

    const transcript = await prisma.recordingSubtitle.create({
      data: {
        recordingId,
        source: "UPLOAD",
        status: "READY",
        isActive: true,
        vttText,
        segments: segments as any,
        generatedAt: new Date(),
      },
    });

    return res.json({
      id: transcript.id,
      recordingId: transcript.recordingId,
      source: transcript.source,
      status: transcript.status,
      language: transcript.language,
      vttText: transcript.vttText,
      srtText: transcript.vttText ? vttToSrt(transcript.vttText) : null,
      errorMessage: transcript.errorMessage,
      isActive: transcript.isActive,
      createdAt: transcript.createdAt.toISOString(),
      generatedAt: transcript.generatedAt ? transcript.generatedAt.toISOString() : null,
    });
  } catch (error) {
    next(error);
  }
});

transcriptsRouter.post("/generate", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const recordingId = (req.params as any).recordingId;
    const { provider } = req.body;
    
    const recording = await prisma.recording.findUnique({ where: { id: recordingId } });
    if (!recording) return res.status(404).json({ error: "not_found", message: "Recording not found" });
    if (recording.uploaderId !== auth.user.id && auth.user.role !== "ADMIN") {
      return res.status(401).json({ error: "unauthorized", message: "Not authorized" });
    }

    if (process.env.SUBTITLES_ENABLED === "false" || getSubtitleProvider() === "disabled") {
      return res.status(503).json({ error: "service_unavailable", message: "Subtitle generation is currently disabled." });
    }

    if (recording.durationSeconds) {
      const maxAudioSeconds = Number(process.env.SUBTITLES_MAX_AUDIO_SECONDS ?? 900);
      if (recording.durationSeconds > maxAudioSeconds) {
        return res.status(400).json({
          error: "bad_request",
          message: `Audio duration ${Math.ceil(recording.durationSeconds)}s exceeds subtitle limit ${maxAudioSeconds}s.`,
        });
      }
    }
    
    const source = provider === "whisper" ? "WHISPER" : "MODAL";
    const resolvedProvider = source === "WHISPER" ? "whisper" : getSubtitleProvider();

    if (resolvedProvider === "local-python") {
      try {
        checkLocalPythonProvider();
      } catch (err: any) {
        return res.status(503).json({
          error: "service_unavailable",
          message: err.message || "Local python provider is not configured properly.",
        });
      }
    }

    // Set other transcripts to inactive
    await prisma.recordingSubtitle.updateMany({
      where: { recordingId },
      data: { isActive: false },
    });

    const transcript = await prisma.recordingSubtitle.create({
      data: {
        recordingId,
        source,
        status: "QUEUED",
        isActive: true,
      },
    });

    return res.json({
      id: transcript.id,
      recordingId: transcript.recordingId,
      source: transcript.source,
      status: transcript.status,
      language: transcript.language,
      vttText: transcript.vttText,
      srtText: transcript.vttText ? vttToSrt(transcript.vttText) : null,
      errorMessage: transcript.errorMessage,
      isActive: transcript.isActive,
      createdAt: transcript.createdAt.toISOString(),
      generatedAt: transcript.generatedAt ? transcript.generatedAt.toISOString() : null,
    });
  } catch (error) {
    next(error);
  }
});
