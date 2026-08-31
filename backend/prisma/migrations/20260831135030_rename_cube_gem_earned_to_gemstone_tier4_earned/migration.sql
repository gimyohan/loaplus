-- Rename to reflect that this column now also counts Hal's Hourglass gem
-- rewards, not only Ebony Cube clears.
ALTER TABLE "character_statistics" RENAME COLUMN "cube_gem_earned" TO "gemstone_tier4_earned";
ALTER TABLE "character_statistics_weekly" RENAME COLUMN "cube_gem_earned" TO "gemstone_tier4_earned";
