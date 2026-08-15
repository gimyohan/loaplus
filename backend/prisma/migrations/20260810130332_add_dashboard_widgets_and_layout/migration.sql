-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('BANNER', 'BANNER_COMPACT', 'GUARDIAN', 'KURZAN_FRONTLINE', 'PARADISE', 'TEXT', 'TEXT_CHECKBOX', 'IMAGE');

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grid_columns" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "grid_rows" INTEGER NOT NULL DEFAULT 16;

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "widget_type" "WidgetType" NOT NULL,
    "grid_x" INTEGER NOT NULL,
    "grid_y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "custom_data" JSONB,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
