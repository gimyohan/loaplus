-- Character_Item_Reward_Stats를 주간 스냅샷(3개월 리텐션 대상)에서 Character_Statistics와
-- 같은 성격의 전체 기간 영구 누적 테이블로 바꾼다 — 프론트가 기간별 조회를 쓰지 않고 항상
-- "전체 기간 합계"만 보여주는 게 확인되어(사용자 확인), week_start_date를 PK/컬럼에서
-- 완전히 제거한다(docs/statistics.md 참고). 기존에 여러 주에 걸쳐 흩어져 있던 행은
-- (character_id, content_type, reward_type, item_id) 기준으로 count를 합산해 하나로 합친다.

-- 1) 기존 행을 새 PK 기준으로 합산해 임시 테이블에 보관 (category_key/item_name은 가장 최근
--    updated_at 행의 값을 그대로 쓴다 — 같은 item_id면 원래도 카탈로그 값이 동일해야 하므로
--    사실상 어느 쪽을 골라도 같다).
CREATE TEMP TABLE character_item_reward_stats_agg AS
SELECT
    character_id,
    content_type,
    reward_type,
    item_id,
    (array_agg(category_key ORDER BY updated_at DESC))[1] AS category_key,
    (array_agg(item_name ORDER BY updated_at DESC))[1] AS item_name,
    SUM(count) AS count,
    MAX(updated_at) AS updated_at
FROM character_item_reward_stats
GROUP BY character_id, content_type, reward_type, item_id;

-- 2) 기존 제약 제거 후 테이블을 비우고 week_start_date 컬럼을 삭제한다.
ALTER TABLE "character_item_reward_stats" DROP CONSTRAINT "character_item_reward_stats_character_id_fkey";
ALTER TABLE "character_item_reward_stats" DROP CONSTRAINT "character_item_reward_stats_pkey";

TRUNCATE TABLE "character_item_reward_stats";

ALTER TABLE "character_item_reward_stats" DROP COLUMN "week_start_date";

-- 3) 합산된 데이터를 새 스키마로 복원한다.
INSERT INTO character_item_reward_stats (character_id, content_type, reward_type, item_id, category_key, item_name, count, updated_at)
SELECT character_id, content_type, reward_type, item_id, category_key, item_name, count, updated_at
FROM character_item_reward_stats_agg;

-- 4) 새 PK(4컬럼)와 FK를 다시 건다.
ALTER TABLE "character_item_reward_stats" ADD CONSTRAINT "character_item_reward_stats_pkey" PRIMARY KEY ("character_id", "content_type", "reward_type", "item_id");
ALTER TABLE "character_item_reward_stats" ADD CONSTRAINT "character_item_reward_stats_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
