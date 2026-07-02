-- Mark all QUEUED and PROCESSING subtitle rows as FAILED.
-- These are orphaned rows created at upload time when no subtitle worker
-- was running; they would otherwise spin in the UI forever.
UPDATE `RecordingSubtitle`
SET
  `status` = 'FAILED',
  `errorMessage` = 'Marked failed on deploy: was never processed (no active subtitle worker).'
WHERE `status` IN ('QUEUED', 'PROCESSING');
