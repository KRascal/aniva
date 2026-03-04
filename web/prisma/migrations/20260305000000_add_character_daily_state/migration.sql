-- CreateTable
CREATE TABLE IF NOT EXISTS "CharacterDailyState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "emotion" TEXT NOT NULL,
    "context" TEXT,
    "bonusXpMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterDailyState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CharacterDailyState_characterId_date_key" ON "CharacterDailyState"("characterId", "date");

-- AddForeignKey
ALTER TABLE "CharacterDailyState" ADD CONSTRAINT "CharacterDailyState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
