-- CreateTable
CREATE TABLE `TrafficEvent` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `eventType` VARCHAR(40) NOT NULL DEFAULT 'REQUEST',
    `visitorId` VARCHAR(64) NULL,
    `userId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `path` VARCHAR(2048) NOT NULL,
    `method` VARCHAR(10) NULL,
    `status` SMALLINT UNSIGNED NULL,
    `latencyMs` INTEGER UNSIGNED NULL,
    `ipHash` VARCHAR(64) NULL,
    `userAgent` VARCHAR(512) NULL,
    `referrer` VARCHAR(2048) NULL,
    `isBot` BOOLEAN NOT NULL DEFAULT false,
    `botReason` VARCHAR(100) NULL,
    `bytesSent` BIGINT UNSIGNED NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TrafficEvent_createdAt_idx`(`createdAt`),
    INDEX `TrafficEvent_eventType_createdAt_idx`(`eventType`, `createdAt`),
    INDEX `TrafficEvent_visitorId_createdAt_idx`(`visitorId`, `createdAt`),
    INDEX `TrafficEvent_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `TrafficEvent_path_createdAt_idx`(`path`(191), `createdAt`),
    INDEX `TrafficEvent_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `TrafficEvent_isBot_createdAt_idx`(`isBot`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrafficEvent` ADD CONSTRAINT `TrafficEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
