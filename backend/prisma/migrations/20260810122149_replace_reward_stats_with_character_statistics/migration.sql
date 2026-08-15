-- CreateTable
CREATE TABLE "character_statistics" (
    "character_id" TEXT NOT NULL,
    "total_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "guardian_harvest_count" INTEGER NOT NULL DEFAULT 0,
    "kurzan_harvest_count" INTEGER NOT NULL DEFAULT 0,
    "shard_reward_count" INTEGER NOT NULL DEFAULT 0,
    "azena_blessing_reward_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "character_statistics_pkey" PRIMARY KEY ("character_id")
);

-- AddForeignKey
ALTER TABLE "character_statistics" ADD CONSTRAINT "character_statistics_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: carry forward existing character_gold_stats / character_reward_stats rows into
-- character_statistics before dropping the old tables. reward_item_id prefixed with 'azena-' maps
-- to azena_blessing_reward_count, everything else maps to shard_reward_count (the two reward
-- catalogs use disjoint id namespaces). guardian_harvest_count/kurzan_harvest_count have no prior
-- source (harvests were never counted before this design) and start at 0.
INSERT INTO "character_statistics" ("character_id", "total_gold_earned", "shard_reward_count", "azena_blessing_reward_count")
SELECT
  g."character_id",
  g."total_gold_earned",
  COALESCE(shard."count", 0),
  COALESCE(azena."count", 0)
FROM "character_gold_stats" g
LEFT JOIN (
  SELECT "character_id", SUM("count") AS "count"
  FROM "character_reward_stats"
  WHERE "reward_item_id" NOT LIKE 'azena-%'
  GROUP BY "character_id"
) shard ON shard."character_id" = g."character_id"
LEFT JOIN (
  SELECT "character_id", SUM("count") AS "count"
  FROM "character_reward_stats"
  WHERE "reward_item_id" LIKE 'azena-%'
  GROUP BY "character_id"
) azena ON azena."character_id" = g."character_id";

INSERT INTO "character_statistics" ("character_id", "shard_reward_count", "azena_blessing_reward_count")
SELECT
  r."character_id",
  COALESCE(SUM(CASE WHEN r."reward_item_id" NOT LIKE 'azena-%' THEN r."count" ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN r."reward_item_id" LIKE 'azena-%' THEN r."count" ELSE 0 END), 0)
FROM "character_reward_stats" r
WHERE NOT EXISTS (SELECT 1 FROM "character_gold_stats" g WHERE g."character_id" = r."character_id")
GROUP BY r."character_id";

-- DropForeignKey
ALTER TABLE "character_gold_stats" DROP CONSTRAINT "character_gold_stats_character_id_fkey";
ALTER TABLE "character_reward_stats" DROP CONSTRAINT "character_reward_stats_character_id_fkey";

-- DropTable
DROP TABLE "character_gold_stats";

-- DropTable
DROP TABLE "character_reward_stats";

-- DropEnum
DROP TYPE "ContentType";
