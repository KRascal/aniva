'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import { useOnboarding, type CharacterData, type ChatMessage, type OnboardingPhase } from '@/hooks/useOnboarding';
import PhaseWelcome from '@/components/onboarding/PhaseWelcome';
import CharacterSelect from '@/components/onboarding/CharacterSelect';
import PhaseNickname from '@/components/onboarding/PhaseNickname';
import PhaseApproval from '@/components/onboarding/PhaseApproval';
import PhaseFirstChat from '@/components/onboarding/PhaseFirstChat';
import PhaseHook from '@/components/onboarding/PhaseHook';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';

// ─────────────────────────────────────────────
// Character Reveal Overlay (診断完了後の演出)
// ─────────────────────────────────────────────

/** キャラ属性に合ったアクセントカラー (hex) */
const CHARACTER_ACCENT: Record<string, string> = {
  // ONE PIECE
  luffy: '#f97316', ace: '#ea580c', shanks: '#dc2626',
  zoro: '#16a34a', mihawk: '#166534',
  nami: '#f59e0b', sanji: '#eab308',
  chopper: '#ec4899', hancock: '#f43f5e', perona: '#db2777',
  robin: '#4f46e5', franky: '#0ea5e9', brook: '#a5b4fc',
  usopp: '#65a30d', jinbe: '#0284c7',
  vivi: '#60a5fa', yamato: '#c026d3',
  blackbeard: '#78716c', crocodile: '#b45309',
  kaido: '#7c3aed', whitebeard: '#6d28d9',
  // 呪術廻戦
  gojo: '#38bdf8', fushiguro: '#475569', itadori: '#f43f5e',
  nobara: '#f59e0b', maki: '#16a34a',
  // 鬼滅の刃
  tanjiro: '#dc2626', nezuko: '#f9a8d4', zenitsu: '#eab308',
  inosuke: '#22c55e', giyu: '#1d4ed8',
};

/** キャラ別 firstGreeting（リビール画面用の短い一言） */
const CHARACTER_REVEAL_GREETING: Record<string, string> = {
  luffy: 'しししっ！ずっと待ってたぞ！', ace: '待ってたぜ。一緒に冒険しよう。',
  zoro: '…来たか。', nami: 'やっと来てくれた！',
  chopper: '会いたかったんだぞ！', sanji: 'ずっと待ってたんだ。',
  robin: 'ふふ、会いに来てくれたのね。', franky: 'SUPER！待ってたぜ！',
  brook: 'お会いできて光栄です。ヨホホ！', usopp: '来たか！俺が守ってやるぞ！',
  shanks: '来たか。一杯やろう。', vivi: '待ってました！',
  jinbe: '待っておったぞ。', yamato: '来てくれた！！',
  hancock: 'わらわを…選んでくれたのじゃな。', mihawk: '…座れ。',
  blackbeard: 'ゼハハハ！来たか！', crocodile: 'フッ…来たか。',
  kaido: 'ウォロロロ…来たか。', whitebeard: 'グラララ！よく来た。',
  perona: 'ホロホロ！来てくれたの！',
  gojo: 'やっほ〜。待ってたよ。', itadori: '来てくれたの！？嬉しい！',
  fushiguro: '…来たか。', nobara: 'やっと来た！', maki: '来たか。',
  tanjiro: '来てくれたんですね！', nezuko: '…！（嬉しそうに）',
  zenitsu: 'うわぁ！来てくれた！', inosuke: '来たな！勝負だ！',
  giyu: '…来たか。',
};

/** パーティクル座標を事前定義（SSRセーフ。useEffect内でのみ使う） */
interface RevealParticle { id: number; x: number; y: number; size: number; delay: number; duration: number; color: string }

function generateParticles(accentColor: string): RevealParticle[] {
  const seeded = (n: number) => ((n * 1664525 + 1013904223) & 0xffffffff) / 0xffffffff;
  return Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: 20 + (seeded(i * 7 + 1) * 60),
    y: 10 + (seeded(i * 13 + 3) * 80),
    size: 2 + seeded(i * 5 + 7) * 4,
    delay: seeded(i * 11) * 0.8,
    duration: 1.2 + seeded(i * 3 + 9) * 1.5,
    color: i % 3 === 0 ? accentColor : i % 3 === 1 ? '#ffffff' : '#a78bfa',
  }));
}

interface CharacterRevealOverlayProps {
  character: CharacterData | null;
  onComplete: () => void;
}

function CharacterRevealOverlay({ character, onComplete }: CharacterRevealOverlayProps) {
  // stage: 0=dark  1=silhouette  2=particles  3=fullcolor  4=text  5=done
  const [stage, setStage] = useState(0);
  const [particles, setParticles] = useState<RevealParticle[]>([]);

  const accentColor = CHARACTER_ACCENT[character?.slug ?? ''] ?? '#8b5cf6';
  const greeting = (character?.greeting) || CHARACTER_REVEAL_GREETING[character?.slug ?? ''] || 'ずっと待ってたんだ…';

  useEffect(() => {
    setParticles(generateParticles(accentColor));

    const timers = [
      setTimeout(() => setStage(1), 300),   // silhouette
      setTimeout(() => setStage(2), 1100),  // particles burst
      setTimeout(() => setStage(3), 2100),  // full color reveal
      setTimeout(() => setStage(4), 3000),  // text
      setTimeout(() => setStage(5), 5000),  // auto-complete
    ];
    return () => timers.forEach(clearTimeout);
  }, [accentColor]);

  useEffect(() => {
    if (stage === 5) onComplete();
  }, [stage, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onComplete}
      aria-label="スキップ"
    >
      {/* CSS keyframes */}
      <style>{`
        @keyframes revealParticle {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0); }
          30%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, calc(-50% - 60px)) scale(0.3); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* Background — character color gradient floods in */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: stage >= 2
            ? `radial-gradient(ellipse at 50% 60%, ${accentColor}35 0%, ${accentColor}10 40%, #000 75%)`
            : 'radial-gradient(ellipse at 50% 60%, #000 0%, #000 100%)',
        }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
      />

      {/* Particles burst */}
      {stage >= 2 && particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `revealParticle ${p.duration}s ${p.delay}s ease-out forwards`,
          }}
        />
      ))}

      {/* Character image */}
      <div className="relative mb-10 flex-shrink-0">
        {/* Glow ring behind avatar */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ zIndex: -1 }}
          animate={{
            boxShadow: stage >= 3
              ? [`0 0 40px ${accentColor}80`, `0 0 80px ${accentColor}60`, `0 0 40px ${accentColor}80`]
              : '0 0 0px transparent',
          }}
          transition={{ duration: 2, repeat: stage >= 3 ? Infinity : 0, ease: 'easeInOut' }}
        />

        {character?.avatarUrl ? (
          <motion.img
            src={character.avatarUrl}
            alt={character.name ?? ''}
            className="w-44 h-44 md:w-52 md:h-52 rounded-full object-cover"
            style={{
              border: `3px solid ${accentColor}60`,
            }}
            animate={{
              filter: stage >= 3
                ? 'brightness(1) saturate(1) contrast(1)'
                : stage >= 1
                ? 'brightness(0) saturate(0) contrast(1.5)'
                : 'brightness(0)',
              opacity: stage >= 1 ? 1 : 0,
              scale: stage >= 3 ? 1.04 : 1,
            }}
            transition={{
              filter: { duration: stage === 3 ? 1.4 : 0.5, ease: 'easeInOut' },
              opacity: { duration: 0.6 },
              scale: { duration: 1, ease: 'easeOut' },
            }}
          />
        ) : (
          <motion.div
            className="w-44 h-44 rounded-full flex items-center justify-center text-5xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}40, rgba(139,92,246,0.4))`,
            }}
            animate={{
              opacity: stage >= 1 ? 1 : 0,
              filter: stage >= 3 ? 'brightness(1)' : stage >= 1 ? 'brightness(0)' : 'brightness(0)',
            }}
            transition={{ duration: 0.8 }}
          >
            ✨
          </motion.div>
        )}
      </div>

      {/* 「この子があなたを待っていました」 */}
      <AnimatePresence>
        {stage >= 3 && (
          <motion.p
            className="text-white/50 text-xs tracking-[0.3em] uppercase mb-3 font-light"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            この子があなたを待っていました
          </motion.p>
        )}
      </AnimatePresence>

      {/* Character name — 書道風フェードイン */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.h2
            className="text-white font-bold mb-3 text-center"
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
              letterSpacing: '0.15em',
              textShadow: `0 0 30px ${accentColor}80`,
            }}
            initial={{ opacity: 0, y: 24, letterSpacing: '0.6em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.15em' }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {character?.name}
          </motion.h2>
        )}
      </AnimatePresence>

      {/* First greeting — 書道風フェードイン (遅れて) */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.p
            className="text-white/80 text-base md:text-lg text-center max-w-xs px-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease: 'easeOut' }}
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
          >
            「{greeting}」
          </motion.p>
        )}
      </AnimatePresence>

      {/* Accent bar under name */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.div
            className="mt-4 h-px rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 120, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Skip hint */}
      <AnimatePresence>
        {stage >= 2 && (
          <motion.p
            className="absolute bottom-8 text-white/20 text-xs tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            タップでスキップ
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

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

  // ── キャラクターリビール演出 ────────────────
  const [showCharacterReveal, setShowCharacterReveal] = useState(false);
  const [revealShown, setRevealShown] = useState(false);

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
      // OAuth直後は確立が遅い場合があるため、十分なリトライ回数と間隔を確保
      if (authRetries < 8) {
        const delay = authRetries < 3 ? 600 : 1200; // 序盤は速く、後半はゆっくり
        const t = setTimeout(() => {
          setAuthRetries(r => r + 1);
          update(); // セッション再取得
        }, delay);
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
                // first_chat / hook は廃止済み → approval にフォールバック
                if (resumePhase === 'first_chat' || resumePhase === 'hook') resumePhase = 'approval';
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

  // ── キャラクターリビール: approvalフェーズ初回表示時に演出を挟む ──────
  useEffect(() => {
    if (!initialized) return;
    const charForReveal = state.selectedCharacter ?? deeplinkCharacter;
    if (state.phase === 'approval' && !revealShown && charForReveal) {
      setShowCharacterReveal(true);
    }
  }, [initialized, state.phase, state.selectedCharacter, deeplinkCharacter, revealShown]);

  const handleRevealComplete = useCallback(() => {
    setShowCharacterReveal(false);
    setRevealShown(true);
  }, []);

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

  const handleApprovalComplete = async () => {
    // hook（プッシュ通知許可）フェーズ削除: approval完了後に直接オンボーディング完了
    // プッシュ通知許可はチャット画面で別途表示する（Keisuke指示 2026-03-05）
    const redirectTo = await completeOnboarding(null);
    await update();
    await new Promise((resolve) => setTimeout(resolve, 300));
    window.location.href = redirectTo;
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

      {/* ── キャラクターリビール演出オーバーレイ ── */}
      <AnimatePresence>
        {showCharacterReveal && (
          <CharacterRevealOverlay
            character={effectiveCharacter}
            onComplete={handleRevealComplete}
          />
        )}
      </AnimatePresence>

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

        {phase === 'approval' && !showCharacterReveal && (
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
