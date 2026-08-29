-- 완갑(팔찌 다음에 추가된 장비 슬롯) 컬럼을 추가한다(docs/db_schema.typ "Characters 상세 배너용
-- 컬럼", docs/api.typ "상세 배너 필드 매핑" 참고). 기존 캐릭터는 이 값이 없으므로 NOT NULL
-- 제약을 만족시키기 위해 "빈 상태"를 뜻하는 기본값을 채워 넣는다 — 실제 값은 다음 새로고침
-- (POST /api/characters/{characterId}/refresh) 때 Open API 응답을 다시 파싱해 채워진다.
ALTER TABLE "characters"
  ADD COLUMN "wrist_guard" JSONB NOT NULL DEFAULT '{
    "itemName": "",
    "refineLevel": 0,
    "iconUrl": "",
    "effects": []
  }'::jsonb;
