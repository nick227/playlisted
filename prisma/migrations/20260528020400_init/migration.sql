-- This migration baselines the existing schema.

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `passwordHash` VARCHAR(255) NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `bio` TEXT NULL,
    `avatarUrl` VARCHAR(2048) NULL,
    `heroImageUrl` VARCHAR(2048) NULL,
    `role` ENUM('LISTENER', 'CREATOR', 'EDITOR', 'ADMIN') NOT NULL DEFAULT 'LISTENER',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'INVITED') NOT NULL DEFAULT 'ACTIVE',
    `isFeaturedArtist` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Playlist` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `coverArtUrl` VARCHAR(2048) NULL,
    `type` ENUM('PLAYLIST', 'ALBUM', 'MIX', 'PODCAST_CHANNEL', 'RELEASE') NOT NULL DEFAULT 'PLAYLIST',
    `visibility` ENUM('PUBLIC', 'UNLISTED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `isPinnedOnProfile` BOOLEAN NOT NULL DEFAULT false,
    `itemCount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `totalDurationSeconds` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Playlist_slug_key`(`slug`),
    INDEX `Playlist_ownerId_idx`(`ownerId`),
    INDEX `Playlist_type_visibility_status_idx`(`type`, `visibility`, `status`),
    INDEX `Playlist_featured_publishedAt_idx`(`featured`, `publishedAt`),
    FULLTEXT INDEX `Playlist_title_description_idx`(`title`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recording` (
    `id` VARCHAR(191) NOT NULL,
    `uploaderId` VARCHAR(191) NOT NULL,
    `publishedPlaylistId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `audioUrl` VARCHAR(2048) NOT NULL,
    `audioMimeType` VARCHAR(191) NULL,
    `audioBytes` BIGINT UNSIGNED NULL,
    `durationSeconds` INTEGER UNSIGNED NULL,
    `artworkUrl` VARCHAR(2048) NULL,
    `recordingType` ENUM('SONG', 'PODCAST_EPISODE', 'MIX_SEGMENT', 'OTHER') NOT NULL DEFAULT 'SONG',
    `visibility` ENUM('PUBLIC', 'UNLISTED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `trackNumber` INTEGER UNSIGNED NULL,
    `episodeNumber` INTEGER UNSIGNED NULL,
    `explicit` BOOLEAN NOT NULL DEFAULT false,
    `releaseDate` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `playCount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Recording_uploaderId_idx`(`uploaderId`),
    INDEX `Recording_publishedPlaylistId_idx`(`publishedPlaylistId`),
    INDEX `Recording_recordingType_visibility_status_idx`(`recordingType`, `visibility`, `status`),
    INDEX `Recording_publishedAt_idx`(`publishedAt`),
    FULLTEXT INDEX `Recording_title_description_idx`(`title`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlaylistItem` (
    `id` VARCHAR(191) NOT NULL,
    `playlistId` VARCHAR(191) NOT NULL,
    `recordingId` VARCHAR(191) NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL,
    `addedById` VARCHAR(191) NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlaylistItem_recordingId_idx`(`recordingId`),
    INDEX `PlaylistItem_addedById_idx`(`addedById`),
    UNIQUE INDEX `PlaylistItem_playlistId_position_key`(`playlistId`, `position`),
    UNIQUE INDEX `PlaylistItem_playlistId_recordingId_key`(`playlistId`, `recordingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlaylistSave` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `playlistId` VARCHAR(191) NOT NULL,
    `kind` ENUM('LIBRARY', 'FAVORITE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlaylistSave_playlistId_kind_idx`(`playlistId`, `kind`),
    UNIQUE INDEX `PlaylistSave_userId_playlistId_kind_key`(`userId`, `playlistId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecordingSave` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `recordingId` VARCHAR(191) NOT NULL,
    `kind` ENUM('LIBRARY', 'FAVORITE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RecordingSave_recordingId_kind_idx`(`recordingId`, `kind`),
    UNIQUE INDEX `RecordingSave_userId_recordingId_kind_key`(`userId`, `recordingId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlaybackEvent` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NULL,
    `recordingId` VARCHAR(191) NOT NULL,
    `playlistId` VARCHAR(191) NULL,
    `sourceContext` VARCHAR(100) NULL,
    `playedSeconds` INTEGER UNSIGNED NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlaybackEvent_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `PlaybackEvent_recordingId_createdAt_idx`(`recordingId`, `createdAt`),
    INDEX `PlaybackEvent_playlistId_createdAt_idx`(`playlistId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `kind` ENUM('GENRE', 'MOOD', 'CATEGORY', 'SCENE') NOT NULL DEFAULT 'GENRE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tag_name_key`(`name`),
    UNIQUE INDEX `Tag_slug_key`(`slug`),
    INDEX `Tag_kind_idx`(`kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlaylistTag` (
    `playlistId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlaylistTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`playlistId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecordingTag` (
    `recordingId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RecordingTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`recordingId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EditorialPost` (
    `id` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `kind` ENUM('NEWS', 'REVIEW', 'FEATURE', 'SPOTLIGHT') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(512) NULL,
    `body` LONGTEXT NOT NULL,
    `coverImageUrl` VARCHAR(2048) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EditorialPost_slug_key`(`slug`),
    INDEX `EditorialPost_authorId_idx`(`authorId`),
    INDEX `EditorialPost_kind_status_publishedAt_idx`(`kind`, `status`, `publishedAt`),
    FULLTEXT INDEX `EditorialPost_title_summary_body_idx`(`title`, `summary`, `body`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomepageFeature` (
    `id` VARCHAR(191) NOT NULL,
    `section` ENUM('FEATURED_PLAYLIST', 'CUSTOM_MIX', 'NEW_RELEASE', 'NEW_ARTIST', 'TRENDING', 'EDITOR_PICK', 'SITE_NEWS') NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL,
    `titleOverride` VARCHAR(191) NULL,
    `subtitleOverride` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `imageUrl` VARCHAR(2048) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `playlistId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `editorialPostId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HomepageFeature_isActive_startsAt_endsAt_idx`(`isActive`, `startsAt`, `endsAt`),
    INDEX `HomepageFeature_playlistId_idx`(`playlistId`),
    INDEX `HomepageFeature_userId_idx`(`userId`),
    INDEX `HomepageFeature_editorialPostId_idx`(`editorialPostId`),
    UNIQUE INDEX `HomepageFeature_section_position_key`(`section`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserFollow` (
    `id` VARCHAR(191) NOT NULL,
    `followerId` VARCHAR(191) NOT NULL,
    `followingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserFollow_followingId_idx`(`followingId`),
    UNIQUE INDEX `UserFollow_followerId_followingId_key`(`followerId`, `followingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Playlist` ADD CONSTRAINT `Playlist_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recording` ADD CONSTRAINT `Recording_uploaderId_fkey` FOREIGN KEY (`uploaderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recording` ADD CONSTRAINT `Recording_publishedPlaylistId_fkey` FOREIGN KEY (`publishedPlaylistId`) REFERENCES `Playlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistItem` ADD CONSTRAINT `PlaylistItem_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistItem` ADD CONSTRAINT `PlaylistItem_recordingId_fkey` FOREIGN KEY (`recordingId`) REFERENCES `Recording`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistItem` ADD CONSTRAINT `PlaylistItem_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistSave` ADD CONSTRAINT `PlaylistSave_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistSave` ADD CONSTRAINT `PlaylistSave_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordingSave` ADD CONSTRAINT `RecordingSave_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordingSave` ADD CONSTRAINT `RecordingSave_recordingId_fkey` FOREIGN KEY (`recordingId`) REFERENCES `Recording`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaybackEvent` ADD CONSTRAINT `PlaybackEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaybackEvent` ADD CONSTRAINT `PlaybackEvent_recordingId_fkey` FOREIGN KEY (`recordingId`) REFERENCES `Recording`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaybackEvent` ADD CONSTRAINT `PlaybackEvent_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistTag` ADD CONSTRAINT `PlaylistTag_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistTag` ADD CONSTRAINT `PlaylistTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordingTag` ADD CONSTRAINT `RecordingTag_recordingId_fkey` FOREIGN KEY (`recordingId`) REFERENCES `Recording`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordingTag` ADD CONSTRAINT `RecordingTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EditorialPost` ADD CONSTRAINT `EditorialPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomepageFeature` ADD CONSTRAINT `HomepageFeature_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomepageFeature` ADD CONSTRAINT `HomepageFeature_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomepageFeature` ADD CONSTRAINT `HomepageFeature_editorialPostId_fkey` FOREIGN KEY (`editorialPostId`) REFERENCES `EditorialPost`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomepageFeature` ADD CONSTRAINT `HomepageFeature_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFollow` ADD CONSTRAINT `UserFollow_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFollow` ADD CONSTRAINT `UserFollow_followingId_fkey` FOREIGN KEY (`followingId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

