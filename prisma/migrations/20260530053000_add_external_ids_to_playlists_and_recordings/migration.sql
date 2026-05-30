-- Add external identity fields that are present in the Prisma schema but were
-- missing from the initial MySQL migrations.

ALTER TABLE `Playlist`
  ADD COLUMN `externalSource` VARCHAR(100) NULL,
  ADD COLUMN `externalId` VARCHAR(255) NULL;

ALTER TABLE `Recording`
  ADD COLUMN `externalSource` VARCHAR(100) NULL,
  ADD COLUMN `externalId` VARCHAR(255) NULL;

CREATE UNIQUE INDEX `Playlist_ownerId_externalSource_externalId_key`
  ON `Playlist`(`ownerId`, `externalSource`, `externalId`);

CREATE UNIQUE INDEX `Recording_uploaderId_externalSource_externalId_key`
  ON `Recording`(`uploaderId`, `externalSource`, `externalId`);
