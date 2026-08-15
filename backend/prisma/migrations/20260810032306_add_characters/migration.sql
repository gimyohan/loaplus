-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "server_name" TEXT NOT NULL,
    "character_name" TEXT NOT NULL,
    "item_level" DOUBLE PRECISION NOT NULL,
    "combat_power" DOUBLE PRECISION NOT NULL,
    "class_name" TEXT NOT NULL,
    "image_url" TEXT,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
