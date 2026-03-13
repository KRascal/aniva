-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "basics" JSONB NOT NULL DEFAULT '{}',
    "personality" JSONB NOT NULL DEFAULT '{}',
    "interests" JSONB NOT NULL DEFAULT '{}',
    "currentState" JSONB NOT NULL DEFAULT '{}',
    "topics" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_characterId_key" ON "UserProfile"("userId", "characterId");
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");
CREATE INDEX "UserProfile_characterId_idx" ON "UserProfile"("characterId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
