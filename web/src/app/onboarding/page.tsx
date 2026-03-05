'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';

import { useOnboarding, type CharacterData, type ChatMessage, type OnboardingPhase } from '@/hooks/useOnboarding';
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
    setState,
    advance,
    goToPhase,
    selectCharacter,
    saveNickname,
    completeOnboarding,
    addMessage,
  } = useOnboarding(deeplinkCharacter ?? undefined, deeplinkSlug);

  // ── 認証チェック（セッション確立を待つ） ──────────────────────────
  const [authRetries, setAuthRetries] = useState(0);
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      // JWT確立直後はsessionがnullの場合がある — 少し待ってリトライ
      if (authRetries < 3) {
        const t = setTimeout(() => {
          setAuthRetries(r => r + 1);
          update(); // セッション再取得
        }, 800);
        return () => clearTimeout(t);
      }
      router.replace('/login');
    }
  }, [session, status, router, authRetries, update]);

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

      // 途中離脱のリカバリー: DBの状態を復元
      let stateRestored = false;
      let savedCharacterFromDB: { id: string; name: string; slug: string; avatarUrl: string | null; franchise?: string } | null = null;
      try {
        const stateRes = await fetch('/api/onboarding/state');
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          if (stateData.success && stateData.data) {
            const { phase, nickname: savedNickname, character: savedCharacter, deeplinkSlug: savedSlug } = stateData.data;
            if (savedCharacter) savedCharacterFromDB = savedCharacter;

            if (phase === 'completed') {
              // 完了済み: JWTを必ず更新してからフルリロード（proxyがonboardingにリダイレクトしないように）
              await update();
              window.location.href = '/explore';
              return;
            }

            // DBに保存されたキャラクター情報を復元
            if (savedCharacter && !deeplinkCharacter) {
              const char: CharacterData = {
                id: savedCharacter.id,
                name: savedCharacter.name,
                slug: savedCharacter.slug,
                avatarUrl: savedCharacter.avatarUrl,
                franchise: savedCharacter.franchise ?? '',
              };
              setDeeplinkCharacter(char);
              if (savedSlug) setDeeplinkSlug(savedSlug);
            }

            // DBのphaseに基づいてstateを復元
            if (phase && phase !== 'welcome') {
              const validPhases: OnboardingPhase[] = ['welcome', 'character_select', 'nickname', 'approval', 'first_chat', 'hook'];
              if (validPhases.includes(phase as OnboardingPhase)) {
                // キャラ選択済みならcharacter_selectをスキップ、nickname既入力ならnicknameもスキップ
                let resumePhase = phase;
                // first_chat は廃止済み → hook にスキップ
                if (resumePhase === 'first_chat') resumePhase = 'hook';
                if (phase === 'character_select' && savedCharacter) resumePhase = 'nickname';
                if (resumePhase === 'nickname' && savedNickname) resumePhase = 'approval';
                stateRestored = true;
                setState((prev) => ({
                  ...prev,
                  phase: resumePhase as OnboardingPhase,
                  nickname: savedNickname ?? '',
                  selectedCharacter: savedCharacter ? {
                    id: savedCharacter.id,
                    name: savedCharacter.name,
                    slug: savedCharacter.slug,
                    avatarUrl: savedCharacter.avatarUrl,
                    franchise: savedCharacter.franchise ?? '',
                  } : null,
                  isDeepLink: !!savedSlug || !!savedCharacter,
                }));
              }
            }
          }
        }
      } catch {
        // state取得失敗は無視して最初から
      }

      // JWTのonboardingStep確認（フォールバック）
      const user = session.user as { onboardingStep?: string | null };
      if (user.onboardingStep === 'completed') {
        router.replace('/explore');
        return;
      }

      // ディープリンクキャラが見つかった場合、hookのstateを同期
      // (useOnboardingのuseStateは初期値のみ参照するため、非同期で取得した値を反映する必要がある)
      if (slug && !stateRestored) {
        // stateRestoredフラグ: DB復元が既にsetStateした場合はスキップ
        // ここに来るのはDBにstateがない（新規ユーザー）場合
        if (slug) {
          try {
            const charRes = await fetch(`/api/characters/${slug}`);
            if (charRes.ok) {
              const charData = await charRes.json();
              const c = charData.character ?? charData;
              setState((prev) => ({
                ...prev,
                isDeepLink: true,
                selectedCharacter: prev.selectedCharacter ?? {
                  id: c.id ?? '',
                  name: c.name ?? '',
                  slug: slug,
                  avatarUrl: c.avatarUrl ?? null,
                  franchise: c.franchise ?? '',
                },
              }));
            }
          } catch { /* ignore */ }
        } else if (savedCharacterFromDB) {
          // URLにfromパラメータがない（callbackUrl喪失等）が、DBにキャラが保存されている場合
          // → signup時のcallbackUrlが失われてもdeeplinkを復元する
          setState((prev) => ({
            ...prev,
            isDeepLink: true,
            selectedCharacter: prev.selectedCharacter ?? {
              id: savedCharacterFromDB!.id,
              name: savedCharacterFromDB!.name,
              slug: savedCharacterFromDB!.slug,
              avatarUrl: savedCharacterFromDB!.avatarUrl,
              franchise: savedCharacterFromDB!.franchise ?? '',
            },
          }));
        }
      }

      // ゲスト体験でニックネーム入力済みならスキップ
      try {
        const guestNickname = sessionStorage.getItem('aniva_guest_nickname');
        if (guestNickname) {
          setState((prev) => {
            // ニックネームをセットし、nicknameフェーズなら次へスキップ
            const updated = { ...prev, nickname: guestNickname };
            if (prev.phase === 'nickname') {
              updated.phase = 'approval';
            } else if (prev.phase === 'welcome' && prev.selectedCharacter) {
              // welcomeでキャラ選択済み（ディープリンク等）ならnickname & character_selectスキップ
              updated.phase = 'approval';
            }
            return updated;
          });
          // DB にもニックネームを保存
          fetch('/api/onboarding/nickname', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: guestNickname }),
          }).catch(() => {});
          sessionStorage.removeItem('aniva_guest_nickname');
        }
      } catch {}

      setInitialized(true);
    };

    init();
  }, [session, status, searchParams, initialized, router]);

  // ── nicknameフェーズ自動スキップ（既にnickname/nameがある場合） ──────
  // ゲスト体験で名前入力済みのユーザーがsignup後にオンボーディングに来た場合、
  // session.user.name または state.nickname が存在すればnicknameフェーズを自動スキップする
  useEffect(() => {
    if (!initialized || state.phase !== 'nickname') return;
    const sessionName = (session?.user as { name?: string | null })?.name;
    const existingNickname = state.nickname || sessionName;
    if (existingNickname) {
      setState(prev => ({
        ...prev,
        nickname: prev.nickname || existingNickname,
        phase: 'approval',
      }));
    }
  }, [initialized, state.phase, state.nickname, session?.user]);

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
    // 短いウェイトでクッキーの書き込みが確実に完了するのを待つ
    await new Promise((resolve) => setTimeout(resolve, 300));
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

        {/* first_chat フェーズは廃止済み: このstateになったら即hookへスキップ */}
        {phase === 'first_chat' && (() => {
          // レンダリングと同時にhookへ強制移行
          setTimeout(() => goToPhase('hook'), 0);
          return null;
        })()}

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
