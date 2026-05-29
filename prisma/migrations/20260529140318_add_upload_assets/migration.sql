-- CreateTable
CREATE TABLE `UploadAsset` (
    `id` VARCHAR(48) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(10) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `storageKey` VARCHAR(512) NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `bytes` INTEGER UNSIGNED NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'READY',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UploadAsset_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UploadAsset` ADD CONSTRAINT `UploadAsset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
