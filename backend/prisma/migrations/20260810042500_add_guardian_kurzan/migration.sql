-- CreateTable
CREATE TABLE "guardians" (
    "character_id" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "rest_gauge" INTEGER NOT NULL,
    "rest_gauge_max" INTEGER NOT NULL,
    "rest_gauge_threshold" INTEGER NOT NULL,
    "is_harvested" BOOLEAN NOT NULL DEFAULT false,
    "rest_gauge_consumed_by_harvest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("character_id")
);

-- CreateTable
CREATE TABLE "kurzan_frontlines" (
    "character_id" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "rest_gauge" INTEGER NOT NULL,
    "rest_gauge_max" INTEGER NOT NULL,
    "rest_gauge_threshold" INTEGER NOT NULL,
    "is_harvested" BOOLEAN NOT NULL DEFAULT false,
    "rest_gauge_consumed_by_harvest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "kurzan_frontlines_pkey" PRIMARY KEY ("character_id")
);

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kurzan_frontlines" ADD CONSTRAINT "kurzan_frontlines_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
