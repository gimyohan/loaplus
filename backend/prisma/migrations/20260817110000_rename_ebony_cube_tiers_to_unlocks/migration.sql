-- 큐브 등급 실명("제 1 해금"~"제 4 해금")이 확정되어 자리표시 컬럼명을 실제 이름으로 바꾼다
-- (docs/ebony_cube_hal_hourglass.typ 참고).
ALTER TABLE "ebony_cubes" RENAME COLUMN "ticket_count_tier_1" TO "ticket_count_unlock_1";
ALTER TABLE "ebony_cubes" RENAME COLUMN "ticket_count_tier_2" TO "ticket_count_unlock_2";
ALTER TABLE "ebony_cubes" RENAME COLUMN "ticket_count_tier_3" TO "ticket_count_unlock_3";
ALTER TABLE "ebony_cubes" RENAME COLUMN "ticket_count_tier_4" TO "ticket_count_unlock_4";
