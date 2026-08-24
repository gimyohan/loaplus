-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'RAID_GATE_CLEAR';

-- AlterEnum
ALTER TYPE "WidgetType" ADD VALUE 'RAID';

-- AlterTable
ALTER TABLE "character_statistics" ADD COLUMN     "raid_gate_clear_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "dashboard_widgets" ADD COLUMN     "raid_id" TEXT;

-- CreateTable
CREATE TABLE "character_raids" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "raid_key" TEXT NOT NULL,
    "difficulty_key" TEXT NOT NULL,
    "gates" JSONB NOT NULL,

    CONSTRAINT "character_raids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_widgets_raid_id_key" ON "dashboard_widgets"("raid_id");

-- AddForeignKey
ALTER TABLE "character_raids" ADD CONSTRAINT "character_raids_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "character_raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
