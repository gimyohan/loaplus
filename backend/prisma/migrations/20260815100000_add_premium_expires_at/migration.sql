-- docs/subscription.typ: 유료 플랜 판정을 위한 만료 시각 컬럼 하나만 추가한다. 별도 plan
-- enum이나 구독 이력 테이블은 두지 않는다(문서의 "스키마: Users.premium_expires_at 하나로
-- 충분" 참고) — isPremium은 이 컬럼과 현재 시각을 비교해 항상 응답 생성 시점에 계산한다.
ALTER TABLE "users" ADD COLUMN "premium_expires_at" TIMESTAMP(3);
