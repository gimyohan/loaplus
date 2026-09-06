-- CreateTable
CREATE TABLE "market_item_weekly_stats" (
    "item_id" INTEGER NOT NULL,
    "week_start_date" DATE NOT NULL,
    "item_name" TEXT NOT NULL,
    "avg_price" DOUBLE PRECISION NOT NULL,
    "trade_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_item_weekly_stats_pkey" PRIMARY KEY ("item_id","week_start_date")
);

-- CreateTable
CREATE TABLE "market_item_monthly_stats" (
    "item_id" INTEGER NOT NULL,
    "month_start_date" DATE NOT NULL,
    "item_name" TEXT NOT NULL,
    "avg_price" DOUBLE PRECISION NOT NULL,
    "trade_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_item_monthly_stats_pkey" PRIMARY KEY ("item_id","month_start_date")
);
