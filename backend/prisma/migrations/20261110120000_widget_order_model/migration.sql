-- 위젯 배치를 그리드 좌표(grid_x/grid_y/width/height)에서 카드 안의 순서(display_order)로 바꾼다
-- (docs/ui_redesign.md "순서 모델과 데이터"). 폭은 항상 카드 폭, 높이는 위젯 종류가 정한다.

-- 1) display_order: 기존 배치를 읽는 순서(위→아래, 같은 줄은 왼→오른쪽)로 0부터 매긴다.
--    배너가 맨 위에 있던 기존 관례가 그대로 보존된다.
ALTER TABLE "dashboard_widgets" ADD COLUMN "display_order" INTEGER;

UPDATE "dashboard_widgets" AS w
SET "display_order" = ranked.rn
FROM (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "character_id" ORDER BY "grid_y", "grid_x", "id") - 1 AS rn
  FROM "dashboard_widgets"
) AS ranked
WHERE w."id" = ranked."id";

ALTER TABLE "dashboard_widgets" ALTER COLUMN "display_order" SET NOT NULL;

CREATE INDEX "dashboard_widgets_character_id_display_order_idx"
  ON "dashboard_widgets"("character_id", "display_order");

-- 2) 이미지 위젯은 가로·세로 칸 수 대신 높이 단계(S 140px / M 210px / L 350px, 카드 폭 350px 기준)를
--    custom_data.size로 갖는다. 기존 세로/가로 비율에 가장 가까운 단계를 고른다
--    (비율 0.4 / 0.6 / 1.0의 중간값 0.5, 0.8을 경계로).
UPDATE "dashboard_widgets"
SET "custom_data" = COALESCE("custom_data", '{}'::jsonb) || jsonb_build_object(
  'size',
  CASE
    WHEN "height"::float / "width" < 0.5 THEN 'S'
    WHEN "height"::float / "width" < 0.8 THEN 'M'
    ELSE 'L'
  END
)
WHERE "widget_type" = 'IMAGE';

-- 3) 공유 템플릿: { columns, rows, widgets: [{ kind, x, y, w, h }] } → { widgets: [{ kind }] }
--    (같은 읽는 순서 규칙으로 정렬).
UPDATE "dashboard_templates"
SET "layout_schema" = jsonb_build_object(
  'widgets',
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('kind', entry->>'kind')
                       ORDER BY (entry->>'y')::int, (entry->>'x')::int)
      FROM jsonb_array_elements("layout_schema"->'widgets') AS entry
    ),
    '[]'::jsonb
  )
);

-- 4) 더 이상 쓰지 않는 그리드 컬럼 제거.
ALTER TABLE "dashboard_widgets"
  DROP COLUMN "grid_x",
  DROP COLUMN "grid_y",
  DROP COLUMN "width",
  DROP COLUMN "height";

ALTER TABLE "characters"
  DROP COLUMN "grid_columns",
  DROP COLUMN "grid_rows";
