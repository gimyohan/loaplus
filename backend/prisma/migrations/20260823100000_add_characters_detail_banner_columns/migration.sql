-- 상세 배너(BANNER, 10x4) 위젯용 컬럼 4개를 추가한다(docs/db_schema.typ "Characters 상세 배너용
-- 컬럼", docs/api.typ "상세 배너 필드 매핑" 참고). 기존에 등록된 캐릭터는 이 값들이 없으므로
-- NOT NULL 제약을 만족시키기 위해 "빈 상태"를 뜻하는 기본값을 채워 넣는다 — 실제 값은 다음
-- 새로고침(POST /api/characters/{characterId}/refresh) 때 Open API 응답을 다시 파싱해 채워진다.
ALTER TABLE "characters"
  ADD COLUMN "equipment" JSONB NOT NULL DEFAULT '{
    "weapon": {"refineLevel": 0, "advancedRefineLevel": 0, "quality": 0},
    "head": {"refineLevel": 0, "advancedRefineLevel": 0, "quality": 0},
    "chest": {"refineLevel": 0, "advancedRefineLevel": 0, "quality": 0},
    "pants": {"refineLevel": 0, "advancedRefineLevel": 0, "quality": 0},
    "gloves": {"refineLevel": 0, "advancedRefineLevel": 0, "quality": 0},
    "shoulder": {"refineLevel": 0, "advancedRefineLevel": 0, "quality": 0}
  }'::jsonb,
  ADD COLUMN "accessories" JSONB NOT NULL DEFAULT '{
    "necklace": {"polishEffects": []},
    "earring1": {"polishEffects": []},
    "earring2": {"polishEffects": []},
    "ring1": {"polishEffects": []},
    "ring2": {"polishEffects": []}
  }'::jsonb,
  ADD COLUMN "ability_stone" JSONB NOT NULL DEFAULT '{"engravings": []}'::jsonb,
  ADD COLUMN "bracelet" JSONB NOT NULL DEFAULT '{"effects": []}'::jsonb;
