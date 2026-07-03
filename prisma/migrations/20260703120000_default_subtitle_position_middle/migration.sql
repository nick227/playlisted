UPDATE `Recording` SET `subtitlePosition` = 'middle' WHERE `subtitlePosition` = 'bottom';
ALTER TABLE `Recording` MODIFY `subtitlePosition` VARCHAR(16) NOT NULL DEFAULT 'middle';
