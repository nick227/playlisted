-- CreateTable
CREATE TABLE `RecordingSubtitle` (
    `id` VARCHAR(191) NOT NULL,
    `recordingId` VARCHAR(191) NOT NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'READY', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `language` VARCHAR(16) NULL,
    `segments` JSON NULL,
    `vttText` LONGTEXT NULL,
    `errorMessage` TEXT NULL,
    `generatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RecordingSubtitle_recordingId_key`(`recordingId`),
    INDEX `RecordingSubtitle_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `RecordingSubtitle_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecordingSubtitleAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `subtitleId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `durationMs` INTEGER UNSIGNED NULL,
    `costCents` INTEGER UNSIGNED NULL,
    `providerJobId` VARCHAR(191) NULL,
    `error` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    INDEX `RecordingSubtitleAttempt_subtitleId_idx`(`subtitleId`),
    INDEX `RecordingSubtitleAttempt_provider_startedAt_idx`(`provider`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RecordingSubtitle` ADD CONSTRAINT `RecordingSubtitle_recordingId_fkey` FOREIGN KEY (`recordingId`) REFERENCES `Recording`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordingSubtitleAttempt` ADD CONSTRAINT `RecordingSubtitleAttempt_subtitleId_fkey` FOREIGN KEY (`subtitleId`) REFERENCES `RecordingSubtitle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
