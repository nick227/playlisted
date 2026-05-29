-- CreateTable
CREATE TABLE `ProfileViewEvent` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `profileUserId` VARCHAR(191) NOT NULL,
    `viewerId` VARCHAR(191) NULL,
    `referrer` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProfileViewEvent_profileUserId_createdAt_idx`(`profileUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProfileViewEvent` ADD CONSTRAINT `ProfileViewEvent_profileUserId_fkey` FOREIGN KEY (`profileUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileViewEvent` ADD CONSTRAINT `ProfileViewEvent_viewerId_fkey` FOREIGN KEY (`viewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
