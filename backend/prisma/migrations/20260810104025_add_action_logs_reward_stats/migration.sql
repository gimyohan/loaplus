-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('HARVEST_GUARDIAN', 'HARVEST_KURZAN', 'GUARDIAN_SHARD_REWARD', 'GUARDIAN_AZENA_BLESSING_REWARD');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('GUARDIAN', 'KURZAN', 'PARADISE');

-- CreateTable
CREATE TABLE "character_gold_stats" (
    "character_id" TEXT NOT NULL,
    "total_gold_earned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "character_gold_stats_pkey" PRIMARY KEY ("character_id")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "action_type" "ActionType",
    "revert_params" JSONB,
    "rewards" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_reward_stats" (
    "character_id" TEXT NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "reward_item_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "character_reward_stats_pkey" PRIMARY KEY ("character_id","content_type","reward_item_id")
);

-- AddForeignKey
ALTER TABLE "character_gold_stats" ADD CONSTRAINT "character_gold_stats_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_reward_stats" ADD CONSTRAINT "character_reward_stats_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
