-- CreateTable
CREATE TABLE "ability_stone_dp_states" (
    "state_key" INTEGER NOT NULL,
    "major_fail_cnt" SMALLINT NOT NULL,
    "minor_fail_cnt" SMALLINT NOT NULL,
    "debuff_succ_cnt" SMALLINT NOT NULL,
    "major_rem_cnt" SMALLINT NOT NULL,
    "minor_rem_cnt" SMALLINT NOT NULL,
    "debuff_rem_cnt" SMALLINT NOT NULL,
    "curr_probability_idx" SMALLINT NOT NULL,
    "outcomes" JSONB NOT NULL,

    CONSTRAINT "ability_stone_dp_states_pkey" PRIMARY KEY ("state_key")
);
