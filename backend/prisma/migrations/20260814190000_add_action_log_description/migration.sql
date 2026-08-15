-- docs/db_schema.typ의 Action_Logs "description" 필드: 로그 목록에서 rewards가 말해주지 않는
-- "어디서/왜"를 보여주는 표시용 문구 (기타 수입 사유, 레이드 관문/가디언/쿠르잔 대상명).
ALTER TABLE "action_logs" ADD COLUMN "description" TEXT;
