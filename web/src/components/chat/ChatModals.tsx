'use client';

import React from 'react';
import type { Message, Character } from '@/components/chat/ChatMessageList';
import type { RelationshipInfo } from '@/components/chat/types';
import { OnboardingOverlay, type UserProfile } from '@/components/chat/OnboardingOverlay';
import { GiftPanel } from '@/components/chat/GiftPanel';
import { RealtimeCallModal } from '@/components/chat/RealtimeCallModal';
import { MemoryPeekModal } from '@/components/chat/MemoryPeekModal';
import { CallSelectionModal } from '@/components/chat/CallSelectionModal';
import { ChatMenu } from '@/components/chat/ChatMenu';
import { FcSubscribeModal } from '@/components/chat/FcSubscribeModal';
import { FcSuccessModal } from '@/components/chat/FcSuccessModal';
import { LevelUpModal } from '@/components/chat/LevelUpModal';
import { WelcomeBackOverlay } from '@/components/chat/WelcomeBackOverlay';
import { StreakBreakPopup } from '@/components/chat/StreakBreakPopup';
import { DailyEventPopup } from '@/components/reward/DailyEventPopup';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import type { Milestone } from '@/lib/milestones';

export interface ChatModalsProps {
  characterId: string;
  character: Character | null;
  relationship: RelationshipInfo | null;
  relationshipId: string | null;

  // Onboarding
  showOnboarding: boolean;
  onStartChat: (userProfile?: UserProfile) => void;

  // Gift
  showGift: boolean;
  onCloseGift: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setCurrentEmotion: (emotion: string) => void;

  // Realtime Call
  showCall: boolean;
  onCloseCall: () => void;

  // Memory Peek
  showMemoryPeek: boolean;
  memoryData: {
    factMemory: { fact: string; source: string; confidence: number; updatedAt: string }[];
    episodeMemory: { summary: string; date: string; emotion: string; importance: number }[];
    emotionMemory: { topic: string; userEmotion: string; characterReaction: string; date: string }[];
    preferences: { likes: string[]; dislikes: string[] };
    userName?: string;
    totalMessages: number;
    firstMessageAt: string | null;
  } | null;
  memoryLoading: boolean;
  onCloseMemoryPeek: () => void;

  // Call Selection
  showCallModal: boolean;
  onCloseCallModal: () => void;
  onShowCallToast: () => void;

  // Menu
  showMenu: boolean;
  onCloseMenu: () => void;

  // Welcome Back
  showWelcomeBack: boolean;
  daysSinceLastChat: number;
  onDismissWelcomeBack: () => void;

  // Streak Break
  showStreakBreak: boolean;
  onCloseStreakBreak: () => void;
  onStreakRecovered: (newStreak: number) => void;

  // FC Success
  showFcSuccess: boolean;
  onCloseFcSuccess: () => void;

  // FC Subscribe
  showFcModal: boolean;
  onCloseFcModal: () => void;
  onFcSubscribe: () => Promise<void>;

  // Level Up
  levelUpData: { newLevel: number; milestone?: Milestone } | null;
  onCloseLevelUp: () => void;

  // Daily Event
  showDailyEvent: boolean;
  dailyEvent: { eventType: string; message: string; bonusCoins?: number; bonusXpMultiplier?: number; greeting?: string } | null;
  onCloseDailyEvent: () => void;
}

export function ChatModals({
  characterId,
  character,
  relationship,
  relationshipId,
  showOnboarding,
  onStartChat,
  showGift,
  onCloseGift,
  setMessages,
  setCurrentEmotion,
  showCall,
  onCloseCall,
  showMemoryPeek,
  memoryData,
  memoryLoading,
  onCloseMemoryPeek,
  showCallModal,
  onCloseCallModal,
  onShowCallToast,
  showMenu,
  onCloseMenu,
  showWelcomeBack,
  daysSinceLastChat,
  onDismissWelcomeBack,
  showStreakBreak,
  onCloseStreakBreak,
  onStreakRecovered,
  showFcSuccess,
  onCloseFcSuccess,
  showFcModal,
  onCloseFcModal,
  onFcSubscribe,
  levelUpData,
  onCloseLevelUp,
  showDailyEvent,
  dailyEvent,
  onCloseDailyEvent,
}: ChatModalsProps) {
  return (
    <>
      {/* オンボーディングオーバーレイ */}
      {showOnboarding && character && (
        <OnboardingOverlay character={character} onStart={onStartChat} />
      )}

      {/* 🎁 ギフトパネル */}
      {character && (
        <GiftPanel
          characterId={characterId}
          characterName={character.name}
          isOpen={showGift}
          onClose={onCloseGift}
          onGiftSent={(reaction, giftEmoji) => {
            const giftMsg: Message = {
              id: `gift-${Date.now()}`,
              role: 'CHARACTER',
              content: `${giftEmoji} ${reaction}`,
              createdAt: new Date().toISOString(),
              metadata: { emotion: 'excited' },
            };
            setMessages((prev) => [...prev, giftMsg]);
            setCurrentEmotion('excited');
          }}
        />
      )}

      {/* 📞 通話モーダル */}
      {showCall && character && (
        <RealtimeCallModal
          characterId={characterId}
          characterName={character.name}
          characterAvatar={character.avatarUrl}
          onClose={onCloseCall}
        />
      )}

      {/* 🧠 記憶ペークモーダル */}
      <MemoryPeekModal
        isOpen={showMemoryPeek}
        memoryData={memoryData}
        memoryLoading={memoryLoading}
        characterName={character?.name}
        onClose={onCloseMemoryPeek}
      />

      {/* 📞 通話選択モーダル */}
      <CallSelectionModal
        show={showCallModal}
        character={character}
        onClose={onCloseCallModal}
        onShowCallToast={onShowCallToast}
      />

      {/* ≡ メニューパネル */}
      <ChatMenu
        character={character}
        relationship={relationship}
        characterId={characterId}
        isOpen={showMenu}
        onClose={onCloseMenu}
      />

      {/* 復帰時演出オーバーレイ */}
      {showWelcomeBack && character && (
        <WelcomeBackOverlay
          characterName={character.name}
          characterAvatarUrl={character.avatarUrl ?? null}
          daysSinceLastChat={daysSinceLastChat}
          onDismiss={onDismissWelcomeBack}
        />
      )}

      {/* ストリーク途切れ */}
      {showStreakBreak && character && relationship && (
        <StreakBreakPopup
          characterSlug={character.slug ?? 'luffy'}
          characterName={character.name}
          relationshipId={relationshipId ?? ''}
          previousStreak={relationship.previousStreakDays ?? relationship.streakDays ?? 0}
          onClose={onCloseStreakBreak}
          onRecovered={onStreakRecovered}
        />
      )}

      {/* FC加入決済完了お祝いモーダル */}
      <FcSuccessModal
        show={showFcSuccess}
        character={character}
        onClose={onCloseFcSuccess}
      />

      {/* FC加入ポップアップ */}
      {showFcModal && character && (
        <FcSubscribeModal
          characterName={character.name}
          characterAvatar={character.avatarUrl ?? undefined}
          fcMonthlyPriceJpy={character.fcMonthlyPriceJpy ?? 3480}
          fcIncludedCallMin={character.fcIncludedCallMin ?? 30}
          fcMonthlyCoins={character.fcMonthlyCoins ?? 500}
          onClose={onCloseFcModal}
          onSubscribe={onFcSubscribe}
        />
      )}

      {/* レベルアップモーダル */}
      {levelUpData && (
        <LevelUpModal
          newLevel={levelUpData.newLevel}
          levelName={RELATIONSHIP_LEVELS[Math.min(levelUpData.newLevel - 1, RELATIONSHIP_LEVELS.length - 1)].name}
          milestone={levelUpData.milestone}
          onClose={onCloseLevelUp}
        />
      )}

      {/* デイリーイベント演出 */}
      {showDailyEvent && dailyEvent && dailyEvent.eventType === 'good' && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          style={{ animation: 'fadeInUp 0.5s ease-out' }}
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl px-8 py-6 text-center border border-amber-400/60 pointer-events-auto"
            style={{ boxShadow: '0 0 40px rgba(251,191,36,0.3)', animation: 'glowPulse 2s ease-in-out infinite' }}
          >
            <div className="text-2xl font-bold mb-2 text-amber-400">✨ 今日はいい日！</div>
            <div className="text-gray-300 text-sm">{dailyEvent.message || dailyEvent.greeting || 'キャラのテンションが特別高い日！'}</div>
            {dailyEvent.bonusCoins && (
              <div className="mt-3 text-amber-400 font-semibold">+{dailyEvent.bonusCoins} コイン獲得！</div>
            )}
          </div>
        </div>
      )}
      {showDailyEvent && dailyEvent && (dailyEvent.eventType === 'rare' || dailyEvent.eventType === 'ultra_rare') && (
        <DailyEventPopup
          eventType={dailyEvent.eventType as 'rare' | 'ultra_rare'}
          message={dailyEvent.message ?? ''}
          characterGreeting={dailyEvent.greeting ?? undefined}
          bonusCoins={dailyEvent.bonusCoins}
          bonusXpMultiplier={dailyEvent.bonusXpMultiplier}
          onClose={onCloseDailyEvent}
        />
      )}
    </>
  );
}
