-- TEXT_CHECKBOX customData: resetPeriod('DAILY'/'WEEKLY'/null) -> resetDays(7비트 요일
-- 비트마스크)로 데이터 형태를 바꾼다 (docs/db_schema.typ의 Dashboard_Widgets "텍스트&체크박스
-- 예시" 참고). DAILY -> 127(전 요일), WEEKLY -> 8(수요일 비트 하나 — 이 서비스의 주간 경계가
-- 수요일 06:00 KST이므로 동일한 효과), null/그 외 -> 0(자동 초기화 없음).
-- custom_data는 스키마 없는 JSONB라 별도 컬럼 타입 변경 없이 값만 갱신한다.

UPDATE "dashboard_widgets"
SET "custom_data" = ("custom_data" - 'resetPeriod') || jsonb_build_object(
  'resetDays',
  CASE "custom_data"->>'resetPeriod'
    WHEN 'DAILY' THEN 127
    WHEN 'WEEKLY' THEN 8
    ELSE 0
  END
)
WHERE "widget_type" = 'TEXT_CHECKBOX';
