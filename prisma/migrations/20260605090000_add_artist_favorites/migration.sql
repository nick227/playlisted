CREATE TABLE `ArtistFavorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `artistId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ArtistFavorite_artistId_idx`(`artistId`),
    UNIQUE INDEX `ArtistFavorite_userId_artistId_key`(`userId`, `artistId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ArtistFavorite` (`id`, `userId`, `artistId`, `createdAt`)
SELECT CONCAT('artistfav_', REPLACE(UUID(), '-', '')), `followerId`, `followingId`, `createdAt`
FROM `UserFollow`;

ALTER TABLE `ArtistFavorite` ADD CONSTRAINT `ArtistFavorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ArtistFavorite` ADD CONSTRAINT `ArtistFavorite_artistId_fkey` FOREIGN KEY (`artistId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
