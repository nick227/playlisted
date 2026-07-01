ALTER TABLE `RecordingSubtitle`
  ADD COLUMN `source` ENUM('WHISPER', 'MODAL', 'UPLOAD', 'MANUAL') NOT NULL DEFAULT 'MODAL',
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT false;

UPDATE `RecordingSubtitle`
SET `isActive` = true;

CREATE INDEX `RecordingSubtitle_recordingId_idx` ON `RecordingSubtitle`(`recordingId`);

ALTER TABLE `RecordingSubtitle`
  DROP INDEX `RecordingSubtitle_recordingId_key`;
