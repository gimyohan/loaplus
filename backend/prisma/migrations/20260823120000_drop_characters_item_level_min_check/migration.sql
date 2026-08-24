-- 20260822100000_add_characters_item_level_min_check가 세운 전제("이미 등록된 캐릭터는 아이템
-- 레벨이 떨어지는 일이 없다")가 실제로는 틀렸다 — 시즌/컨텐츠 개편 등으로 등록 후 아이템 레벨이
-- 1,640 밑으로 내려가는 경우가 실제로 발생했고(예: "도스점착석발사기" 1477.5), 그때마다
-- POST /api/characters/{id}/refresh의 UPDATE가 이 CHECK 제약에 막혀 처리되지 않은 500 에러가
-- 났다. 등록 시점 하한(POST /api/characters, 애플리케이션 레벨 422)은 그대로 유지하되, 이미
-- 등록된 캐릭터는 Open API가 알려주는 실제 값을 그대로 반영할 수 있어야 하므로 DB 제약은 없앤다.
ALTER TABLE "characters" DROP CONSTRAINT "characters_item_level_min";
