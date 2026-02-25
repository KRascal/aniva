-- CreateEnum
CREATE TYPE "CoinTxType" AS ENUM ('PURCHASE', 'CALL_OVERAGE', 'CHAT_EXTRA', 'GIFT_SENT', 'GIFT_RECEIVED', 'ITEM_PURCHASE', 'REFUND', 'BONUS', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "PaymentPlatform" AS ENUM ('WEB', 'IOS', 'ANDROID');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "callCoinPerMin" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "fcIncludedCallMin" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "fcMonthlyPriceJpy" INTEGER NOT NULL DEFAULT 3480,
ADD COLUMN     "fcOverageCallCoinPerMin" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "fcSubscriberCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "freeCallMinutes" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "freeMessageLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "onboardingGreetings" JSONB DEFAULT '[]',
ADD COLUMN     "stripeProductId" TEXT;

-- AlterTable
ALTER TABLE "Relationship" ADD COLUMN     "isFanclub" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFollowing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "notificationPermission" BOOLEAN,
ADD COLUMN     "onboardingCharacterId" TEXT,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingDeeplinkSlug" TEXT,
ADD COLUMN     "onboardingStep" TEXT;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CoinTxType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "characterId" TEXT,
    "refId" TEXT,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "SubStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "pricePaidJpy" INTEGER NOT NULL,
    "callMinutesRemaining" INTEGER NOT NULL DEFAULT 0,
    "callMinutesTotal" INTEGER NOT NULL DEFAULT 0,
    "platform" "PaymentPlatform" NOT NULL DEFAULT 'WEB',
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "priceWebJpy" INTEGER NOT NULL,
    "priceStoreJpy" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "VerificationCode_email_idx" ON "VerificationCode"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoinBalance_userId_key" ON "CoinBalance"("userId");

-- CreateIndex
CREATE INDEX "CoinTransaction_userId_idx" ON "CoinTransaction"("userId");

-- CreateIndex
CREATE INDEX "CoinTransaction_refId_idx" ON "CoinTransaction"("refId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSubscription_stripeSubscriptionId_key" ON "CharacterSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CharacterSubscription_userId_idx" ON "CharacterSubscription"("userId");

-- CreateIndex
CREATE INDEX "CharacterSubscription_characterId_idx" ON "CharacterSubscription"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSubscription_userId_characterId_status_key" ON "CharacterSubscription"("userId", "characterId", "status");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinBalance" ADD CONSTRAINT "CoinBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSubscription" ADD CONSTRAINT "CharacterSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSubscription" ADD CONSTRAINT "CharacterSubscription_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
