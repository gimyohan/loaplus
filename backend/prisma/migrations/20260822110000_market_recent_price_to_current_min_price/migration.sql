-- 거래소 시세 캐시를 "최근 체결가(RecentPrice)"에서 "현재 최소 판매가(CurrentMinPrice)" 기준으로
-- 교체한다(docs/market_price.typ "개요" 참고). 이 테이블이 곧 아이템 검색 카탈로그를 겸하도록
-- grade/icon 컬럼도 함께 추가한다(docs/db_schema.typ "Market_Item_Current_Prices" 참고).
-- 기존 30개 행은 grade/icon 없이 남아있다가 다음 갱신(배치 또는 온디맨드) 때 채워진다.
ALTER TABLE "market_item_recent_prices" RENAME TO "market_item_current_prices";
ALTER TABLE "market_item_current_prices" RENAME COLUMN "recent_price" TO "current_min_price";
ALTER TABLE "market_item_current_prices" ADD COLUMN "grade" TEXT;
ALTER TABLE "market_item_current_prices" ADD COLUMN "icon" TEXT;
