-- Drop unique constraint so the same media asset can appear on a timeline multiple times.
DROP INDEX `SongVisualAttachment_recordingId_mediaAssetId_key` ON `SongVisualAttachment`;
