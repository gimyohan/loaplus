-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "ActionType" ADD VALUE 'EBONY_CUBE_CLEAR';
ALTER TYPE "ActionType" ADD VALUE 'HAL_HOURGLASS_COMPLETE';
ALTER TYPE "ActionType" ADD VALUE 'HAL_HOURGLASS_SAND_ADJUST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "WidgetType" ADD VALUE 'EBONY_CUBE';
ALTER TYPE "WidgetType" ADD VALUE 'HAL_HOURGLASS';

-- AlterTable
ALTER TABLE "character_statistics" ADD COLUMN "cube_gem_earned" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "character_statistics_weekly" ADD COLUMN "cube_gem_earned" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ebony_cubes" (
    "character_id" UUID NOT NULL,
    "selected_ticket_type" TEXT,
    "ticket_count_tier_1" INTEGER NOT NULL DEFAULT 0,
    "ticket_count_tier_2" INTEGER NOT NULL DEFAULT 0,
    "ticket_count_tier_3" INTEGER NOT NULL DEFAULT 0,
    "ticket_count_tier_4" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ebony_cubes_pkey" PRIMARY KEY ("character_id")
);

-- CreateTable
CREATE TABLE "hal_hourglasses" (
    "character_id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "sand_stack" SMALLINT NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "hal_hourglasses_pkey" PRIMARY KEY ("character_id")
);

-- AddForeignKey
ALTER TABLE "ebony_cubes" ADD CONSTRAINT "ebony_cubes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hal_hourglasses" ADD CONSTRAINT "hal_hourglasses_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
