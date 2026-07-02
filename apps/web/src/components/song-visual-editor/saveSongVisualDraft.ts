import type { QueryClient } from "@tanstack/react-query";

import {
  attachSongVisualMedia,
  detachSongVisualMedia,
  fetchSongVisualAttachments,
  updateSongVisualAttachment,
  type SongVisualAttachmentRecord,
  type SongVisualMediaRecord,
} from "@/lib/visualMediaApi";
import type { SongVisualPolicy } from "@/theatre/media/types";
import { clearRemoteTrackVisualMedia } from "@/theatre/media/resolveTrackVisualMedia";

import { attachmentsListEqual, isDraftAttachmentId } from "./draftSongVisualAttachments";
import { songVisualQueryKey } from "./hooks/optimisticSongVisualCache";

type SaveSongVisualDraftArgs = {
  recordingId: string;
  accessToken: string;
  queryClient: QueryClient;
  draftAttachments: SongVisualAttachmentRecord[];
  draftPolicy: SongVisualPolicy;
  serverData: SongVisualMediaRecord;
};

export async function saveSongVisualDraft({
  recordingId,
  accessToken,
  queryClient,
  draftAttachments,
  draftPolicy,
  serverData,
}: SaveSongVisualDraftArgs) {
  const serverAttachments = serverData.attachments;
  const serverById = new Map(serverAttachments.map((attachment) => [attachment.id, attachment]));
  const draftById = new Map(draftAttachments.map((attachment) => [attachment.id, attachment]));

  const removed = serverAttachments.filter((attachment) => !draftById.has(attachment.id));
  const created = draftAttachments.filter((attachment) => isDraftAttachmentId(attachment.id));
  const updated = draftAttachments.filter((attachment) => {
    if (isDraftAttachmentId(attachment.id)) return false;
    const serverAttachment = serverById.get(attachment.id);
    if (!serverAttachment) return false;
    return !attachmentsListEqual([attachment], [serverAttachment]);
  });

  for (const attachment of removed) {
    await detachSongVisualMedia(recordingId, attachment.id, accessToken);
  }

  for (const attachment of created) {
    await attachSongVisualMedia(recordingId, accessToken, {
      mediaAssetId: attachment.mediaAssetId,
      policy: draftPolicy === "defaultOnly" ? "preferAttached" : draftPolicy,
      order: attachment.order,
      label: attachment.label ?? attachment.mediaAsset.originalName,
      playback: attachment.playback ?? undefined,
      beatFx: attachment.beatFx ?? undefined,
      tags: attachment.tags ?? undefined,
    });
  }

  const policyChanged = serverData.policy !== draftPolicy;
  const enabledDraft = draftAttachments.filter((attachment) => attachment.enabled);

  for (const attachment of updated) {
    await updateSongVisualAttachment(recordingId, attachment.id, accessToken, {
      order: attachment.order,
      enabled: attachment.enabled,
      beatFx: attachment.beatFx,
      playback: attachment.playback,
      tags: attachment.tags,
      ...(policyChanged ? { policy: draftPolicy } : {}),
    });
  }

  if (policyChanged) {
    const alreadyUpdated = new Set(updated.map((attachment) => attachment.id));
    await Promise.all(
      enabledDraft
        .filter((attachment) => !isDraftAttachmentId(attachment.id) && !alreadyUpdated.has(attachment.id))
        .map((attachment) =>
          updateSongVisualAttachment(recordingId, attachment.id, accessToken, { policy: draftPolicy }),
        ),
    );
  }

  const fresh = await fetchSongVisualAttachments(recordingId, accessToken);
  queryClient.setQueryData(songVisualQueryKey(recordingId), fresh);
  clearRemoteTrackVisualMedia(recordingId);

  return fresh;
}
