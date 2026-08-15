-- CreateTable
CREATE TABLE "paradises" (
    "character_id" TEXT NOT NULL,
    "ticket_count" INTEGER NOT NULL,
    "key_count" INTEGER NOT NULL,
    "auto_recharge" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "paradises_pkey" PRIMARY KEY ("character_id")
);

-- AddForeignKey
ALTER TABLE "paradises" ADD CONSTRAINT "paradises_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
