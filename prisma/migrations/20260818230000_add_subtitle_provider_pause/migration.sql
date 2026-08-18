-- CreateTable
-- Singleton-per-provider pause state for the subtitle worker. A provider-level
-- failure (auth, billing, rate-limit, 5xx, network/timeout) sets pausedUntil so
-- a redeploy right after an incident doesn't immediately resume calling the
-- provider before the cooldown elapses.
CREATE TABLE `SubtitleProviderPause` (
    `provider` VARCHAR(32) NOT NULL,
    `pausedUntil` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
