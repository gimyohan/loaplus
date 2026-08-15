-- 모든 UUID 값을 담는 PK/FK 컬럼을 TEXT(36자 문자열)에서 Postgres 네이티브 uuid 타입(16바이트
-- 고정폭)으로 바꾼다 (docs/db_schema.typ "주요 테이블 설계" 상단 참고). 애플리케이션 코드는
-- 변경 불필요 — Prisma는 uuid 네이티브 타입도 여전히 JS string으로 매핑한다.
-- 기존 값은 전부 client-side로 생성된 표준 UUID v4 문자열이라 ::uuid 캐스팅이 항상 성공한다.

-- 1) FK 제약을 먼저 전부 제거한다 — 그렇지 않으면 부모/자식 컬럼 타입이 서로 다른 순간을
--    거치면서 제약 검증이 실패할 수 있다.
ALTER TABLE "characters" DROP CONSTRAINT "characters_user_id_fkey";
ALTER TABLE "guardians" DROP CONSTRAINT "guardians_character_id_fkey";
ALTER TABLE "kurzan_frontlines" DROP CONSTRAINT "kurzan_frontlines_character_id_fkey";
ALTER TABLE "paradises" DROP CONSTRAINT "paradises_character_id_fkey";
ALTER TABLE "character_raids" DROP CONSTRAINT "character_raids_character_id_fkey";
ALTER TABLE "character_statistics" DROP CONSTRAINT "character_statistics_character_id_fkey";
ALTER TABLE "character_statistics_weekly" DROP CONSTRAINT "character_statistics_weekly_character_id_fkey";
ALTER TABLE "character_item_reward_stats" DROP CONSTRAINT "character_item_reward_stats_character_id_fkey";
ALTER TABLE "action_logs" DROP CONSTRAINT "action_logs_user_id_fkey";
ALTER TABLE "action_logs" DROP CONSTRAINT "action_logs_character_id_fkey";
ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "dashboard_widgets_character_id_fkey";
ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "dashboard_widgets_raid_id_fkey";
ALTER TABLE "dashboard_templates" DROP CONSTRAINT "dashboard_templates_author_user_id_fkey";

-- 2) 컬럼 타입 변경 (PK 컬럼도 별도 처리 없이 그대로 TYPE 변경 가능 — Postgres가 인덱스를
--    알아서 재구축한다).
ALTER TABLE "users" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "characters" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "characters" ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;
ALTER TABLE "guardians" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "kurzan_frontlines" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "paradises" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "character_raids" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "character_raids" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "character_statistics" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "character_statistics_weekly" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "character_item_reward_stats" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "action_logs" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "action_logs" ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;
ALTER TABLE "action_logs" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "dashboard_widgets" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "dashboard_widgets" ALTER COLUMN "character_id" TYPE UUID USING "character_id"::uuid;
ALTER TABLE "dashboard_widgets" ALTER COLUMN "raid_id" TYPE UUID USING "raid_id"::uuid;
ALTER TABLE "dashboard_templates" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "dashboard_templates" ALTER COLUMN "author_user_id" TYPE UUID USING "author_user_id"::uuid;

-- 3) FK 제약 재생성 (기존과 동일한 이름/옵션).
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kurzan_frontlines" ADD CONSTRAINT "kurzan_frontlines_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paradises" ADD CONSTRAINT "paradises_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "character_raids" ADD CONSTRAINT "character_raids_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "character_statistics" ADD CONSTRAINT "character_statistics_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "character_statistics_weekly" ADD CONSTRAINT "character_statistics_weekly_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "character_item_reward_stats" ADD CONSTRAINT "character_item_reward_stats_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "character_raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_templates" ADD CONSTRAINT "dashboard_templates_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
