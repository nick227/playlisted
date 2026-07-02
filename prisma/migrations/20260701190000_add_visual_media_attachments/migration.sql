-- CreateTable
CREATE TABLE `VisualMediaAsset` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `mediaType` ENUM('IMAGE', 'VIDEO') NOT NULL,
    `storageKey` VARCHAR(512) NULL,
    `url` VARCHAR(2048) NOT NULL,
    `thumbnailUrl` VARCHAR(2048) NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER UNSIGNED NOT NULL,
    `durationMs` INTEGER UNSIGNED NULL,
    `width` INTEGER UNSIGNED NULL,
    `height` INTEGER UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VisualMediaAsset_ownerId_createdAt_idx`(`ownerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SongVisualAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `recordingId` VARCHAR(191) NOT NULL,
    `mediaAssetId` VARCHAR(191) NOT NULL,
    `policy` ENUM('PREFER_ATTACHED', 'ATTACHED_ONLY', 'MIX_ATTACHED_AND_DEFAULT') NOT NULL DEFAULT 'PREFER_ATTACHED',
    `weight` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `sortOrder` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `label` VARCHAR(191) NULL,
    `playbackJson` JSON NULL,
    `rotationJson` JSON NULL,
    `beatFxJson` JSON NULL,
    `tagsJson` JSON NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SongVisualAttachment_recordingId_enabled_sortOrder_idx`(`recordingId`, `enabled`, `sortOrder`),
    INDEX `SongVisualAttachment_mediaAssetId_idx`(`mediaAssetId`),
    UNIQUE INDEX `SongVisualAttachment_recordingId_mediaAssetId_key`(`recordingId`, `mediaAssetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VisualMediaAsset` ADD CONSTRAINT `VisualMediaAsset_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongVisualAttachment` ADD CONSTRAINT `SongVisualAttachment_recordingId_fkey` FOREIGN KEY (`recordingId`) REFERENCES `Recording`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongVisualAttachment` ADD CONSTRAINT `SongVisualAttachment_mediaAssetId_fkey` FOREIGN KEY (`mediaAssetId`) REFERENCES `VisualMediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
