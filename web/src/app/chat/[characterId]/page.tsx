'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import type { Message } from '@/components/chat/ChatMessageList';
import type { UserProfile } from '@/components/chat/OnboardingOverlay';
import type { Milestone } from '@/lib/milestones';
import { playSound } from '@/lib/sound-effects';
import Live2DViewer from '@/components/live2d/Live2DViewer';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInput } from '@/components/chat/ChatInput';
import { PushNotificationSetup } from '@/components/push/PushNotificationSetup';
import { useProactiveMessages } from '@/hooks/useProactiveMessages';
import { CountdownTimer } from '@/components/proactive/CountdownTimer';
import { useConversationEnd } from '@/hooks/useConversationEnd';
import { EndingMessage } from '@/components/chat/EndingMessage';
import { GLOBAL_STYLES } from '@/components/chat/chatUtils';
import { MessageContextMenu } from '@/components/chat/MessageContextMenu';
import { TopicCard } from '@/components/chat/TopicCard';
import { useChatInit } from '@/hooks/chat/useChatInit';
import { useSendMessage } from '@/hooks/chat/useSendMessage';
import { ChatModals } from '@/components/chat/ChatModals';


/* ─────────────── メインページ ─────────────── */
export default function ChatCharacterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const characterId = params.characterId as string;

  /* ── UI state (modals/panels) ── */
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
  const [showMenu, setShowMenu] = useState(false);
  const [showFcModal, setShowFcModal] = useState(false);
  const [showFcSuccess, setShowFcSuccess] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [callToast, setCallToast] = useState(false);
  const [isViewerExpanded, setIsViewerExpanded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isGreeting, setIsGreeting] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; milestone?: Milestone } | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [todayMsgCount, setTodayMsgCount] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [topicCardVisible, setTopicCardVisible] = useState(false);
  const [topicText, setTopicText] = useState('');
  const [endingMessage, setEndingMessage] = useState<{ content: string } | null>(null);
  const pendingAutoSendRef = useRef(false);

  /* ── 深夜モード（23:00-6:00 JST） ── */
  const [isNightMode] = useState(() => {
    const h = new Date().getHours();
    return h >= 23 || h < 6;
  });
  const isLateNight = (() => { const h = new Date().getHours(); return h >= 23 || h < 3; })();

  /* ── 初期化 hook ── */
  const {
    userId, character, setCharacter,
    messages, setMessages,
    relationship, setRelationship,
    relationshipId, setRelationshipId,
    isLoadingHistory,
    shouldAutoGreet, setShouldAutoGreet,
    showWelcomeBack, setShowWelcomeBack,
    daysSinceLastChat,
    showStreakBreak, setShowStreakBreak,
    presence, absenceBannerDismissed, setAbsenceBannerDismissed,
    userPlan,
    dailyEvent, setDailyEvent,
    showDailyEvent, setShowDailyEvent,
    charBgGradient,
  } = useChatInit({
    session: session as { user?: { id?: string; email?: string } } | null,
    status,
    characterId,
    searchParams,
    router,
    setCoinBalance,
    setTodayMsgCount,
    setShowFcModal,
    setShowFcSuccess,
  });

  /* ── メッセージ送信 hook ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { onUserMessage: onUserMsgSent } = useConversationEnd({
    relationshipId,
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

  const {
    inputText, setInputText,
    isSending, setIsSending,
    isSendBouncing,
    currentEmotion, setCurrentEmotion,
    memoryRecalledHint,
    xpFloat,
    randomEvent,
    heartEmojis, hungryEmojis, showStars,
    lastEmotionMsgId,
    bgTheme,
    inFlightRef,
    sendMessage,
    handleSendClick,
    handleSendSticker,
    handleSendImage,
    handleReaction,
  } = useSendMessage({
    characterId,
    userId,
    character,
    relationship,
    inputRef,
    messages,
    setMessages,
    onUserMsgSent,
    setCoinBalance,
    setTodayMsgCount,
    isLateNight,
  });

  /* ── プロアクティブメッセージ ── */
  const { messages: proactiveMessages, unreadCount: proactiveUnread, markAsRead: markProactiveRead } = useProactiveMessages();
  const charProactiveUnread = proactiveMessages.filter(
    (m) => m.characterId === characterId && !m.isRead
  ).length;

  /* ── メッセージ長押しコンテキストメニュー ── */
  const [ctxMenu, setCtxMenu] = useState<{ msgId: string; content: string } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMsgLongPressStart = useCallback((msgId: string, content: string) => {
    longPressTimer.current = setTimeout(() => setCtxMenu({ msgId, content }), 500);
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
    } catch { /* ignore */ }
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

  /* ── 音声ミニプレーヤー ── */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleAudioToggle = useCallback((messageId: string, audioUrl: string) => {
    if (playingAudioId === messageId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(() => setPlayingAudioId(null));
      setPlayingAudioId(messageId);
    }
  }, [playingAudioId]);

  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  /* ── 自動スクロール ── */
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

  /* ── プレースホルダーローテーション ── */
  useEffect(() => {
    if (inputText.length > 0) return;
    const timer = setInterval(() => setPlaceholderIndex((i) => (i + 1) % 6), 3500);
    return () => clearInterval(timer);
  }, [inputText]);

  /* ── モーメントtopicパラメータ対応 ── */
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
          if (parsed.step < 6) { parsed.step = 6; localStorage.setItem('aniva_tutorial_v1', JSON.stringify(parsed)); }
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

  /* ── ストーリーからの自動送信 ── */
  useEffect(() => {
    if (pendingAutoSendRef.current && inputText.trim() && userId && !inFlightRef.current) {
      pendingAutoSendRef.current = false;
      const timer = setTimeout(() => sendMessage(), 500);
      return () => clearTimeout(timer);
    }
  }, [inputText, userId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /* ── 記憶ペーク ── */
  const openMemoryPeek = async () => {
    setShowMemoryPeek(true);
    if (!memoryData && !memoryLoading) {
      setMemoryLoading(true);
      try {
        const res = await fetch(`/api/relationship/${characterId}/memory`);
        const data = await res.json();
        setMemoryData(data);
      } catch { /* ignore */ } finally {
        setMemoryLoading(false);
      }
    }
  };

  /* ── プッシュ通知 ── */
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
      try { await navigator.share({ title: `${charName} | ANIVA`, text: shareText, url: shareUrl }); } catch { /* cancelled */ }
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

  /* ── handleStartChat（自動greeting） ── */
  useEffect(() => {
    if (!shouldAutoGreet) return;
    setShouldAutoGreet(false);
    handleStartChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoGreet]);

  const handleStartChat = async (_userProfile?: UserProfile) => {
    if (typeof window !== 'undefined') localStorage.setItem('aniva_diagnosis_done', '1');
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
          setMessages((prev) => prev.map((m) => m.id === data.message.id ? { ...m, audioUrl: data.audioUrl } : m));
        }
      }
    } catch (e) { console.error('Greeting failed:', e); }
    finally { setIsGreeting(false); }
  };

  /* ── FC決済処理 ── */
  const handleFcSubscribe = async () => {
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
      setShareToast('FC加入処理でエラーが発生しました。しばらくしてから再度お試しください。');
      setTimeout(() => setShareToast(null), 4000);
    }
  };

  /* ── ローディング ── */
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

  return (
    <div
      className={`flex flex-col h-[calc(100dvh-4rem)] min-h-dvh max-w-lg mx-auto relative chat-bg ${isNightMode ? 'night-mode' : ''}`}
      style={{
        background: charBgGradient ? `radial-gradient(ellipse at top, ${bgTheme}), ${charBgGradient}` : `radial-gradient(ellipse at top, ${bgTheme}), #111827`,
        ...(isNightMode ? { filter: 'brightness(0.85) saturate(0.9)', transition: 'filter 0.5s ease' } : {}),
      }}
    >
      <style>{GLOBAL_STYLES}</style>

      {/* 感情アンビエントグロー */}
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

      {/* 深夜モード */}
      {isNightMode && (
        <div className="fixed top-20 right-3 z-40 text-[10px] text-purple-400/60 flex items-center gap-1 pointer-events-none select-none bg-gray-950/60 rounded-full px-2 py-0.5 backdrop-blur-sm">
          <span>🌙</span> <span>おやすみモード</span>
        </div>
      )}

      {/* ══════ モーダル群 ══════ */}
      <ChatModals
        characterId={characterId}
        character={character}
        relationship={relationship}
        relationshipId={relationshipId}
        showOnboarding={showOnboarding}
        onStartChat={handleStartChat}
        showGift={showGift}
        onCloseGift={() => setShowGift(false)}
        setMessages={setMessages}
        setCurrentEmotion={setCurrentEmotion}
        showCall={showCall}
        onCloseCall={() => setShowCall(false)}
        showMemoryPeek={showMemoryPeek}
        memoryData={memoryData}
        memoryLoading={memoryLoading}
        onCloseMemoryPeek={() => setShowMemoryPeek(false)}
        showCallModal={showCallModal}
        onCloseCallModal={() => setShowCallModal(false)}
        onShowCallToast={() => { setCallToast(true); setTimeout(() => setCallToast(false), 3000); }}
        showMenu={showMenu}
        onCloseMenu={() => setShowMenu(false)}
        showWelcomeBack={showWelcomeBack}
        daysSinceLastChat={daysSinceLastChat}
        onDismissWelcomeBack={() => setShowWelcomeBack(false)}
        showStreakBreak={showStreakBreak}
        onCloseStreakBreak={() => setShowStreakBreak(false)}
        onStreakRecovered={(newStreak) => {
          setShowStreakBreak(false);
          setRelationship(prev => prev ? { ...prev, streakDays: newStreak, isStreakActive: true } : prev);
        }}
        showFcSuccess={showFcSuccess}
        onCloseFcSuccess={() => setShowFcSuccess(false)}
        showFcModal={showFcModal}
        onCloseFcModal={() => setShowFcModal(false)}
        onFcSubscribe={handleFcSubscribe}
        levelUpData={levelUpData}
        onCloseLevelUp={() => setLevelUpData(null)}
        showDailyEvent={showDailyEvent}
        dailyEvent={dailyEvent}
        onCloseDailyEvent={() => setShowDailyEvent(false)}
      />

      {/* 準備中トースト */}
      {showComingSoonToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-xl"
          style={{ background: 'rgba(30,20,60,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(139,92,246,0.4)' }}>
          <span>📞</span>
          <span>通話機能は近日公開予定です</span>
        </div>
      )}

      {/* 通話準備中トースト */}
      {callToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-gray-800/95 text-white text-sm px-5 py-2.5 rounded-full shadow-lg border border-white/10 pointer-events-none">
          この機能は近日公開予定です
        </div>
      )}

      {/* ══════ ヘッダー ══════ */}
      <ChatHeader
        character={character}
        relationship={relationship}
        presence={presence}
        characterId={characterId}
        isLateNight={isLateNight}
        onBack={() => router.push('/chat')}
        onCallClick={() => { setShowComingSoonToast(true); setTimeout(() => setShowComingSoonToast(false), 2500); }}
        onMenuClick={() => setShowMenu(true)}
        onMemoryClick={openMemoryPeek}
        onProfileClick={() => router.push(`/profile/${characterId}`)}
        onFcClick={() => setShowFcModal(true)}
        proactiveUnreadCount={charProactiveUnread}
      />

      {/* ══════ プロアクティブメッセージバナー ══════ */}
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

      {/* ══════ 共有トピック ══════ */}
      {relationship?.sharedTopics && relationship.sharedTopics.length > 0 && (
        <div className="flex-shrink-0 bg-gray-950 px-3 py-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-gray-600 flex-shrink-0">覚えてること:</span>
            {relationship.sharedTopics.slice(0, 5).map((topic, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-purple-900/30 text-purple-400/70 px-1.5 py-0.5 rounded-full">
                {topic.type === 'like' ? '💜' : '📝'} {topic.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════ Live2D ビューアー ══════ */}
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
            <button onClick={() => setIsViewerExpanded(false)} className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              <span>縮小する</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════ ランダムイベント ══════ */}
      {randomEvent && (
        <div className="mx-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-purple-900/80 to-pink-900/60 border border-purple-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{randomEvent.emoji}</span>
            <div>
              <p className="text-xs font-black text-purple-300 uppercase tracking-wider">{randomEvent.title}</p>
              <p className="text-sm text-white/80 italic">「{randomEvent.message}」</p>
              {randomEvent.coinReward && <p className="text-xs text-yellow-400 mt-0.5">🪙 +{randomEvent.coinReward} コイン</p>}
            </div>
          </div>
        </div>
      )}

      {/* ══════ 不在バナー ══════ */}
      {presence && !presence.isAvailable && !absenceBannerDismissed && (
        <div className="mx-4 mt-2 flex items-start gap-3 bg-gray-800/80 border border-gray-700/60 rounded-2xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0 text-2xl mt-0.5">{presence.statusEmoji}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-300">
              {character?.name ?? 'キャラクター'}は今 <span className="text-yellow-400">{presence.status}</span>
            </p>
            {presence.statusMessage && <p className="text-xs text-gray-500 mt-0.5 italic">「{presence.statusMessage}」</p>}
            <p className="text-xs text-gray-600 mt-1">メッセージは届くよ。後で返事が来るかも 📩</p>
          </div>
          <button onClick={() => setAbsenceBannerDismissed(true)} className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-400 transition-colors" aria-label="閉じる">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* ══════ メッセージリスト ══════ */}
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

      {/* ══════ エンディングメッセージ ══════ */}
      {endingMessage && character && (
        <div className="px-4 pb-2">
          <EndingMessage
            content={endingMessage.content}
            characterName={character.name}
            characterAvatarUrl={character.avatarUrl}
            onAnimationComplete={() => { setTimeout(() => setEndingMessage(null), 5000); }}
          />
        </div>
      )}

      {/* ══════ 入力エリア ══════ */}
      <TopicCard
        visible={topicCardVisible}
        topicText={topicText}
        character={character}
        onClose={() => { setTopicCardVisible(false); setInputText(''); }}
        onSend={() => { setTopicCardVisible(false); handleSendClick(); }}
      />

      {character && (
        <PushNotificationSetup characterName={character.name} characterSlug={character.slug} variant="banner" />
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
        handleKeyDown={() => {}}
        lastCharacterMessage={
          [...messages].reverse().find((m: Message) => m.role === 'CHARACTER')?.content ?? undefined
        }
      />

      <MessageContextMenu
        ctxMenu={ctxMenu}
        onClose={() => setCtxMenu(null)}
        onCopy={handleCopyMsg}
        onBookmark={handleBookmarkMsg}
        onShare={handleShareMsg}
      />

      {/* 絆XPフロート */}
      {xpFloat && (
        <div key={xpFloat.id} className="fixed z-50 pointer-events-none select-none" style={{ bottom: '120px', right: '20px', animation: 'xpFloatUp 2s ease-out forwards' }}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(219,39,119,0.9))', boxShadow: '0 2px 12px rgba(124,58,237,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
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
