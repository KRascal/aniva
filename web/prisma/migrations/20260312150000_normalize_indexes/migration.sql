-- Migration normalization: capture indexes added via direct SQL
-- These indexes were applied directly to the DB during quality overhaul (2026-03-12)
-- This migration formalizes them in the migration history

-- CreateIndex
CREATE INDEX "Conversation_relationshipId_updatedAt_idx" ON "Conversation"("relationshipId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Moment_characterId_publishedAt_idx" ON "Moment"("characterId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Moment_publishedAt_idx" ON "Moment"("publishedAt" DESC);
