-- AlterTable
ALTER TABLE "guardians" ADD COLUMN     "target_auto_managed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "kurzan_frontlines" ADD COLUMN     "target_auto_managed" BOOLEAN NOT NULL DEFAULT true;
