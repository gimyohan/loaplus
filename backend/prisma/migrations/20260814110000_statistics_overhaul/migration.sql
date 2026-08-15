-- docs/statistics.typ 통계 고도화: Character_Statistics 골드 카테고리 분리 + 주간/아이템 통계 테이블 신설.
-- Character_Statistics는 재계산 불가능한(Action_Logs가 200개 캡이라 전체 이력을 재현할 수
-- 없는) 캐시 테이블이므로, 기존 합산 컬럼은 새 카테고리 컬럼으로 그대로 이어붙일 방법이 없어
-- 0으로 리셋한다(캐시 테이블 재구축과 동일한 성격 — docs/db_schema.typ의 Character_Statistics
-- "통계 화면 전용 캐시 테이블" 설명 참고).

ALTER TABLE "character_statistics"
  DROP COLUMN "total_gold_earned",
  DROP COLUMN "total_bound_gold_earned",
  DROP COLUMN "shard_reward_count",
  DROP COLUMN "azena_blessing_reward_count",
  DROP COLUMN "raid_gate_clear_count",
  ADD COLUMN "raid_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "raid_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shard_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shard_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "azena_blessing_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "azena_blessing_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "paradise_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "paradise_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "other_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "other_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "guardian_shard_reward_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "kurzan_shard_reward_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "guardian_azena_blessing_reward_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "kurzan_azena_blessing_reward_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "character_statistics_weekly" (
    "character_id" TEXT NOT NULL,
    "week_start_date" DATE NOT NULL,
    "raid_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "raid_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "shard_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "shard_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "azena_blessing_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "azena_blessing_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "paradise_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "paradise_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "other_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "other_bound_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "guardian_harvest_count" INTEGER NOT NULL DEFAULT 0,
    "kurzan_harvest_count" INTEGER NOT NULL DEFAULT 0,
    "guardian_shard_reward_count" INTEGER NOT NULL DEFAULT 0,
    "kurzan_shard_reward_count" INTEGER NOT NULL DEFAULT 0,
    "guardian_azena_blessing_reward_count" INTEGER NOT NULL DEFAULT 0,
    "kurzan_azena_blessing_reward_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_statistics_weekly_pkey" PRIMARY KEY ("character_id", "week_start_date")
);

CREATE TYPE "ItemRewardContentType" AS ENUM ('GUARDIAN', 'KURZAN');
CREATE TYPE "ItemRewardKind" AS ENUM ('SHARD', 'AZENA_BLESSING');

CREATE TABLE "character_item_reward_stats" (
    "character_id" TEXT NOT NULL,
    "week_start_date" DATE NOT NULL,
    "content_type" "ItemRewardContentType" NOT NULL,
    "reward_type" "ItemRewardKind" NOT NULL,
    "item_id" TEXT NOT NULL,
    "category_key" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_item_reward_stats_pkey" PRIMARY KEY ("character_id", "week_start_date", "content_type", "reward_type", "item_id")
);

ALTER TABLE "character_statistics_weekly"
  ADD CONSTRAINT "character_statistics_weekly_character_id_fkey"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "character_item_reward_stats"
  ADD CONSTRAINT "character_item_reward_stats_character_id_fkey"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "ActionType" ADD VALUE 'OTHER_INCOME_MANUAL';
