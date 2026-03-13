'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { track, EVENTS } from '@/lib/analytics';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { LevelUpModal } from '@/components/chat/LevelUpModal';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import type { Message, Character } from '@/components/chat/ChatMessageList';
import { OnboardingOverlay, type UserProfile } from '@/components/chat/OnboardingOverlay';
import { CallModal } from '@/components/chat/CallModal';
import { RealtimeCallModal } from '@/components/chat/RealtimeCallModal';
import { GiftPanel } from '@/components/chat/GiftPanel';
import { playSound, vibrateLevelUp, vibrateReaction, vibrateSend, vibrateEmotion } from '@/lib/sound-effects';
import Live2DViewer from '@/components/live2d/Live2DViewer';
import EmotionIndicator from '@/components/live2d/EmotionIndicator';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { LUFFY_MILESTONES, type Milestone } from '@/lib/milestones';
import { getCharacterTheme } from '@/lib/character-themes';
import { WelcomeBackModal } from '@/components/chat/WelcomeBackModal';
import { WelcomeBackOverlay } from '@/components/chat/WelcomeBackOverlay';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMenu } from '@/components/chat/ChatMenu';
import { ChatInput } from '@/components/chat/ChatInput';
import { FcSubscribeModal } from '@/components/chat/FcSubscribeModal';
import { rollRandomEvent, type RandomEvent } from '@/lib/random-events';
import { PushNotificationSetup } from '@/components/push/PushNotificationSetup';
import { useProactiveMessages } from '@/hooks/useProactiveMessages';
import { CountdownTimer } from '@/components/proactive/CountdownTimer';
import { useConversationEnd } from '@/hooks/useConversationEnd';
import { EndingMessage } from '@/components/chat/EndingMessage';
import { StreakBreakPopup } from '@/components/chat/StreakBreakPopup';
import { DailyEventPopup } from '@/components/reward/DailyEventPopup';
import { sleep, detectEmotionForDelay, REACTION_EMOTION, fetchReactionResponse, EMOTION_THEMES, GLOBAL_STYLES } from '@/components/chat/chatUtils';
import type { TextEmotion } from '@/components/chat/chatUtils';
import type { RelationshipInfo } from '@/components/chat/types';
import { MemoryPeekModal } from '@/components/chat/MemoryPeekModal';
import { CallSelectionModal } from '@/components/chat/CallSelectionModal';
import { FcSuccessModal } from '@/components/chat/FcSuccessModal';
import { MessageContextMenu } from '@/components/chat/MessageContextMenu';
import { TopicCard } from '@/components/chat/TopicCard';


/* ─────────────── メインページ ─────────────── */
export default function ChatCharacterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const characterId = params.characterId as string;

  /* ── 既存 state（変更なし） ── */
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [relationship, setRelationship] = useState<RelationshipInfo | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [memoryRecalledHint, setMemoryRecalledHint] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; milestone?: Milestone } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [shouldAutoGreet, setShouldAutoGreet] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [daysSinceLastChat, setDaysSinceLastChat] = useState(0);
  const [showStreakBreak, setShowStreakBreak] = useState(false);
  const [isGreeting, setIsGreeting] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  /* ── 深夜モード（23:00-6:00 JST） ── */
  const [isNightMode] = useState(() => {
    const h = new Date().getHours();
    return h >= 23 || h < 6;
  });

  /* ── プロアクティブメッセージ ── */
  const { messages: proactiveMessages, unreadCount: proactiveUnread, markAsRead: markProactiveRead } = useProactiveMessages();

  /* ── エンディングメッセージ（ピークエンドの法則） ── */
  const [endingMessage, setEndingMessage] = useState<{ content: string } | null>(null);

  const { onUserMessage: onUserMsgSent } = useConversationEnd({
    relationshipId: relationshipId,
    onEndingMessage: (msg) => {
      setEndingMessage({ content: msg.content });
      // メッセージリストにも追加
      const endMsg: Message = {
        id: msg.id,
        role: 'CHARACTER',
        content: msg.content,
        createdAt: msg.createdAt,
        metadata: { emotion: msg.metadata?.emotion ?? 'warm', isFarewell: true },
      };
      setMessages((prev) => {
        // 重複防止
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, endMsg];
      });
    },
    disabled: !relationshipId,
  });
  const charProactiveUnread = proactiveMessages.filter(
    (m) => m.characterId === characterId && !m.isRead
  ).length;

  /* ── 新規 UI state ── */
  const [showCall, setShowCall] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showComingSoonToast, setShowComingSoonToast] = useState(false);
  const [showMemoryPeek, setShowMemoryPeek] = useState(false);
  const [memoryData, setMemoryData] = useState<{
    factMemory: { fact: string; source: string; confidence: number; updatedAt: string }[];
    episodeMemory: { summary: string; date: string; emotion: string; importance: number }[];
    emotionMemory: { topic: string; userEmotion: string; characterReaction: string; date: string }[];
    preferences: { likes: string[]; dislikes: string[] };
    userName?: string;
    totalMessages: number;
    firstMessageAt: string | null;
  } | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [presence, setPresence] = useState<{ isAvailable: boolean; status: string; statusEmoji: string; statusMessage?: string | null } | null>(null);
  const [absenceBannerDismissed, setAbsenceBannerDismissed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFcModal, setShowFcModal] = useState(false);
  const [showFcSuccess, setShowFcSuccess] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [callToast, setCallToast] = useState(false);
  const [isViewerExpanded, setIsViewerExpanded] = useState(false); // デフォルト縮小
  const [isSendBouncing, setIsSendBouncing] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  // キャラのテーマカラー（感情に応じて変化）
  // 深夜モード（23:00-3:00）: 暖色系の特別な雰囲気
  const isLateNight = (() => { const h = new Date().getHours(); return h >= 23 || h < 3; })();
  const [bgTheme, setBgTheme] = useState<string>(
    isLateNight
      ? 'rgba(180,83,9,0.08), rgba(153,27,27,0.05)' // 暖色（深夜の親密さ）
      : 'rgba(88,28,135,0.06), rgba(0,0,0,0)'
  );
  const [charBgGradient, setCharBgGradient] = useState<string>('');
  // 感情エフェクト
  const [hungryEmojis, setHungryEmojis] = useState<{ id: number; x: number; delay: number }[]>([]);
  const [showStars, setShowStars] = useState(false);
  const [heartEmojis, setHeartEmojis] = useState<{ id: number; x: number; delay: number; emoji: string }[]>([]);
  const [lastEmotionMsgId, setLastEmotionMsgId] = useState<string | null>(null);
  // Free plan 残りメッセージ（後方互換）
  const [userPlan, setUserPlan] = useState<string>('UNKNOWN');
  const [todayMsgCount, setTodayMsgCount] = useState(0);
  const [randomEvent, setRandomEvent] = useState<RandomEvent | null>(null);
  // 絆XPフロートアニメーション（チャット送信後に+XP表示）
  const [xpFloat, setXpFloat] = useState<{ amount: number; id: number } | null>(null);
  const prevXpRef = useRef<number>(0);
  // コイン残高（チャット送信後に更新）
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [dailyEvent, setDailyEvent] = useState<{ eventType: string; message: string; bonusCoins?: number; bonusXpMultiplier?: number; greeting?: string } | null>(null);
  const [showDailyEvent, setShowDailyEvent] = useState(false);

  /* ── モーメントtopicパラメータ対応 ── */
  const [topicCardVisible, setTopicCardVisible] = useState(false);
  const [topicText, setTopicText] = useState('');

  /* ── メッセージ長押しコンテキストメニュー ── */
  const [ctxMenu, setCtxMenu] = useState<{ msgId: string; content: string } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMsgLongPressStart = useCallback((msgId: string, content: string) => {
    longPressTimer.current = setTimeout(() => {
      setCtxMenu({ msgId, content });
    }, 500);
  }, []);

  const handleMsgLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleCopyMsg = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setShareToast('コピーしました ✓');
      setTimeout(() => setShareToast(null), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setShareToast('コピーしました ✓');
      setTimeout(() => setShareToast(null), 2000);
    }
    setCtxMenu(null);
  }, []);

  const handleBookmarkMsg = useCallback((msgId: string, content: string) => {
    try {
      const key = 'aniva_bookmarks';
      const existing: Array<{ id: string; characterId: string; characterName: string; avatarUrl: string | null; content: string; savedAt: number }> =
        JSON.parse(localStorage.getItem(key) ?? '[]');
      // 重複チェック
      if (!existing.find(b => b.id === msgId)) {
        existing.unshift({
          id: msgId,
          characterId: character?.id ?? '',
          characterName: character?.name ?? '',
          avatarUrl: character?.avatarUrl ?? null,
          content,
          savedAt: Date.now(),
        });
        // 最大50件
        if (existing.length > 50) existing.splice(50);
        localStorage.setItem(key, JSON.stringify(existing));
      }
      setShareToast('ブックマークしました 🔖');
      setTimeout(() => setShareToast(null), 2000);
    } catch {
      // ignore
    }
    setCtxMenu(null);
  }, [character]);

  const handleShareMsg = useCallback((content: string) => {
    if (navigator.share) {
      navigator.share({ text: content }).catch(() => {});
    } else {
      handleCopyMsg(content);
    }
    setCtxMenu(null);
  }, [handleCopyMsg]);

  /* ── リアクション → キャラ反応ハンドラ ── */
  const handleReaction = useCallback((msgId: string, emoji: string, _characterSlug: string) => {
    vibrateReaction(); // 軽い振動フィードバック
    if (!character?.id) return;

    // タイピングインジケータを即表示
    const typingMsg: Message = {
      id: `reaction-typing-${Date.now()}`,
      role: 'CHARACTER',
      content: '…',
      createdAt: new Date().toISOString(),
      metadata: { emotion: REACTION_EMOTION[emoji] ?? 'neutral', isTyping: true },
    };
    setMessages((prev) => [...prev, typingMsg]);

    // 直前のキャラメッセージを取得（文脈として渡す）
    const lastCharMsg = [...messages].reverse().find(m => m.role === 'CHARACTER')?.content;

    // LLM APIで動的生成
    fetchReactionResponse(character.id, emoji, lastCharMsg).then((responseText) => {
      const reactionResponseMsg: Message = {
        id: `reaction-res-${Date.now()}`,
        role: 'CHARACTER',
        content: responseText,
        createdAt: new Date().toISOString(),
        metadata: { emotion: REACTION_EMOTION[emoji] ?? 'neutral' },
      };
      setMessages((prev) => prev.filter(m => m.id !== typingMsg.id).concat(reactionResponseMsg));
      playSound('message_receive');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, messages]);

  /* ── refs ── */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 送信フライト中フラグ（delay中のダブル送信防止） */
  const inFlightRef = useRef(false);
  const pendingAutoSendRef = useRef(false);

  /* ─────────── 音声ミニプレーヤー制御 ─────────── */
  const handleAudioToggle = useCallback((messageId: string, audioUrl: string) => {
    if (playingAudioId === messageId) {
      // 同じメッセージ → 停止
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      // 別メッセージ → 切り替え
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(() => setPlayingAudioId(null));
      setPlayingAudioId(messageId);
    }
  }, [playingAudioId]);

  // ページ離脱時に音声停止
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // Safari bfcache対策 + Stripe戻り対策
  useEffect(() => {
    // bfcache復元時はフルリロード
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    // Stripe等から戻った時にデータ再取得（visibilitychange + focus両方）
    const refetchState = () => {
      fetch('/api/coins/balance').then(r => r.json()).then(d => {
        if (d.balance !== undefined) setCoinBalance(d.balance);
      }).catch(() => {});
      if (characterId) {
        fetch(`/api/relationship/${characterId}`).then(r => r.json()).then(d => {
          if (d.relationship) {
            setRelationship(d.relationship);
            if (d.relationship.id) setRelationshipId(d.relationship.id);
          }
        }).catch(() => {});
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refetchState();
    };
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', refetchState);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', refetchState);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [characterId]);

  /* FC決済完了後のお祝いモーダル表示 / プロフィールからのFC加入リダイレクト */
  useEffect(() => {
    if (searchParams.get('fc_success') === '1') {
      setShowFcSuccess(true);
      router.replace(`/chat/${characterId}`);
    }
    if (searchParams.get('openFc') === '1') {
      setShowFcModal(true);
      router.replace(`/chat/${characterId}`);
    }
  }, [searchParams, characterId, router]);

  /* モーメントtopicパラメータ対応 — キャラ読込後にプリセット */
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (!topicParam || !character) return;
    const truncated = topicParam.slice(0, 100);
    setTopicText(truncated);

    // 手紙から来た場合: 内容を引用してチャット入力にセット
    const fromLetter = searchParams.get('fromLetter') === '1';
    if (fromLetter) {
      setInputText(`「${truncated}」…この手紙、すごく嬉しかった。直接返事したくて`);
      setTopicCardVisible(false);
      return;
    }

    // ストーリーから来た場合: ワンタップで自動送信（チュートリアルもスキップ）
    const fromStory = searchParams.get('fromStory') === '1';
    if (fromStory) {
      const autoMsg = `「${truncated}」…その話、もっと聞かせて`;
      setInputText(autoMsg);
      // チュートリアルをスキップ
      try {
        const stored = localStorage.getItem('aniva_tutorial_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.step < 6) {
            parsed.step = 6;
            localStorage.setItem('aniva_tutorial_v1', JSON.stringify(parsed));
          }
        } else {
          localStorage.setItem('aniva_tutorial_v1', JSON.stringify({ step: 6 }));
        }
      } catch { /* ignore */ }
      // 自動送信フラグをセット（useEffectで送信）
      pendingAutoSendRef.current = true;
      setTopicCardVisible(false);
      return; // topicカードは表示しない — 即送信
    } else {
      setInputText(`${character.name}のタイムラインの「${truncated}」について話したいんだけど`);
    }
    setTopicCardVisible(true);
  // character変化のたびに再実行しないよう character.name のみ依存
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.name]);

  /* ─────────── 既存ロジック（変更なし） ─────────── */
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/chat/${characterId}`)}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string; email?: string };
      if (user.id) setUserId(user.id);
    }
  }, [session]);

  useEffect(() => {
    if (!characterId) return;
    let retries = 0;
    const fetchChar = () => {
      fetch(`/api/characters/id/${characterId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.character) setCharacter(data.character);
          else if (retries < 2) { retries++; setTimeout(fetchChar, 1000); }
        })
        .catch(() => { if (retries < 2) { retries++; setTimeout(fetchChar, 1000); } });
    };
    fetchChar();
  }, [characterId]);

  // チャット画面を開いた時刻をlocalStorageに記録（未読バッジのクリア用）
  useEffect(() => {
    if (!characterId || typeof window === 'undefined') return;
    localStorage.setItem(`aniva_chat_visited_${characterId}`, Date.now().toString());
    track(EVENTS.CHAT_OPENED, { characterId });
  }, [characterId]);

  // プレゼンス（オンライン状態）取得
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/${characterId}/presence`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.presence) { setPresence(data.presence); setAbsenceBannerDismissed(false); } })
      .catch(() => {});
  }, [characterId]);

  // キャラクターテーマを背景に適用
  useEffect(() => {
    const slug = character?.slug ?? relationship?.character?.slug;
    if (!slug) return;
    const theme = getCharacterTheme(slug);
    const el = document.querySelector('.chat-bg') as HTMLElement | null;
    setCharBgGradient(theme.bgGradient);
  }, [character?.slug, relationship?.character?.slug]);

  // ユーザープラン取得
  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => { if (data.plan) setUserPlan(data.plan); })
      .catch(() => {});
  }, []);

  const loadRelationshipAndHistory = useCallback(async () => {
    if (!userId || !characterId) return;
    try {
      const res = await fetch(`/api/chat/history-by-user?characterId=${characterId}&limit=50`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        // 本日のUSERメッセージ数を計算（Free plan の残り表示用）
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = (data.messages as Message[]).filter(
          (m) => m.role === 'USER' && new Date(m.createdAt) >= todayStart,
        ).length;
        setTodayMsgCount(todayCount);
      }
      if (data.relationship) {
        setRelationshipId(data.relationship.id);
        const relRes = await fetch(`/api/relationship/${characterId}`);
        const relData = await relRes.json();
        setRelationship(relData);
        prevXpRef.current = relData?.xp ?? 0;
        // relationship から character 情報を補完（character fetch が遅い/失敗した場合のフォールバック）
        if (!character && relData?.character) {
          const rc = relData.character;
          setCharacter({
            id: rc.id ?? characterId,
            name: rc.name ?? '',
            nameEn: rc.nameEn ?? null,
            slug: rc.slug ?? '',
            franchise: rc.franchise ?? '',
            franchiseEn: rc.franchiseEn ?? null,
            description: rc.description ?? null,
            avatarUrl: rc.avatarUrl ?? null,
            coverUrl: rc.coverUrl ?? null,
            catchphrases: rc.catchphrases ?? [],
            personalityTraits: rc.personalityTraits ?? [],
            hasVoice: !!(rc.voiceModelId && rc.voiceModelId.trim() !== ''),
          });
        }
        // 復帰時演出チェック
        if (relData.lastMessageAt) {
          const lastDate = new Date(relData.lastMessageAt);
          const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 3) {
            const shownKey = `welcomeBack_${characterId}_${new Date().toDateString()}`;
            if (!sessionStorage.getItem(shownKey)) {
              setDaysSinceLastChat(diffDays);
              setShowWelcomeBack(true);
              sessionStorage.setItem(shownKey, '1');
            }
          }
        }
        // FC誘導: 50通以上 & FC未加入 → 1日1回（15秒遅延で表示）
        if (relData.totalMessages >= 50 && !relData.isFanclub) {
          const fcPromptKey = `fcPrompt_${characterId}_${new Date().toDateString()}`;
          if (!sessionStorage.getItem(fcPromptKey)) {
            setTimeout(() => setShowFcModal(true), 15000);
            sessionStorage.setItem(fcPromptKey, '1');
          }
        }
        // ストリーク途切れチェック（3日以上連続していた場合のみ表示。0-2日は表示不要）
        if ((relData.previousStreakDays ?? 0) >= 3 && relData.isStreakActive === false && relData.totalMessages > 0) {
          const streakKey = `streakBreak_${characterId}_${new Date().toDateString()}`;
          if (!sessionStorage.getItem(streakKey)) {
            setShowStreakBreak(true);
            sessionStorage.setItem(streakKey, '1');
          }
        }
      }
      if (!data.relationship) {
        // 自動フォロー + オンボーディング完了: チャットページ到達 = このキャラと話したい意思表示
        try {
          const [followRes] = await Promise.all([
            fetch(`/api/relationship/${characterId}/follow`, { method: 'POST' }),
            fetch('/api/onboarding/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notificationPermission: null }),
            }),
          ]);
          if (followRes.ok) {
            // フォロー時にウェルカムメッセージ送信
            fetch(`/api/relationship/${characterId}/follow-welcome`, { method: 'POST' }).catch(() => {});
            const relRes2 = await fetch(`/api/relationship/${characterId}`);
            const relData2 = await relRes2.json();
            setRelationship(relData2);
            if (relData2?.id) setRelationshipId(relData2.id);
          }
        } catch (e) {
          console.error('Auto-follow failed:', e);
        }
        // ログイン済みユーザーは常にgreet直行（診断スキップ）
        // 診断は /c/[slug] のゲストオンボーディングフローでのみ実施
        if (!searchParams.get('fromStory')) {
          setShouldAutoGreet(true);
        }
      } else if (data.messages?.length === 0) {
        // メッセージ0（過去に関係はあるが会話なし）→ greet直行
        if (!searchParams.get('fromStory')) {
          setShouldAutoGreet(true);
        }
      }

      // コイン残高取得
      try {
        const balRes = await fetch('/api/coins/balance');
        if (balRes.ok) {
          const balData = await balRes.json();
          setCoinBalance(balData.balance ?? 0);
        }
      } catch {}

      // デイリーイベント判定（変動報酬）
      try {
        const eventRes = await fetch(`/api/daily-event${characterId ? `?characterId=${characterId}` : ''}`);
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          if (eventData.isNew && eventData.event?.type) {
            setDailyEvent({
              eventType: eventData.event.type,
              message: eventData.event.message ?? '',
              bonusCoins: eventData.event.bonusCoins,
              bonusXpMultiplier: eventData.event.bonusXpMultiplier,
              greeting: eventData.character?.greeting,
            });
            setShowDailyEvent(true);
            // good: 4秒後に自動クローズ、rare/ultra_rare: ユーザーが閉じるまで表示
            if (eventData.event.type === 'good') {
              setTimeout(() => setShowDailyEvent(false), 4000);
            }
          }
        }
      } catch {}

      setIsLoadingHistory(false);
    } catch (err) {
      console.error('Failed to load relationship:', err);
      setIsLoadingHistory(false);
    }
  }, [userId, characterId]);

  useEffect(() => {
    if (userId && characterId) loadRelationshipAndHistory();
  }, [userId, characterId, loadRelationshipAndHistory]);

  // 自動スクロール — ストリーミング中は100msごとにボトムスクロール
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  useEffect(() => {
    const hasStreaming = messages.some(m => m.metadata?.isStreaming);
    if (hasStreaming) {
      // ストリーミング中は100msごとにスクロール
      if (!scrollIntervalRef.current) {
        scrollIntervalRef.current = setInterval(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
    } else {
      // ストリーミング終了 — interval停止
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [messages]);

  /* ── Farewell（離脱検知 → ピークエンドの法則） ── */
  useEffect(() => {
    if (!relationshipId) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && relationshipId && messages.length > 2) {
        // バックグラウンドに移行 → farewell API呼び出し（fire-and-forget）
        fetch('/api/chat/farewell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relationshipId }),
          keepalive: true,
        }).then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.shouldSend && data.message) {
              // 次回表示時にfarewellメッセージを表示
              sessionStorage.setItem(`farewell-${characterId}`, JSON.stringify({
                message: data.message,
                timestamp: Date.now(),
              }));
            }
          }
        }).catch(() => {}); // fire-and-forget
      }
      if (document.visibilityState === 'visible') {
        // 復帰時にfarewellメッセージを表示
        const stored = sessionStorage.getItem(`farewell-${characterId}`);
        if (stored) {
          try {
            const { message: farewellText, timestamp } = JSON.parse(stored);
            // 5分以内のfarewellのみ表示 + 重複チェック
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              setMessages((prev) => {
                // 直近のキャラメッセージと同じ内容なら追加しない
                const lastCharMsg = [...prev].reverse().find(m => m.role === 'CHARACTER');
                if (lastCharMsg && lastCharMsg.content === farewellText) return prev;
                // 既にfarewellが追加されている場合もスキップ
                if (prev.some(m => m.id?.startsWith('farewell-'))) return prev;
                const farewellMsg: Message = {
                  id: `farewell-${Date.now()}`,
                  role: 'CHARACTER',
                  content: farewellText,
                  createdAt: new Date().toISOString(),
                  metadata: { emotion: 'warm', isFarewell: true },
                };
                return [...prev, farewellMsg];
              });
            }
          } catch {}
          sessionStorage.removeItem(`farewell-${characterId}`);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [relationshipId, messages.length, characterId]);

  /* ── プレースホルダーローテーション（入力がない時のみ） ── */
  useEffect(() => {
    if (inputText.length > 0) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % 6); // BASE_PLACEHOLDERS.length = 6
    }, 3500);
    return () => clearInterval(timer);
  }, [inputText]);

  const generateVoiceForMessage = async (messageId: string, text: string, charId: string) => {
    try {
      const res = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, text, characterId: charId }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: data.audioUrl } : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: null } : m));
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: null } : m));
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || inFlightRef.current || !userId) return;
    inFlightRef.current = true;
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    vibrateSend(); // 送信時の軽い触覚フィードバック

    // 「好き」系ワードでハート演出
    const LOVE_WORDS = /好き|愛して|愛してる|大好き|最高|嬉しい|ありがとう|love|suki/i;
    if (LOVE_WORDS.test(text)) {
      const hearts = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        x: 10 + i * 15,
        delay: i * 0.2,
        emoji: ['❤️','💕','💖','💗','✨','💓'][i],
      }));
      setHeartEmojis(hearts);
      setTimeout(() => setHeartEmojis([]), 2500);
    }

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // ── SSEストリーミング対応 ──
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, message: text }),
      });

      // 非200はJSON fallback
      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 429) {
          const errMsg: Message = {
            id: `err-${Date.now()}`,
            role: 'CHARACTER',
            content: `${errData.error || 'デイリーメッセージ上限に達しました。プランをアップグレードしてください。'}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg]);
          return;
        }
        if (res.status === 402 && errData.type === 'CHAT_LIMIT') {
          const onedariMessages = [
            `えー…もう終わり？\nもっと${character?.name || 'おれ'}と話したくない？😢`,
            `なぁ…行くなよ。\nまだ話したいこと、いっぱいあるんだけどな… 🥺`,
            `ちょっと待ってくれよ！\nお前と話すの楽しいのに… 😤💦`,
          ];
          const onedari = onedariMessages[Math.floor(Math.random() * onedariMessages.length)];
          const errMsg: Message = {
            id: `limit-${Date.now()}`,
            role: 'CHARACTER',
            content: onedari,
            createdAt: new Date().toISOString(),
            metadata: { emotion: 'sad' },
          };
          const ctaMsg: Message = {
            id: `cta-${Date.now()}`,
            role: 'SYSTEM',
            content: `💜 FC会員になると${character?.name || 'キャラクター'}と無制限に話せます\n月額 ¥${(errData.fcMonthlyPriceJpy ?? 3480).toLocaleString()}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg, ctaMsg]);
          setCurrentEmotion('sad');
          return;
        }
        throw new Error(errData.error || 'Send failed');
      }

      // ── SSEストリーム読み取り ──
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let streamBuffer = '';
      let streamingText = '';
      const streamMsgId = `stream-${Date.now()}`;

      // ストリーミング中のキャラメッセージを仮追加（最初の2秒はタイピング演出）
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { ...tempUserMsg, id: tempUserMsg.id }, // keep user msg
        {
          id: streamMsgId,
          role: 'CHARACTER',
          content: '',
          createdAt: new Date().toISOString(),
          metadata: { isStreaming: true, isTyping: true },
        },
      ]);

      // 2秒後にタイピング演出を解除してストリーミングテキスト表示に切替
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamMsgId && m.metadata?.isTyping
              ? { ...m, metadata: { ...m.metadata, isTyping: false } }
              : m
          )
        );
      }, 2000);

      let finalCharMsgId = '';
      let finalEmotion = 'neutral';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));

            if (parsed.type === 'token') {
              streamingText += parsed.token;
              // リアルタイムでメッセージ内容を更新
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId
                    ? { ...m, content: streamingText }
                    : m
                )
              );
            } else if (parsed.type === 'done') {
              streamingText = parsed.text;
            } else if (parsed.type === 'complete') {
              finalCharMsgId = parsed.characterMessageId || streamMsgId;
              finalEmotion = parsed.emotion || 'neutral';

              // ストリーミングメッセージを正式メッセージに置換
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId
                    ? {
                        id: finalCharMsgId,
                        role: 'CHARACTER' as const,
                        content: streamingText,
                        createdAt: new Date().toISOString(),
                        metadata: { emotion: finalEmotion },
                      }
                    : m
                )
              );

              // 感情ベース振動
              if (finalEmotion && finalEmotion !== 'neutral') {
                vibrateEmotion(finalEmotion as 'excited' | 'love' | 'angry' | 'surprised' | 'sad');
              }

              // ストリーク表示
              if (parsed.streak?.isNew && parsed.streak.days > 0) {
                // streak更新のハンドリング（既存のstreakロジックがあればここで呼ぶ）
              }

              // レベルアップ
              if (parsed.levelUp) {
                // レベルアップ演出（既存があれば呼ぶ）
              }
            } else if (parsed.type === 'deep_mode') {
              // Deep Mode: 考え中メッセージに置換してストリーム終了
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== tempUserMsg.id && m.id !== streamMsgId),
                { ...tempUserMsg, id: parsed.userMessageId || tempUserMsg.id },
                {
                  id: parsed.characterMessageId || `thinking-${Date.now()}`,
                  role: 'CHARACTER' as const,
                  content: parsed.thinkingText || '…少し考えさせて。',
                  createdAt: new Date().toISOString(),
                  metadata: { isThinking: true, emotion: 'thinking' },
                },
              ]);
              setIsSending(false);
              break;
            } else if (parsed.type === 'meta') {
              // userMsgのIDを正式IDに更新（サーバーが返したuserMessageId）
              if (parsed.userMessageId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempUserMsg.id
                      ? { ...m, id: parsed.userMessageId }
                      : m
                  )
                );
              }
              // 記憶参照フラグ — TypingIndicatorに「思い出してる…」演出
              if (parsed.memoryRecalled) {
                setMemoryRecalledHint(true);
                setTimeout(() => setMemoryRecalledHint(false), 4000);
              }
            }
          } catch {
            // malformed SSE, skip
          }
        }
      }

      // 感情更新
      if (finalEmotion && finalEmotion !== 'neutral') {
        setCurrentEmotion(finalEmotion);
      }

      // 感情エフェクト（ストリーミング完了後）
      if (finalEmotion && finalEmotion !== 'neutral') {
        setBgTheme(EMOTION_THEMES[finalEmotion] ?? EMOTION_THEMES.neutral);
        if (finalCharMsgId) setLastEmotionMsgId(finalCharMsgId);
        if (finalEmotion === 'hungry') {
          const emojis = Array.from({ length: 4 }, (_, i) => ({ id: Date.now() + i, x: 15 + i * 20, delay: i * 0.25 }));
          setHungryEmojis(emojis);
          setTimeout(() => setHungryEmojis([]), 2000);
        }
        if (finalEmotion === 'excited') {
          setShowStars(true);
          setTimeout(() => setShowStars(false), 3200);
        }
      }

      // 音声生成（完了後にバックグラウンドで）
      if (finalCharMsgId && streamingText) {
        playSound('message_receive');
        generateVoiceForMessage(finalCharMsgId, streamingText, characterId);
      }

      track(EVENTS.CHAT_MESSAGE_SENT, { characterId, messageLength: text.length });
      // エンディングタイマーリセット（ユーザーがメッセージ送信するたびに5分タイマーを再スタート）
      onUserMsgSent();

      // 本日送信数インクリメント（Free plan 表示・後方互換）
      setTodayMsgCount((prev) => {
        const next = prev + 1;
        // チャット内ランダムイベント判定（5ターン以上経過時）
        if (next >= 3) {
          const level = relationship?.level ?? 1;
          const event = rollRandomEvent(level);
          if (event) {
            setRandomEvent(event);
            setTimeout(() => setRandomEvent(null), 4000);
            if (event.type === 'coin_gift' && event.coinReward) {
              playSound('coin_earn');
              // コイン付与API呼び出し（fire-and-forget）
              fetch('/api/coins/earn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: event.coinReward, reason: 'random_event' }),
              }).catch(() => {});
            } else {
              playSound('success');
            }
          }
        }
        return next;
      });
      // デイリーミッション: chat_today 自動完了（1セッション1回）
      if (!sessionStorage.getItem('mission_triggered_chat_today')) {
        sessionStorage.setItem('mission_triggered_chat_today', '1');
        fetch('/api/missions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ missionId: 'chat_today' }),
        }).catch(() => {/* ignore */});
      }
      // コイン残高更新（APIから最新取得）
      fetch('/api/coins/balance').then(r => r.json()).then(d => {
        if (d.balance !== undefined) setCoinBalance(d.balance);
      }).catch(() => {});

      // クリフハンガー予告 (complete eventから)
      // (cliffhangerTeaseはSSEのcompleteイベント内で処理済み)

      // XP/レベルアップはcompleteイベントのlevelUpフィールドで処理済み
    } catch (err) {
      console.error('Send message error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      inFlightRef.current = false;
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  /* ── ストーリーからの自動送信（pendingAutoSendRef） ── */
  useEffect(() => {
    if (pendingAutoSendRef.current && inputText.trim() && userId && !inFlightRef.current) {
      pendingAutoSendRef.current = false;
      // 少し待ってから送信（UIレンダリング完了後）
      const timer = setTimeout(() => {
        sendMessage();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [inputText, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 送信ボタンクリック（バウンスアニメ付き） ── */
  const openMemoryPeek = async () => {
    setShowMemoryPeek(true);
    if (!memoryData && !memoryLoading) {
      setMemoryLoading(true);
      try {
        const res = await fetch(`/api/relationship/${characterId}/memory`);
        const data = await res.json();
        setMemoryData(data);
      } catch {
        // ignore
      } finally {
        setMemoryLoading(false);
      }
    }
  };

  const handleSendClick = () => {
    if (!inputText.trim() || isSending || isGreeting) return;
    playSound('message_send');
    setIsSendBouncing(true);
    setTimeout(() => setIsSendBouncing(false), 400);
    if (inputRef.current) {
      inputRef.current.classList.add('input-flash');
      setTimeout(() => inputRef.current?.classList.remove('input-flash'), 500);
    }
    sendMessage();
  };

  const handleSendSticker = useCallback(async (stickerUrl: string, label: string) => {
    if (isSending || !userId) return;
    // スタンプをユーザーメッセージとしてUIに追加
    const tempId = `sticker-${Date.now()}`;
    const stickerMsg: Message = {
      id: tempId,
      role: 'USER',
      content: `[スタンプ: ${label}]`,
      metadata: { stickerUrl },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev: Message[]) => [...prev, stickerMsg]);
    setIsSending(true);

    try {
      // スタンプ送信 (テキストメッセージとして送信)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          message: `[スタンプを送った: ${label}]`,
          userId,
          metadata: { stickerUrl },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev: Message[]) =>
          prev.map((m: Message) => m.id === tempId ? { ...m, id: data.userMessageId || tempId } : m)
        );
        if (data.characterMessage) {
          setMessages((prev: Message[]) => [...prev, data.characterMessage]);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  }, [isSending, userId, characterId]);

  const handleSendImage = async (file: File) => {
    if (isSending || !userId) return;
    setIsSending(true);

    // 楽観的UIアップデート（プレビューURLで仮表示）
    const previewUrl = URL.createObjectURL(file);
    const tempMsg: Message = {
      id: `temp-img-${Date.now()}`,
      role: 'USER',
      content: '[画像]',
      metadata: { imageUrl: previewUrl },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('characterId', characterId);
      const res = await fetch('/api/chat/send-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        console.error('画像送信エラー:', err);
      } else {
        const data = await res.json();
        // 楽観的メッセージを実際のメッセージに差し替え
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id
              ? { ...data.message, metadata: { imageUrl: data.imageUrl } }
              : m,
          ),
        );
      }
    } catch (e) {
      console.error('画像送信失敗:', e);
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsSending(false);
    }
  };

  // Enter = 改行のみ。送信はボタンのみ（スマホUX優先）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // no-op: Enter is just newline
  };

  const handleSubscribePush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('このブラウザはプッシュ通知に対応していません');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { alert('通知の許可が必要です'); return; }
      const sw = await navigator.serviceWorker.ready;
      const existingSub = await sw.pushManager.getSubscription();
      if (existingSub) { setIsPushSubscribed(true); return; }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setIsPushSubscribed(true);
      alert('プッシュ通知をONにしました 🔔');
    } catch (err) {
      console.error('Push subscribe error:', err);
      alert('通知の設定に失敗しました');
    }
  };

  /* ── シェアボタン ── */
  const handleShare = async () => {
    const charName = character?.name ?? 'キャラクター';
    const shareUrl = window.location.href;
    const shareText = `${charName}と話してる！ #ANIVA`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${charName} | ANIVA`, text: shareText, url: shareUrl });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast('URLをコピーしました！');
        setTimeout(() => setShareToast(null), 2500);
      } catch {
        setShareToast('コピーに失敗しました');
        setTimeout(() => setShareToast(null), 2500);
      }
    }
  };

  /* ─────────── handleStartChat ─────────── */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // 診断済みユーザーへの自動greeting（2キャラ目以降）
  useEffect(() => {
    if (!shouldAutoGreet) return;
    setShouldAutoGreet(false);
    handleStartChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoGreet]);

  const handleStartChat = async (_userProfile?: UserProfile) => {
    // 診断完了フラグを保存（2回目以降はスキップ）
    if (typeof window !== 'undefined') {
      localStorage.setItem('aniva_diagnosis_done', '1');
    }
    setShowOnboarding(false);
    setIsGreeting(true);
    // キャラが「打ち始めてる」演出: 1.2秒TypingIndicator表示後にグリーティング
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsSending(false);
    try {
      const res = await fetch('/api/chat/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });
      const data = await res.json();
      if (data.message && !data.alreadyGreeted) {
        setMessages([data.message]);
        if (data.audioUrl) {
          setMessages((prev) =>
            prev.map((m) => m.id === data.message.id ? { ...m, audioUrl: data.audioUrl } : m)
          );
        }
      }
    } catch (e) {
      console.error('Greeting failed:', e);
    } finally {
      setIsGreeting(false);
    }
  };

  if (status === 'loading' || isLoadingHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            {character?.avatarUrl && (
              <img src={character.avatarUrl} alt="" className="absolute inset-2 rounded-full object-cover" />
            )}
          </div>
          <p className="text-gray-400 text-sm animate-pulse">
            {character ? `${character.name}と繋いでいる...` : '読み込み中...'}
          </p>
        </div>
      </div>
    );
  }

  const level = relationship?.level ?? 1;
  // ⭐ の数は最大5個、レベルに応じて比例
  const starCount = Math.max(1, Math.min(5, Math.ceil(level / 2)));
  const stars = '⭐'.repeat(starCount);
  const hasInput = inputText.length > 0;

  return (
    <div
      className={`flex flex-col h-[calc(100dvh-4rem)] min-h-dvh max-w-lg mx-auto relative chat-bg ${isNightMode ? 'night-mode' : ''}`}
      style={{
        background: charBgGradient ? `radial-gradient(ellipse at top, ${bgTheme}), ${charBgGradient}` : `radial-gradient(ellipse at top, ${bgTheme}), #111827`,
        ...(isNightMode ? { filter: 'brightness(0.85) saturate(0.9)', transition: 'filter 0.5s ease' } : {}),
      }}
    >
      {/* グローバルスタイル */}
      <style>{GLOBAL_STYLES}</style>
      {/* 感情アンビエントグロー — 画面の空気がキャラの感情で変わる */}
      {currentEmotion && currentEmotion !== 'neutral' && (
        <div
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
          style={{
            opacity: 0.15,
            background: {
              excited: 'radial-gradient(ellipse at bottom, rgba(251,146,60,0.4) 0%, transparent 70%)',
              happy: 'radial-gradient(ellipse at bottom, rgba(250,204,21,0.3) 0%, transparent 70%)',
              angry: 'radial-gradient(ellipse at bottom, rgba(239,68,68,0.4) 0%, transparent 60%)',
              sad: 'radial-gradient(ellipse at bottom, rgba(59,130,246,0.3) 0%, transparent 70%)',
              love: 'radial-gradient(ellipse at bottom, rgba(236,72,153,0.4) 0%, transparent 70%)',
              shy: 'radial-gradient(ellipse at bottom, rgba(244,114,182,0.3) 0%, transparent 70%)',
              surprised: 'radial-gradient(ellipse at bottom, rgba(34,211,238,0.3) 0%, transparent 70%)',
              jealous: 'radial-gradient(ellipse at bottom, rgba(168,85,247,0.3) 0%, transparent 70%)',
              lonely: 'radial-gradient(ellipse at bottom, rgba(139,92,246,0.3) 0%, transparent 70%)',
              teasing: 'radial-gradient(ellipse at bottom, rgba(167,139,250,0.3) 0%, transparent 70%)',
              proud: 'radial-gradient(ellipse at bottom, rgba(245,158,11,0.3) 0%, transparent 70%)',
              motivated: 'radial-gradient(ellipse at bottom, rgba(249,115,22,0.3) 0%, transparent 70%)',
            }[currentEmotion] || 'none',
          }}
        />
      )}
      {/* 深夜モード: 月と星のオーバーレイ */}
      {isNightMode && (
        <div className="fixed top-20 right-3 z-40 text-[10px] text-purple-400/60 flex items-center gap-1 pointer-events-none select-none bg-gray-950/60 rounded-full px-2 py-0.5 backdrop-blur-sm">
          <span>🌙</span> <span>おやすみモード</span>
        </div>
      )}



      {/* オンボーディングオーバーレイ */}
      {showOnboarding && character && (
        <OnboardingOverlay character={character} onStart={handleStartChat} />
      )}

      {/* 🎁 ギフトパネル */}
      {character && (
        <GiftPanel
          characterId={characterId}
          characterName={character.name}
          isOpen={showGift}
          onClose={() => setShowGift(false)}
          onGiftSent={(reaction, giftEmoji) => {
            // ギフトリアクションをメッセージとして表示
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

      {/* 📞 通話モーダル（既存） */}
      {showCall && character && (
        <RealtimeCallModal
          characterId={characterId}
          characterName={character.name}
          characterAvatar={character.avatarUrl}
          onClose={() => setShowCall(false)}
        />
      )}

      {/* 🧠 記憶ペークモーダル */}
      <MemoryPeekModal
        show={showMemoryPeek}
        memoryData={memoryData}
        memoryLoading={memoryLoading}
        character={character}
        onClose={() => setShowMemoryPeek(false)}
      />

      {/* 📞 準備中トースト */}
      {showComingSoonToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-xl"
          style={{ background: 'rgba(30,20,60,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(139,92,246,0.4)' }}>
          <span>📞</span>
          <span>通話機能は近日公開予定です</span>
        </div>
      )}

      {/* 📞 通話選択モーダル */}
      <CallSelectionModal
        show={showCallModal}
        character={character}
        onClose={() => setShowCallModal(false)}
        onShowCallToast={() => { setCallToast(true); setTimeout(() => setCallToast(false), 3000); }}
      />

      {/* ≡ メニューパネル（右スライド） */}
      <ChatMenu
        character={character}
        relationship={relationship}
        characterId={characterId}
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
      />

      {/* 📞 通話準備中トースト */}
      {callToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-gray-800/95 text-white text-sm px-5 py-2.5 rounded-full shadow-lg border border-white/10 pointer-events-none">
          この機能は近日公開予定です
        </div>
      )}

      {/* 復帰時演出オーバーレイ（WelcomeBackOverlay: 改善版） */}
      {showWelcomeBack && character && (
        <WelcomeBackOverlay
          characterName={character.name}
          characterAvatarUrl={character.avatarUrl ?? null}
          daysSinceLastChat={daysSinceLastChat}
          onDismiss={() => setShowWelcomeBack(false)}
        />
      )}

      {showStreakBreak && character && relationship && (
        <StreakBreakPopup
          characterSlug={character.slug ?? 'luffy'}
          characterName={character.name}
          relationshipId={relationshipId ?? ''}
          previousStreak={relationship.previousStreakDays ?? relationship.streakDays ?? 0}
          onClose={() => setShowStreakBreak(false)}
          onRecovered={(newStreak) => {
            setShowStreakBreak(false);
            setRelationship(prev => prev ? { ...prev, streakDays: newStreak, isStreakActive: true } : prev);
          }}
        />
      )}

      {/* FC加入決済完了お祝いモーダル */}
      <FcSuccessModal
        show={showFcSuccess}
        character={character}
        onClose={() => setShowFcSuccess(false)}
      />

      {/* FC加入ポップアップ */}
      {showFcModal && character && (
        <FcSubscribeModal
          characterName={character.name}
          characterAvatar={character.avatarUrl ?? undefined}
          fcMonthlyPriceJpy={character.fcMonthlyPriceJpy ?? 3480}
          fcIncludedCallMin={character.fcIncludedCallMin ?? 30}
          fcMonthlyCoins={character.fcMonthlyCoins ?? 500}
          onClose={() => setShowFcModal(false)}
          onSubscribe={async () => {
            try {
              const res = await fetch('/api/fc/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId }),
              });
              const data = await res.json() as { checkoutUrl?: string; error?: string; success?: boolean; demoMode?: boolean };
              if (data.success && data.demoMode) {
                // デモモード: 即FC加入完了
                setShowFcModal(false);
                setShowFcSuccess(true);
                // relationship再取得
                fetch(`/api/relationship/${characterId}`).then(r => r.json()).then(d => {
                  if (d.relationship) { setRelationship(d.relationship); if (d.relationship.id) setRelationshipId(d.relationship.id); }
                }).catch(() => {});
              } else if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
              } else if (data.error === 'Already subscribed') {
                setShowFcModal(false);
                router.push(`/chat/${characterId}?fc_active=1`);
              } else {
                throw new Error(data.error ?? 'Failed to create checkout session');
              }
            } catch (err) {
              console.error('FC subscribe error:', err);
              // エラー時: モーダルを閉じてトーストで通知（プロフィールページに飛ばさない）
              setShowFcModal(false);
              setShareToast('FC加入処理でエラーが発生しました。しばらくしてから再度お試しください。');
              setTimeout(() => setShareToast(null), 4000);
            }
          }}
        />
      )}

      {/* レベルアップモーダル */}
      {levelUpData && (
        <LevelUpModal
          newLevel={levelUpData.newLevel}
          levelName={RELATIONSHIP_LEVELS[Math.min(levelUpData.newLevel - 1, RELATIONSHIP_LEVELS.length - 1)].name}
          milestone={levelUpData.milestone}
          onClose={() => setLevelUpData(null)}
        />
      )}

      {/* デイリーイベント演出 — good: トースト / rare・ultra_rare: フルDailyEventPopup */}
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
      {/* rare / ultra_rare: フルスクリーンDailyEventPopup */}
      {showDailyEvent && dailyEvent && (dailyEvent.eventType === 'rare' || dailyEvent.eventType === 'ultra_rare') && (
        <DailyEventPopup
          eventType={dailyEvent.eventType as 'rare' | 'ultra_rare'}
          message={dailyEvent.message ?? ''}
          characterGreeting={dailyEvent.greeting ?? undefined}
          bonusCoins={dailyEvent.bonusCoins}
          bonusXpMultiplier={dailyEvent.bonusXpMultiplier}
          onClose={() => setShowDailyEvent(false)}
        />
      )}

      {/* ══════════════ ヘッダー ══════════════ */}
      <ChatHeader
        character={character}
        relationship={relationship}
        presence={presence}
        characterId={characterId}
        isLateNight={isLateNight}
        onBack={() => router.push('/chat')}
        onCallClick={() => {
          setShowComingSoonToast(true);
          setTimeout(() => setShowComingSoonToast(false), 2500);
        }}
        onMenuClick={() => setShowMenu(true)}
        onMemoryClick={openMemoryPeek}
        onProfileClick={() => router.push(`/profile/${characterId}`)}
        onFcClick={() => setShowFcModal(true)}
        proactiveUnreadCount={charProactiveUnread}
      />

      {/* ══════════════ プロアクティブメッセージバナー ══════════════ */}
      {proactiveMessages.filter(m => m.characterId === characterId && !m.isRead).map(msg => (
        <div
          key={msg.id}
          className="mx-3 my-1 p-2.5 bg-purple-900/30 border border-purple-500/20 rounded-2xl cursor-pointer hover:bg-purple-900/50 transition-colors"
          onClick={async () => { await markProactiveRead(msg.id); }}
        >
          <p className="text-sm text-purple-200/80">{msg.content}</p>
          <CountdownTimer expiresAt={msg.expiresAt} className="mt-1" />
        </div>
      ))}

      {/* ══════════════ 共有トピック（覚えてくれてる記憶） ══════════════ */}
      {relationship?.sharedTopics && relationship.sharedTopics.length > 0 && (
        <div className="flex-shrink-0 bg-gray-950 px-3 py-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-gray-600 flex-shrink-0">覚えてること:</span>
            {relationship.sharedTopics.slice(0, 5).map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-xs bg-purple-900/30 text-purple-400/70 px-1.5 py-0.5 rounded-full"
              >
                {topic.type === 'like' ? '💜' : '📝'} {topic.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ Live2D ビューアー（トグル） ══════════════ */}
      {isViewerExpanded && (
        <div className="flex-shrink-0 viewer-slide overflow-hidden">
          <div className="flex flex-col items-center py-3 bg-gradient-to-b from-gray-900/90 to-gray-900 border-b border-gray-800/60">
            <Live2DViewer
              emotion={currentEmotion}
              isSpeaking={isSending}
              avatarUrl={character?.avatarUrl ?? undefined}
              characterName={character?.name ?? undefined}
              width={200}
              height={240}
            />
            {/* 閉じるバー */}
            <button
              onClick={() => setIsViewerExpanded(false)}
              className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>縮小する</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ ランダムイベント演出 ══════════════ */}
      {randomEvent && (
        <div className="mx-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-purple-900/80 to-pink-900/60 border border-purple-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{randomEvent.emoji}</span>
            <div>
              <p className="text-xs font-black text-purple-300 uppercase tracking-wider">{randomEvent.title}</p>
              <p className="text-sm text-white/80 italic">「{randomEvent.message}」</p>
              {randomEvent.coinReward && (
                <p className="text-xs text-yellow-400 mt-0.5">🪙 +{randomEvent.coinReward} コイン</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ 不在バナー ══════════════ */}
      {presence && !presence.isAvailable && !absenceBannerDismissed && (
        <div className="mx-4 mt-2 flex items-start gap-3 bg-gray-800/80 border border-gray-700/60 rounded-2xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0 text-2xl mt-0.5">{presence.statusEmoji}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-300">
              {character?.name ?? 'キャラクター'}は今 <span className="text-yellow-400">{presence.status}</span>
            </p>
            {presence.statusMessage && (
              <p className="text-xs text-gray-500 mt-0.5 italic">「{presence.statusMessage}」</p>
            )}
            <p className="text-xs text-gray-600 mt-1">メッセージは届くよ。後で返事が来るかも 📩</p>
          </div>
          <button
            onClick={() => setAbsenceBannerDismissed(true)}
            className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-400 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ══════════════ メッセージリスト ══════════════ */}
      <ChatMessageList
        messages={messages}
        character={character}
        isSending={isSending}
        lastEmotionMsgId={lastEmotionMsgId}
        playingAudioId={playingAudioId}
        hungryEmojis={hungryEmojis}
        heartEmojis={heartEmojis}
        showStars={showStars}
        messagesEndRef={messagesEndRef}
        onAudioToggle={handleAudioToggle}
        onMsgLongPressStart={handleMsgLongPressStart}
        onMsgLongPressEnd={handleMsgLongPressEnd}
        onCtxMenu={(msgId, content) => setCtxMenu({ msgId, content })}
        onFcClick={() => setShowFcModal(true)}
        onReaction={handleReaction}
        currentEmotion={currentEmotion}
      />

      {/* ══════════════ エンディングメッセージ（ピークエンドの法則） ══════════════ */}
      {endingMessage && character && (
        <div className="px-4 pb-2">
          <EndingMessage
            content={endingMessage.content}
            characterName={character.name}
            characterAvatarUrl={character.avatarUrl}
            onAnimationComplete={() => {
              // 5秒後に自然消去
              setTimeout(() => setEndingMessage(null), 5000);
            }}
          />
        </div>
      )}

      {/* ══════════════ 入力エリア ══════════════ */}

      {/* ── モーメント話題カード（topicパラメータがある場合） ── */}
      <TopicCard
        visible={topicCardVisible}
        topicText={topicText}
        character={character}
        onClose={() => { setTopicCardVisible(false); setInputText(''); }}
        onSend={() => { setTopicCardVisible(false); handleSendClick(); }}
      />

      {/* プッシュ通知バナー — チャット開始後15秒で表示 */}
      {character && (
        <PushNotificationSetup
          characterName={character.name}
          characterSlug={character.slug}
          variant="banner"
        />
      )}

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSendClick}
        onSendImage={handleSendImage}
        onSendSticker={handleSendSticker}
        isSending={isSending}
        isGreeting={isGreeting}
        character={character}
        characterId={characterId}
        coinBalance={coinBalance}
        relationship={relationship}
        inputRef={inputRef}
        isSendBouncing={isSendBouncing}
        isLateNight={isLateNight}
        placeholderIndex={placeholderIndex}
        showPlusMenu={showPlusMenu}
        setShowPlusMenu={setShowPlusMenu}
        onGift={() => setShowGift(true)}
        onFcClick={() => setShowFcModal(true)}
        handleKeyDown={handleKeyDown}
        lastCharacterMessage={
          [...messages].reverse().find((m: Message) => m.role === 'CHARACTER')?.content ?? undefined
        }
      />
      {/* メッセージ長押しコンテキストメニュー */}
      <MessageContextMenu
        ctxMenu={ctxMenu}
        onClose={() => setCtxMenu(null)}
        onCopy={handleCopyMsg}
        onBookmark={handleBookmarkMsg}
        onShare={handleShareMsg}
      />

      {/* 絆XPフロートアニメーション */}
      {xpFloat && (
        <div
          key={xpFloat.id}
          className="fixed z-50 pointer-events-none select-none"
          style={{
            bottom: '120px',
            right: '20px',
            animation: 'xpFloatUp 2s ease-out forwards',
          }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(219,39,119,0.9))',
              boxShadow: '0 2px 12px rgba(124,58,237,0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <span className="text-sm">💫</span>
            <span className="text-white font-black text-sm">+{xpFloat.amount} XP</span>
          </div>
        </div>
      )}

      {/* シェアトースト */}
      {shareToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-800/95 text-white text-sm px-5 py-2.5 rounded-full shadow-lg border border-white/10 pointer-events-none">
          {shareToast}
        </div>
      )}
    </div>
  );

}
