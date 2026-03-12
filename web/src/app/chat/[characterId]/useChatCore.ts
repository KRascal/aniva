'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { track, EVENTS } from '@/lib/analytics';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import type { Message, Character } from '@/components/chat/ChatMessageList';
import type { UserProfile } from '@/components/chat/OnboardingOverlay';
import { playSound, vibrateSend, vibrateReaction, vibrateEmotion } from '@/lib/sound-effects';
import { getCharacterTheme } from '@/lib/character-themes';
import { LUFFY_MILESTONES, type Milestone } from '@/lib/milestones';
import { useProactiveMessages } from '@/hooks/useProactiveMessages';
import { useConversationEnd } from '@/hooks/useConversationEnd';
import { rollRandomEvent, type RandomEvent } from '@/lib/random-events';
import {
  REACTION_EMOTION,
  EMOTION_THEMES,
  LOVE_WORDS,
  fetchReactionResponse,
  type RelationshipInfo,
  type MemoryData,
  type PresenceInfo,
  type DailyEventInfo,
} from './chat-constants';

export function useChatCore() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const characterId = params.characterId as string;

  /* ── 既存 state ── */
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

  /* ── エンディングメッセージ ── */
  const [endingMessage, setEndingMessage] = useState<{ content: string } | null>(null);

  const { onUserMessage: onUserMsgSent } = useConversationEnd({
    relationshipId: relationshipId,
    onEndingMessage: (msg) => {
      setEndingMessage({ content: msg.content });
      const endMsg: Message = {
        id: msg.id,
        role: 'CHARACTER',
        content: msg.content,
        createdAt: msg.createdAt,
        metadata: { emotion: msg.metadata?.emotion ?? 'warm', isFarewell: true },
      };
      setMessages((prev) => {
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
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [presence, setPresence] = useState<PresenceInfo | null>(null);
  const [absenceBannerDismissed, setAbsenceBannerDismissed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFcModal, setShowFcModal] = useState(false);
  const [showFcSuccess, setShowFcSuccess] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [callToast, setCallToast] = useState(false);
  const [isViewerExpanded, setIsViewerExpanded] = useState(false);
  const [isSendBouncing, setIsSendBouncing] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const isLateNight = (() => { const h = new Date().getHours(); return h >= 23 || h < 3; })();
  const [bgTheme, setBgTheme] = useState<string>(
    isLateNight
      ? 'rgba(180,83,9,0.08), rgba(153,27,27,0.05)'
      : 'rgba(88,28,135,0.06), rgba(0,0,0,0)'
  );
  const [charBgGradient, setCharBgGradient] = useState<string>('');
  const [hungryEmojis, setHungryEmojis] = useState<{ id: number; x: number; delay: number }[]>([]);
  const [showStars, setShowStars] = useState(false);
  const [heartEmojis, setHeartEmojis] = useState<{ id: number; x: number; delay: number; emoji: string }[]>([]);
  const [lastEmotionMsgId, setLastEmotionMsgId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('UNKNOWN');
  const [todayMsgCount, setTodayMsgCount] = useState(0);
  const [randomEvent, setRandomEvent] = useState<RandomEvent | null>(null);
  const [xpFloat, setXpFloat] = useState<{ amount: number; id: number } | null>(null);
  const prevXpRef = useRef<number>(0);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [dailyEvent, setDailyEvent] = useState<DailyEventInfo | null>(null);
  const [showDailyEvent, setShowDailyEvent] = useState(false);

  /* ── モーメントtopic ── */
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
      if (!existing.find(b => b.id === msgId)) {
        existing.unshift({
          id: msgId,
          characterId: character?.id ?? '',
          characterName: character?.name ?? '',
          avatarUrl: character?.avatarUrl ?? null,
          content,
          savedAt: Date.now(),
        });
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

  /* ── リアクション → キャラ反応ハンドラ ── */
  const handleReaction = useCallback((msgId: string, emoji: string, _characterSlug: string) => {
    vibrateReaction();
    if (!character?.id) return;

    const typingMsg: Message = {
      id: `reaction-typing-${Date.now()}`,
      role: 'CHARACTER',
      content: '…',
      createdAt: new Date().toISOString(),
      metadata: { emotion: REACTION_EMOTION[emoji] ?? 'neutral', isTyping: true },
    };
    setMessages((prev) => [...prev, typingMsg]);

    const lastCharMsg = [...messages].reverse().find(m => m.role === 'CHARACTER')?.content;

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
  const inFlightRef = useRef(false);
  const pendingAutoSendRef = useRef(false);

  /* ─────────── 音声ミニプレーヤー ─────────── */
  const handleAudioToggle = useCallback((messageId: string, audioUrl: string) => {
    if (playingAudioId === messageId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
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

  // ── 音声停止 on unmount ──
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // ── Safari bfcache + Stripe戻り対策 ──
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
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

  /* FC決済完了後 / プロフィールからのFC加入リダイレクト */
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

  /* モーメントtopicパラメータ対応 */
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (!topicParam || !character) return;
    const truncated = topicParam.slice(0, 100);
    setTopicText(truncated);

    const fromLetter = searchParams.get('fromLetter') === '1';
    if (fromLetter) {
      setInputText(`「${truncated}」…この手紙、すごく嬉しかった。直接返事したくて`);
      setTopicCardVisible(false);
      return;
    }

    const fromStory = searchParams.get('fromStory') === '1';
    if (fromStory) {
      const autoMsg = `「${truncated}」…その話、もっと聞かせて`;
      setInputText(autoMsg);
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
      pendingAutoSendRef.current = true;
      setTopicCardVisible(false);
      return;
    } else {
      setInputText(`${character.name}のタイムラインの「${truncated}」について話したいんだけど`);
    }
    setTopicCardVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.name]);

  /* ── Auth redirect ── */
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

  /* ── Character fetch ── */
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

  // チャット画面を開いた時刻をlocalStorageに記録
  useEffect(() => {
    if (!characterId || typeof window === 'undefined') return;
    localStorage.setItem(`aniva_chat_visited_${characterId}`, Date.now().toString());
    track(EVENTS.CHAT_OPENED, { characterId });
  }, [characterId]);

  // プレゼンス取得
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/${characterId}/presence`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.presence) { setPresence(data.presence); setAbsenceBannerDismissed(false); } })
      .catch(() => {});
  }, [characterId]);

  // キャラクターテーマ
  useEffect(() => {
    const slug = character?.slug ?? relationship?.character?.slug;
    if (!slug) return;
    const theme = getCharacterTheme(slug);
    setCharBgGradient(theme.bgGradient);
  }, [character?.slug, relationship?.character?.slug]);

  // ユーザープラン取得
  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => { if (data.plan) setUserPlan(data.plan); })
      .catch(() => {});
  }, []);

  /* ── Relationship & History ── */
  const loadRelationshipAndHistory = useCallback(async () => {
    if (!userId || !characterId) return;
    try {
      const res = await fetch(`/api/chat/history-by-user?characterId=${characterId}&limit=50`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
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
        // 復帰演出
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
        // FC誘導
        if (relData.totalMessages >= 50 && !relData.isFanclub) {
          const fcPromptKey = `fcPrompt_${characterId}_${new Date().toDateString()}`;
          if (!sessionStorage.getItem(fcPromptKey)) {
            setTimeout(() => setShowFcModal(true), 15000);
            sessionStorage.setItem(fcPromptKey, '1');
          }
        }
        // ストリーク途切れ
        if (relData.streakDays === 0 && relData.isStreakActive === false && relData.totalMessages > 0) {
          const streakKey = `streakBreak_${characterId}_${new Date().toDateString()}`;
          if (!sessionStorage.getItem(streakKey)) {
            setShowStreakBreak(true);
            sessionStorage.setItem(streakKey, '1');
          }
        }
      }
      if (!data.relationship) {
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
            fetch(`/api/relationship/${characterId}/follow-welcome`, { method: 'POST' }).catch(() => {});
            const relRes2 = await fetch(`/api/relationship/${characterId}`);
            const relData2 = await relRes2.json();
            setRelationship(relData2);
            if (relData2?.id) setRelationshipId(relData2.id);
          }
        } catch (e) {
          console.error('Auto-follow failed:', e);
        }
        if (!searchParams.get('fromStory')) {
          setShouldAutoGreet(true);
        }
      } else if (data.messages?.length === 0) {
        if (!searchParams.get('fromStory')) {
          setShouldAutoGreet(true);
        }
      }

      // コイン残高
      try {
        const balRes = await fetch('/api/coins/balance');
        if (balRes.ok) {
          const balData = await balRes.json();
          setCoinBalance(balData.balance ?? 0);
        }
      } catch {}

      // デイリーイベント
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

  // 自動スクロール
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  useEffect(() => {
    const hasStreaming = messages.some(m => m.metadata?.isStreaming);
    if (hasStreaming) {
      if (!scrollIntervalRef.current) {
        scrollIntervalRef.current = setInterval(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
    } else {
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

  /* ── Farewell ── */
  useEffect(() => {
    if (!relationshipId) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && relationshipId && messages.length > 2) {
        fetch('/api/chat/farewell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relationshipId }),
          keepalive: true,
        }).then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.shouldSend && data.message) {
              sessionStorage.setItem(`farewell-${characterId}`, JSON.stringify({
                message: data.message,
                timestamp: Date.now(),
              }));
            }
          }
        }).catch(() => {});
      }
      if (document.visibilityState === 'visible') {
        const stored = sessionStorage.getItem(`farewell-${characterId}`);
        if (stored) {
          try {
            const { message: farewellText, timestamp } = JSON.parse(stored);
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              setMessages((prev) => {
                const lastCharMsg = [...prev].reverse().find(m => m.role === 'CHARACTER');
                if (lastCharMsg && lastCharMsg.content === farewellText) return prev;
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

  /* ── プレースホルダーローテーション ── */
  useEffect(() => {
    if (inputText.length > 0) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % 6);
    }, 3500);
    return () => clearInterval(timer);
  }, [inputText]);

  /* ── 音声生成 ── */
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

  /* ── SSEストリーミング後の共通処理 ── */
  const applyEmotionEffects = useCallback((emotion: string, msgId: string) => {
    if (emotion && emotion !== 'neutral') {
      setCurrentEmotion(emotion);
      setBgTheme(EMOTION_THEMES[emotion] ?? EMOTION_THEMES.neutral);
      if (msgId) setLastEmotionMsgId(msgId);
      if (emotion === 'hungry') {
        const emojis = Array.from({ length: 4 }, (_, i) => ({ id: Date.now() + i, x: 15 + i * 20, delay: i * 0.25 }));
        setHungryEmojis(emojis);
        setTimeout(() => setHungryEmojis([]), 2000);
      }
      if (emotion === 'excited') {
        setShowStars(true);
        setTimeout(() => setShowStars(false), 3200);
      }
    }
  }, []);

  /* ── sendMessage ── */
  const sendMessage = async () => {
    if (!inputText.trim() || inFlightRef.current || !userId) return;
    inFlightRef.current = true;
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    vibrateSend();

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
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, message: text }),
      });

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

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { ...tempUserMsg, id: tempUserMsg.id },
        {
          id: streamMsgId,
          role: 'CHARACTER',
          content: '',
          createdAt: new Date().toISOString(),
          metadata: { isStreaming: true, isTyping: true },
        },
      ]);

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

              if (finalEmotion && finalEmotion !== 'neutral') {
                vibrateEmotion(finalEmotion as 'excited' | 'love' | 'angry' | 'surprised' | 'sad');
              }
            } else if (parsed.type === 'meta') {
              if (parsed.userMessageId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempUserMsg.id
                      ? { ...m, id: parsed.userMessageId }
                      : m
                  )
                );
              }
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

      // 感情エフェクト
      applyEmotionEffects(finalEmotion, finalCharMsgId);

      // 音声生成
      if (finalCharMsgId && streamingText) {
        playSound('message_receive');
        generateVoiceForMessage(finalCharMsgId, streamingText, characterId);
      }

      track(EVENTS.CHAT_MESSAGE_SENT, { characterId, messageLength: text.length });
      onUserMsgSent();

      // 本日送信数インクリメント
      setTodayMsgCount((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          const level = relationship?.level ?? 1;
          const event = rollRandomEvent(level);
          if (event) {
            setRandomEvent(event);
            setTimeout(() => setRandomEvent(null), 4000);
            if (event.type === 'coin_gift' && event.coinReward) {
              playSound('coin_earn');
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

      // デイリーミッション
      if (!sessionStorage.getItem('mission_triggered_chat_today')) {
        sessionStorage.setItem('mission_triggered_chat_today', '1');
        fetch('/api/missions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ missionId: 'chat_today' }),
        }).catch(() => {});
      }

      // コイン残高更新
      fetch('/api/coins/balance').then(r => r.json()).then(d => {
        if (d.balance !== undefined) setCoinBalance(d.balance);
      }).catch(() => {});

    } catch (err) {
      console.error('Send message error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      inFlightRef.current = false;
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  /* ── ストーリーからの自動送信 ── */
  useEffect(() => {
    if (pendingAutoSendRef.current && inputText.trim() && userId && !inFlightRef.current) {
      pendingAutoSendRef.current = false;
      const timer = setTimeout(() => {
        sendMessage();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [inputText, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 記憶ペーク ── */
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

  /* ── 送信ボタン ── */
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

  /* ── スタンプ送信 ── */
  const handleSendSticker = useCallback(async (stickerUrl: string, label: string) => {
    if (isSending || !userId) return;
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

  /* ── 画像送信 ── */
  const handleSendImage = async (file: File) => {
    if (isSending || !userId) return;
    setIsSending(true);

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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id
              ? { ...data.message, metadata: { imageUrl: data.imageUrl } }
              : m,
          ),
        );

        const imagePrompt = data.analysisHint
          ? data.analysisHint
          : '[ユーザーが画像を送りました。画像について自然にリアクションしてください。]';
        try {
          const streamRes = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterId,
              message: imagePrompt,
              isImageReaction: true,
            }),
          });

          if (streamRes.ok && streamRes.body) {
            const reader = streamRes.body.getReader();
            const decoder = new TextDecoder();
            let streamBuffer = '';
            let streamingText = '';
            const streamMsgId = `stream-img-${Date.now()}`;

            setMessages((prev) => [
              ...prev,
              {
                id: streamMsgId,
                role: 'CHARACTER' as const,
                content: '',
                createdAt: new Date().toISOString(),
                metadata: { isStreaming: true, isTyping: true },
              },
            ]);
            setTimeout(() => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId && m.metadata?.isTyping
                    ? { ...m, metadata: { ...m.metadata, isTyping: false } }
                    : m
                )
              );
            }, 1500);

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
                    setMessages((prev) =>
                      prev.map((m) => m.id === streamMsgId ? { ...m, content: streamingText } : m)
                    );
                  } else if (parsed.type === 'done') {
                    streamingText = parsed.text;
                  } else if (parsed.type === 'complete') {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === streamMsgId
                          ? {
                              id: parsed.characterMessageId || streamMsgId,
                              role: 'CHARACTER' as const,
                              content: streamingText,
                              createdAt: new Date().toISOString(),
                              metadata: { emotion: parsed.emotion || 'neutral' },
                            }
                          : m
                      )
                    );
                    if (parsed.emotion && parsed.emotion !== 'neutral') {
                      setCurrentEmotion(parsed.emotion);
                    }
                  }
                } catch { /* skip malformed SSE */ }
              }
            }
          }
        } catch (streamErr) {
          console.error('画像応答ストリーム失敗:', streamErr);
        }
      }
    } catch (e) {
      console.error('画像送信失敗:', e);
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsSending(false);
    }
  };

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

  /* ── シェア ── */
  const handleShare = async () => {
    const charName = character?.name ?? 'キャラクター';
    const shareUrl = window.location.href;
    const shareText = `${charName}と話してる！ #ANIVA`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${charName} | ANIVA`, text: shareText, url: shareUrl });
      } catch { /* user cancelled */ }
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

  /* ── auto greet ── */
  useEffect(() => {
    if (!shouldAutoGreet) return;
    setShouldAutoGreet(false);
    handleStartChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoGreet]);

  const handleStartChat = async (_userProfile?: UserProfile) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aniva_diagnosis_done', '1');
    }
    setShowOnboarding(false);
    setIsGreeting(true);
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

  /* ── ギフト送信後のメッセージ追加 ── */
  const handleGiftSent = useCallback((reaction: string, giftEmoji: string, giftName?: string) => {
    const userGiftMsg: Message = {
      id: `gift-sent-${Date.now()}`,
      role: 'USER',
      content: `${giftEmoji} ${giftName || 'ギフト'}を送りました`,
      createdAt: new Date().toISOString(),
      metadata: { isGift: true },
    };
    const charReactionMsg: Message = {
      id: `gift-react-${Date.now()}`,
      role: 'CHARACTER',
      content: `${giftEmoji} ${reaction}`,
      createdAt: new Date().toISOString(),
      metadata: { emotion: 'excited' },
    };
    setMessages((prev) => [...prev, userGiftMsg, charReactionMsg]);
    setCurrentEmotion('excited');
  }, []);

  /* ── FC subscribe handler ── */
  const handleFcSubscribe = useCallback(async () => {
    try {
      const res = await fetch('/api/fc/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string; success?: boolean; demoMode?: boolean };
      if (data.success && data.demoMode) {
        setShowFcModal(false);
        setShowFcSuccess(true);
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
      setShowFcModal(false);
      router.push(`/profile/${characterId}#fc`);
    }
  }, [characterId, router]);

  /* ── streak recovered ── */
  const handleStreakRecovered = useCallback((newStreak: number) => {
    setShowStreakBreak(false);
    setRelationship(prev => prev ? { ...prev, streakDays: newStreak, isStreakActive: true } : prev);
  }, []);

  return {
    // Auth/Router
    status, router, characterId, searchParams,
    // Core data
    character, messages, relationship, relationshipId,
    // UI state
    inputText, setInputText,
    isSending, isGreeting, isLoadingHistory,
    currentEmotion, memoryRecalledHint,
    levelUpData, setLevelUpData,
    showOnboarding, showWelcomeBack, setShowWelcomeBack,
    daysSinceLastChat,
    showStreakBreak, setShowStreakBreak,
    shareToast,
    isNightMode, isLateNight,
    endingMessage, setEndingMessage,
    // Modals
    showCall, setShowCall,
    showGift, setShowGift,
    showCallModal, setShowCallModal,
    showComingSoonToast, setShowComingSoonToast,
    showMemoryPeek, setShowMemoryPeek,
    memoryData, memoryLoading,
    showMenu, setShowMenu,
    showFcModal, setShowFcModal,
    showFcSuccess, setShowFcSuccess,
    showPlusMenu, setShowPlusMenu,
    callToast, setCallToast,
    // Viewer
    isViewerExpanded, setIsViewerExpanded,
    // Visual state
    isSendBouncing,
    playingAudioId,
    placeholderIndex,
    bgTheme, charBgGradient,
    hungryEmojis, showStars, heartEmojis,
    lastEmotionMsgId,
    randomEvent, xpFloat,
    coinBalance,
    dailyEvent, showDailyEvent, setShowDailyEvent,
    // Topic
    topicCardVisible, setTopicCardVisible,
    topicText, setTopicText,
    // Context menu
    ctxMenu, setCtxMenu,
    // Presence
    presence, absenceBannerDismissed, setAbsenceBannerDismissed,
    // Proactive
    proactiveMessages, charProactiveUnread, markProactiveRead,
    // Refs
    messagesEndRef, inputRef,
    // Handlers
    handleSendClick,
    handleSendImage,
    handleSendSticker,
    handleAudioToggle,
    handleMsgLongPressStart,
    handleMsgLongPressEnd,
    handleCopyMsg,
    handleBookmarkMsg,
    handleReaction,
    handleStartChat,
    handleShare,
    handleKeyDown,
    openMemoryPeek,
    handleGiftSent,
    handleFcSubscribe,
    handleStreakRecovered,
  };
}
