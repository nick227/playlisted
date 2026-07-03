ALTER TABLE `Recording` ADD COLUMN `subtitlePosition` VARCHAR(16) NOT NULL DEFAULT 'bottom';
ALTER TABLE `Recording` ADD COLUMN `subtitleStyleId` VARCHAR(32) NOT NULL DEFAULT 'classic';
