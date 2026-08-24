-- 스택 수동 조절(PATCH .../hal-hourglass/sand)은 보상을 지급하지 않는 단순 상태 조정으로
-- 재설계되어 더 이상 로그를 남기지 않는다 (docs/ebony_cube_hal_hourglass.typ 참고). 이 값을
-- 쓴 실제 로그는 없다(신규 기능, 실사용 데이터 없음). Postgres는 enum 값을 직접 제거할 수
-- 없으므로 새 타입을 만들어 컬럼을 옮긴 뒤 옛 타입을 대체한다.
CREATE TYPE "ActionType_new" AS ENUM (
    'HARVEST_GUARDIAN',
    'HARVEST_KURZAN',
    'GUARDIAN_SHARD_REWARD',
    'GUARDIAN_AZENA_BLESSING_REWARD',
    'KURZAN_SHARD_REWARD',
    'KURZAN_AZENA_BLESSING_REWARD',
    'RAID_GATE_CLEAR',
    'OTHER_INCOME_MANUAL',
    'PARADISE_GOLD_REWARD',
    'EBONY_CUBE_CLEAR',
    'HAL_HOURGLASS_COMPLETE'
);

ALTER TABLE "action_logs" ALTER COLUMN "action_type" TYPE "ActionType_new" USING ("action_type"::text::"ActionType_new");

DROP TYPE "ActionType";

ALTER TYPE "ActionType_new" RENAME TO "ActionType";
