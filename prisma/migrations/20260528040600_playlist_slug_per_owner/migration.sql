-- Make playlist slugs unique per owner (canonical URLs: /@username/:slug)

-- Drop global uniqueness on slug if it exists.
DROP INDEX `Playlist_slug_key` ON `Playlist`;

-- Enforce per-owner slug uniqueness.
CREATE UNIQUE INDEX `Playlist_ownerId_slug_key` ON `Playlist`(`ownerId`, `slug`);

