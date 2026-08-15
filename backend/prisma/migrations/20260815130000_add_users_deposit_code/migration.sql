-- docs/subscription.typ "무통장입금 식별자: Users.deposit_code" 참고. 무통장입금 입금자명으로
-- 계정을 식별하기 위한 짧은 고유 코드. 기존 행이 있을 수 있어 nullable+UNIQUE로 먼저 추가한 뒤
-- (UNIQUE는 NULL을 여러 개 허용하므로 문제없음), PL/pgSQL로 각 행에 충돌 없는 코드를 채우고
-- 마지막에 NOT NULL을 건다.

ALTER TABLE "users" ADD COLUMN "deposit_code" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_deposit_code_key" UNIQUE ("deposit_code");

DO $$
DECLARE
  charset TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  target_user RECORD;
  candidate TEXT;
  attempt INT;
BEGIN
  FOR target_user IN SELECT id FROM "users" WHERE "deposit_code" IS NULL LOOP
    attempt := 0;
    LOOP
      candidate := '';
      FOR i IN 1..6 LOOP
        candidate := candidate || substr(charset, 1 + floor(random() * length(charset))::int, 1);
      END LOOP;
      attempt := attempt + 1;
      BEGIN
        UPDATE "users" SET "deposit_code" = candidate WHERE "id" = target_user.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF attempt > 20 THEN
          RAISE EXCEPTION 'failed to generate a unique deposit_code after 20 attempts for user %', target_user.id;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "users" ALTER COLUMN "deposit_code" SET NOT NULL;
