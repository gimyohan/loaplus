-- CreateTable
CREATE TABLE "market_item_daily_stats" (
    "item_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "item_name" TEXT NOT NULL,
    "avg_price" DOUBLE PRECISION NOT NULL,
    "trade_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_item_daily_stats_pkey" PRIMARY KEY ("item_id","date")
);

-- CreateTable
CREATE TABLE "market_item_recent_prices" (
    "item_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "recent_price" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_item_recent_prices_pkey" PRIMARY KEY ("item_id")
);
