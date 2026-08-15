-- CreateIndex
CREATE INDEX "action_logs_user_id_created_at_idx" ON "action_logs"("user_id", "created_at");
