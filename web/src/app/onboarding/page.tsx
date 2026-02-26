'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';

import { useOnboarding, type CharacterData, type ChatMessage } from '@/hooks/useOnboarding';
import PhaseWelcome from '@/components/onboarding/PhaseWelcome';
import CharacterSelect from '@/components/onboarding/CharacterSelect';
import PhaseNickname from '@/components/onboarding/PhaseNickname';
import PhaseApproval from '@/components/onboarding/PhaseApproval';
import PhaseFirstChat from '@/components/onboarding/PhaseFirstChat';
import PhaseHook from '@/components/onboarding/PhaseHook';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';

// ─────────────────────────────────────────────
// Inner component (uses useSearchParams inside Suspense)
// ─────────────────────────────────────────────

function OnboardingInner() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [initialized, setInitialized] = useState(false);
  const [deeplinkCharacter, setDeeplinkCharacter] = useState<CharacterData | null>(null);
  const [deeplinkSlug, setDeeplinkSlug] = useState<string | undefined>(undefined);
  const [isSelectingCharacter, setIsSelectingCharacter] = useState(false);
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  const {
    state,
    advance,
    selectCharacter,
    saveNickname,
    completeOnboarding,
    addMessage,
  } = useOnboarding(deeplinkCharacter ?? undefined, deeplinkSlug);

  // ── 認証チェック ──────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/login');
    }
  }, [session, status, router]);

  // ── ディープリンク初期化 ───────────────────
  useEffect(() => {
    if (initialized || status === 'loading' || !session) return;

    const fromParam = searchParams.get('from');
    const slug = fromParam?.replace('/c/', '');

    const init = async () => {
      if (slug) {
        try {
          // キャラクター情報をスラッグから取得
          const res = await fetch(`/api/characters/${slug}`);
          if (res.ok) {
            const data = await res.json();
            const c = data.character ?? data;
            const char: CharacterData = {
              id: c.id ?? '',
              name: c.name ?? '',
              slug: slug,
              avatarUrl: c.avatarUrl ?? null,
              franchise: c.franchise ?? '',
            };
            setDeeplinkCharacter(char);
            setDeeplinkSlug(slug);

            // DBに記録
            await fetch('/api/onboarding/init-deeplink', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug, characterId: char.id }),
            });
          }
        } catch {
          // ディープリンク解決失敗は無視して汎用フローへ
        }
      }

      // 途中離脱のリカバリー
      const user = session.user as { onboardingStep?: string | null };
      if (user.onboardingStep === 'completed') {
        router.replace('/explore');
        return;
      }

      setInitialized(true);
    };

    init();
  }, [session, status, searchParams, initialized, router]);

  // ── Phase遷移ハンドラー ─────────────────────

  const handleWelcomeComplete = () => {
    advance();
  };

  const handleCharacterSelectComplete = async (character: CharacterData) => {
    setIsSelectingCharacter(true);
    try {
      await selectCharacter(character);
    } finally {
      setIsSelectingCharacter(false);
    }
  };

  const handleNicknameComplete = async (nickname: string) => {
    setIsSavingNickname(true);
    try {
      await saveNickname(nickname);
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleApprovalComplete = () => {
    advance();
  };

  const handleFirstChatComplete = async (history: ChatMessage[]) => {
    // オンボーディング会話をDBに永続化（チャット画面で継続できるように）
    if (selectedCharacter?.id && history.length > 0) {
      try {
        await fetch('/api/onboarding/persist-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: selectedCharacter.id,
            messages: history,
          }),
        });
      } catch (e) {
        console.error('Failed to persist onboarding chat:', e);
      }
    }
    advance();
  };

  const handleHookComplete = async (notificationPermission: boolean | null) => {
    const redirectTo = await completeOnboarding(notificationPermission);
    // JWTのonboardingStepを更新（proxyが/onboardingにリダイレクトしないように）
    await update();
    // router.replaceだとJWTクッキー更新が反映される前にproxyが旧JWTを読むことがある
    // window.location.hrefで強制フルリロードし、サーバー側で最新JWTを使わせる
    window.location.href = redirectTo;
  };

  // ── ローディング状態 ───────────────────────
  if (status === 'loading' || !initialized) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(139,92,246,0.5)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!session) return null;

  const { phase, nickname, selectedCharacter } = state;
  const effectiveCharacter = selectedCharacter ?? deeplinkCharacter;
  const isDeepLink = !!deeplinkCharacter;

  return (
    <div className="fixed inset-0 bg-black">
      {/* プログレスインジケーター */}
      <OnboardingProgress currentPhase={phase} isDeepLink={isDeepLink} />

      {/* Phase レンダリング */}
      <AnimatePresence mode="wait">
        {phase === 'welcome' && (
          <PhaseWelcome
            key="welcome"
            character={effectiveCharacter}
            onComplete={handleWelcomeComplete}
          />
        )}

        {phase === 'character_select' && (
          <CharacterSelect
            key="character_select"
            onSelect={handleCharacterSelectComplete}
            isLoading={isSelectingCharacter}
          />
        )}

        {phase === 'nickname' && (
          <PhaseNickname
            key="nickname"
            character={effectiveCharacter}
            onComplete={handleNicknameComplete}
            isLoading={isSavingNickname}
          />
        )}

        {phase === 'approval' && (
          <PhaseApproval
            key="approval"
            character={effectiveCharacter}
            nickname={nickname}
            onComplete={handleApprovalComplete}
          />
        )}

        {phase === 'first_chat' && (
          <PhaseFirstChat
            key="first_chat"
            character={effectiveCharacter}
            nickname={nickname}
            onComplete={handleFirstChatComplete}
          />
        )}

        {phase === 'hook' && (
          <PhaseHook
            key="hook"
            character={effectiveCharacter}
            nickname={nickname}
            onComplete={handleHookComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// Export: useSearchParams requires Suspense boundary
// ─────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(139,92,246,0.5)', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  );
}
