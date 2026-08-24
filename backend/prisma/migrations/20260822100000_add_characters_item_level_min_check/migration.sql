-- 아이템 레벨 1,640 미만인 캐릭터는 애초에 등록될 수 없다(docs/api.typ "캐릭터 등록 / 조회 /
-- 삭제" 참고, POST /api/characters가 422로 거부). 이 제약을 DB 레벨에서도 강제해 애플리케이션
-- 버그로 우회 등록되는 것을 막는다. 현재 DB에는 이 조건을 위배하는 레코드가 없음을 확인했다.
ALTER TABLE "characters" ADD CONSTRAINT "characters_item_level_min" CHECK ("item_level" >= 1640);
