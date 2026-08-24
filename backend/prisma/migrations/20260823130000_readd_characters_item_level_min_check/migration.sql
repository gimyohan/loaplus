-- 아이템 레벨이 1,640 밑으로 내려가는 건 시즌 개편 같은 공식적인 하락이 아니라, 유저가 인게임에서
-- 장비를 일시적으로 해제해 생기는 일시적 현상이라는 판단으로 방향을 바꾼다. 그래서 CHECK 제약을
-- 다시 걸고, 대신 새로고침 시 애플리케이션 레벨에서 (기존 저장값, 새로 받아온 값) 중 큰 쪽을
-- 저장한다(GREATEST — workspace/backend/src/routes/characters.ts 참고) — 한 번이라도 도달한
-- 아이템 레벨 아래로는 저장값이 내려가지 않는다.
--
-- 직전 마이그레이션(20260823120000)이 제약을 없앤 사이 "도스점착석발사기" 캐릭터의 새로고침이
-- 한 번 실행돼, 인게임에서 일시적으로 낮아진 아이템 레벨(1477.5)이 그대로 저장돼 버렸다. 제약을
-- 다시 걸면 이 행이 위배 상태라 마이그레이션이 실패하므로, 이 세션에서 확인된 새로고침 전 값
-- (1,649.16)으로 먼저 되돌린 뒤에 제약을 추가한다. 이후로는 위 GREATEST 저장 방식이 같은 문제를
-- 막아준다.
UPDATE "characters" SET "item_level" = 1649.16 WHERE "character_name" = '도스점착석발사기' AND "item_level" < 1640;

ALTER TABLE "characters" ADD CONSTRAINT "characters_item_level_min" CHECK ("item_level" >= 1640);
