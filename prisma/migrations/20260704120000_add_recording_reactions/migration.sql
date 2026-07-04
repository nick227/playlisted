CREATE TABLE `RecordingReaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `recordingId` VARCHAR(191) NOT NULL,
    `kind` ENUM('LOVE', 'FIRE', 'SPARKLE', 'THUMBS') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RecordingReaction_recordingId_kind_idx`(`recordingId`, `kind`),
    UNIQUE INDEX `RecordingReaction_userId_recordingId_kind_key`(`userId`, `recordingId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RecordingReaction` ADD CONSTRAINT `RecordingReaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RecordingReaction` ADD CONSTRAINT `RecordingReaction_recordingId_fkey` FOREIGN KEY (`recordingId`) REFERENCES `Recording`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
