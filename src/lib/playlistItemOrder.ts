import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma.js";

const POSITION_TEMP_BASE = 1_000_000;

export type PlaylistItemOrderError = {
  status: 400;
  error: "invalid_recording_ids";
  message: string;
};

type Tx = Prisma.TransactionClient;

async function bumpItemsToTempPositions(tx: Tx, itemIds: string[]): Promise<void> {
  for (let i = 0; i < itemIds.length; i++) {
    await tx.playlistItem.update({
      where: { id: itemIds[i] },
      data: { position: POSITION_TEMP_BASE + i },
    });
  }
}

async function applyFinalPositions(
  tx: Tx,
  itemIdByRecordingId: Map<string, string>,
  recordingIds: string[],
): Promise<void> {
  for (let index = 0; index < recordingIds.length; index++) {
    const itemId = itemIdByRecordingId.get(recordingIds[index])!;
    await tx.playlistItem.update({
      where: { id: itemId },
      data: { position: index + 1 },
    });
  }
}

/** Reassign positions 1..n without violating @@unique([playlistId, position]). */
export async function applyPlaylistItemOrderByRecordingIds(
  playlistId: string,
  recordingIds: string[],
): Promise<PlaylistItemOrderError | void> {
  if (!Array.isArray(recordingIds) || recordingIds.length === 0) {
    return {
      status: 400,
      error: "invalid_recording_ids",
      message: "recordingIds must be a non-empty array.",
    };
  }

  const seen = new Set<string>();
  for (const id of recordingIds) {
    if (typeof id !== "string" || !id) {
      return {
        status: 400,
        error: "invalid_recording_ids",
        message: "Each recording id must be a non-empty string.",
      };
    }
    if (seen.has(id)) {
      return {
        status: 400,
        error: "invalid_recording_ids",
        message: "recordingIds must not contain duplicates.",
      };
    }
    seen.add(id);
  }

  const items = await prisma.playlistItem.findMany({
    where: { playlistId },
    select: { id: true, recordingId: true },
  });

  if (recordingIds.length !== items.length) {
    return {
      status: 400,
      error: "invalid_recording_ids",
      message: "recordingIds must include every track in the playlist exactly once.",
    };
  }

  const itemIdByRecordingId = new Map(items.map((row) => [row.recordingId, row.id]));
  for (const recordingId of recordingIds) {
    if (!itemIdByRecordingId.has(recordingId)) {
      return {
        status: 400,
        error: "invalid_recording_ids",
        message: `Recording ${recordingId} is not in this playlist.`,
      };
    }
  }

  const itemIds = items.map((row) => row.id);

  await prisma.$transaction(async (tx) => {
    await bumpItemsToTempPositions(tx, itemIds);
    await applyFinalPositions(tx, itemIdByRecordingId, recordingIds);
  });
}

/** Compact positions to 1..n in current ascending position order. */
export async function compactPlaylistItemPositions(playlistId: string): Promise<void> {
  const items = await prisma.playlistItem.findMany({
    where: { playlistId },
    orderBy: { position: "asc" },
    select: { recordingId: true },
  });

  if (items.length === 0) return;

  await applyPlaylistItemOrderByRecordingIds(
    playlistId,
    items.map((row) => row.recordingId),
  );
}
