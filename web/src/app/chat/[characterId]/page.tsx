'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { LevelUpModal } from '@/components/chat/LevelUpModal';
import { OnboardingOverlay, type UserProfile } from '@/components/chat/OnboardingOverlay';
import { CallModal } from '@/components/chat/CallModal';
import { GiftPanel } from '@/components/chat/GiftPanel';
import Live2DViewer from '@/components/live2d/Live2DViewer';
import EmotionIndicator from '@/components/live2d/EmotionIndicator';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { LUFFY_MILESTONES, type Milestone } from '@/lib/milestones';
import { getCharacterTheme } from '@/lib/character-themes';
import { WelcomeBackModal } from '@/components/chat/WelcomeBackModal';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMenu } from '@/components/chat/ChatMenu';
import { ChatInput } from '@/components/chat/ChatInput';
import { FcSubscribeModal } from '@/components/chat/FcSubscribeModal';

/* ─────────────── 共通スタイル（keyframes） ─────────────── */
const GLOBAL_STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sendBounce {
    0%   { transform: scale(1); }
    25%  { transform: scale(0.82); }
    60%  { transform: scale(1.18); }
    80%  { transform: scale(0.94); }
    100% { transform: scale(1); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
    50%       { box-shadow: 0 0 16px 4px rgba(168,85,247,0.55); }
  }
  @keyframes viewerSlide {
    from { opacity: 0; max-height: 0; }
    to   { opacity: 1; max-height: 340px; }
  }
  @keyframes audioSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  /* 波形アニメーション（各バーが独立したリズムで動く） */
  @keyframes waveBar {
    0%, 100% { transform: scaleY(0.3); }
    50%       { transform: scaleY(1); }
  }
  /* 感情アニメーション */
  @keyframes bubbleShake {
    0%, 100% { transform: translateX(0); }
    15%, 55%  { transform: translateX(-5px) rotate(-1deg); }
    30%, 70%  { transform: translateX(5px) rotate(1deg); }
    45%, 85%  { transform: translateX(-3px); }
  }
  @keyframes bubbleWiggle {
    0%, 100% { transform: rotate(-2deg) scale(1.02); }
    50%       { transform: rotate(2deg) scale(1.04); }
  }
  @keyframes floatMeat {
    0%   { opacity: 1; transform: translateY(0) scale(1) rotate(-5deg); }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(-130px) scale(1.5) rotate(15deg); }
  }
  @keyframes starTwinkle {
    0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
    40%       { opacity: 1; transform: scale(1.3) rotate(120deg); }
    80%       { opacity: 0.5; transform: scale(0.8) rotate(240deg); }
  }
  @keyframes levelUpBanner {
    0%   { opacity: 0; transform: translateY(-20px) scale(0.9); }
    15%  { opacity: 1; transform: translateY(0) scale(1.05); }
    85%  { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
  }
  .wave-bar {
    display: inline-block;
    width: 3px;
    border-radius: 2px;
    transform-origin: bottom;
    animation: waveBar 0.8s ease-in-out infinite;
  }
  .msg-animate       { animation: fadeInUp 0.32s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes inputFlash {
    0% { box-shadow: 0 0 0 0 rgba(168,85,247,0.6); }
    50% { box-shadow: 0 0 20px 4px rgba(168,85,247,0.3); }
    100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
  }
  .input-flash { animation: inputFlash 0.5s ease-out; }
  .send-bounce       { animation: sendBounce 0.38s ease-out; }
  .send-glow         { animation: glowPulse 1.6s ease-in-out infinite; }
  .viewer-slide      { animation: viewerSlide 0.3s ease-out; }
  .audio-spin        { animation: audioSpin 1.4s linear infinite; }
  .bubble-angry      { animation: bubbleShake 0.5s ease-in-out; }
  .bubble-excited    { animation: bubbleWiggle 0.5s ease-in-out 3; }
  .bubble-levelup    { animation: levelUpBanner 3.5s ease-in-out forwards; }
  .float-meat        { animation: floatMeat 1.6s ease-out forwards; }
  .star-twinkle      { animation: starTwinkle 1.2s ease-in-out infinite; }
  /* Thin custom scrollbar */
  .chat-scroll::-webkit-scrollbar { width: 4px; }
  .chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
  /* テーマカラー背景の滑らかなトランジション */
  .chat-bg { transition: background 1.2s ease; }
`;

/* ─────────────── 型定義 ─────────────── */
interface Message {
  id: string;
  role: 'USER' | 'CHARACTER' | 'SYSTEM';
  content: string;
  metadata?: { emotion?: string; isSystemHint?: boolean; isFarewell?: boolean; isCliffhanger?: boolean };
  createdAt: string;
  audioUrl?: string | null;
}

interface RelationshipInfo {
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number | null;
  totalMessages: number;
  relationshipId?: string;
  character?: { name: string; slug: string };
  isFanclub?: boolean;
  isFollowing?: boolean;
  sharedTopics?: { type: string; text: string }[];
  streakDays?: number;
  isStreakActive?: boolean;
}

interface Character {
  id: string;
  name: string;
  nameEn: string;
  franchise: string;
  avatarUrl: string | null;
  slug?: string;
  voiceModelId?: string | null;
  fcMonthlyPriceJpy?: number;
  fcIncludedCallMin?: number;
  fcMonthlyCoins?: number;
}

const EMOTION_EMOJI: Record<string, string> = {
  excited: '🔥',
  happy: '😄',
  angry: '😤',
  sad: '😢',
  hungry: '🍖',
  neutral: '',
  surprised: '😲',
};

/* ── 感情に応じたバブルスタイル ── */
const EMOTION_BUBBLE_STYLE: Record<string, string> = {
  excited:   'bg-gradient-to-br from-orange-800/80 to-red-800/70 border border-orange-600/40 text-orange-50',
  happy:     'bg-gradient-to-br from-yellow-800/80 to-amber-800/70 border border-yellow-600/40 text-yellow-50',
  angry:     'bg-gradient-to-br from-red-900/80 to-rose-800/70 border border-red-600/40 text-red-50',
  sad:       'bg-gradient-to-br from-blue-900/80 to-indigo-900/70 border border-blue-600/40 text-blue-50',
  hungry:    'bg-gradient-to-br from-orange-900/80 to-yellow-800/70 border border-orange-500/40 text-orange-50',
  surprised: 'bg-gradient-to-br from-cyan-900/80 to-teal-800/70 border border-cyan-600/40 text-cyan-50',
  neutral:   'bg-gray-800/90 text-gray-100 border border-gray-600/30 shadow-md',
};

function getCharacterBubbleStyle(emotion?: string): string {
  if (!emotion) return EMOTION_BUBBLE_STYLE.neutral;
  return EMOTION_BUBBLE_STYLE[emotion] || EMOTION_BUBBLE_STYLE.neutral;
}

function getEmotionEmoji(emotion?: string): string {
  if (!emotion) return '';
  return EMOTION_EMOJI[emotion] || '';
}

/* ─────────────── ミニ音声プレーヤー ─────────────── */
// 波形バーの高さプリセット（再生中のビジュアルリズム）
const WAVE_HEIGHTS = [40, 70, 55, 85, 45, 60, 80, 50, 65, 35];

function MiniAudioPlayer({ audioUrl, messageId, playingId, onToggle }: {
  audioUrl: string;
  messageId: string;
  playingId: string | null;
  onToggle: (id: string, url: string) => void;
}) {
  const isPlaying = playingId === messageId;
  return (
    <button
      onClick={() => onToggle(messageId, audioUrl)}
      className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium transition-all select-none ${
        isPlaying
          ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
          : 'bg-white/10 text-gray-300 border border-white/15 hover:bg-white/15 hover:text-white'
      }`}
      aria-label={isPlaying ? '停止' : '音声を再生'}
    >
      {isPlaying ? (
        <>
          {/* 停止アイコン */}
          <svg className="w-3.5 h-3.5 fill-current text-purple-400 flex-shrink-0" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          {/* 波形バーアニメーション */}
          <span className="flex items-center gap-0.5 h-4">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="wave-bar bg-gradient-to-t from-purple-500 to-pink-400"
                style={{
                  height: `${h}%`,
                  maxHeight: 14,
                  minHeight: 3,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </span>
          <span className="text-purple-300">停止</span>
        </>
      ) : (
        <>
          {/* 再生アイコン */}
          <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {/* 静止波形 */}
          <span className="flex items-center gap-0.5 h-4 opacity-50">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="inline-block w-[3px] rounded-full bg-gray-400"
                style={{ height: `${Math.max(h * 0.5, 20)}%`, maxHeight: 14, minHeight: 2 }}
              />
            ))}
          </span>
          <span>音声を再生</span>
        </>
      )}
    </button>
  );
}

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
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; milestone?: Milestone } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [daysSinceLastChat, setDaysSinceLastChat] = useState(0);
  const [isGreeting, setIsGreeting] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  /* ── 新規 UI state ── */
  const [showCall, setShowCall] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
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
  const [lastEmotionMsgId, setLastEmotionMsgId] = useState<string | null>(null);
  // Free plan 残りメッセージ（後方互換）
  const [userPlan, setUserPlan] = useState<string>('UNKNOWN');
  const [todayMsgCount, setTodayMsgCount] = useState(0);
  // コイン残高（チャット送信後に更新）
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [dailyEvent, setDailyEvent] = useState<{ eventType: string; isNew: boolean; display: { title: string; description: string; animation: string; color: string }; reward?: { coins?: number } } | null>(null);
  const [showDailyEvent, setShowDailyEvent] = useState(false);

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

  /* ── refs ── */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  /* FC決済完了後のお祝いモーダル表示 */
  useEffect(() => {
    if (searchParams.get('fc_success') === '1') {
      setShowFcSuccess(true);
      // URLからパラメータを除去
      router.replace(`/chat/${characterId}`);
    }
  }, [searchParams, characterId, router]);

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
    fetch(`/api/characters/id/${characterId}`)
      .then((res) => res.json())
      .then((data) => { if (data.character) setCharacter(data.character); })
      .catch(console.error);
  }, [characterId]);

  // チャット画面を開いた時刻をlocalStorageに記録（未読バッジのクリア用）
  useEffect(() => {
    if (!characterId || typeof window === 'undefined') return;
    localStorage.setItem(`aniva_chat_visited_${characterId}`, Date.now().toString());
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
            const relRes2 = await fetch(`/api/relationship/${characterId}`);
            const relData2 = await relRes2.json();
            setRelationship(relData2);
            if (relData2?.id) setRelationshipId(relData2.id);
          }
        } catch (e) {
          console.error('Auto-follow failed:', e);
        }
        setShowOnboarding(true);
      } else if (data.messages?.length === 0) {
        setShowOnboarding(true);
      }

      // デイリーイベント判定（変動報酬）
      try {
        const eventRes = await fetch('/api/daily-event');
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setDailyEvent(eventData);
          // 新規判定かつnormal以外なら演出表示
          if (eventData.isNew && eventData.eventType !== 'normal') {
            setShowDailyEvent(true);
            setTimeout(() => setShowDailyEvent(false), 4000);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

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
            // 5分以内のfarewellのみ表示
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              const farewellMsg: Message = {
                id: `farewell-${Date.now()}`,
                role: 'CHARACTER',
                content: farewellText,
                createdAt: new Date().toISOString(),
                metadata: { emotion: 'warm', isFarewell: true },
              };
              setMessages((prev) => [...prev, farewellMsg]);
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
    if (!inputText.trim() || isSending || !userId) return;
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat/send', {
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
        // おねだり演出: 無料上限到達
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
          // FC加入CTAメッセージ
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

      const data = await res.json();
      const characterMsg: Message = data.characterMessage
        ? { ...data.characterMessage, audioUrl: undefined }
        : data.characterMessage;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        data.userMessage,
        characterMsg,
      ]);

      // 残りメッセージ予告（残り2通以下でキャラが予告）
      if (data.relationship?.freeMessagesRemaining !== undefined && data.relationship.freeMessagesRemaining <= 2 && data.relationship.freeMessagesRemaining > 0) {
        const warnings = [
          `（…あと${data.relationship.freeMessagesRemaining}回しか話せねぇのか…もっと話したいのに）`,
          `（今日はあと${data.relationship.freeMessagesRemaining}回か…名残惜しいな…）`,
        ];
        const warningMsg: Message = {
          id: `warn-${Date.now()}`,
          role: 'CHARACTER',
          content: warnings[Math.floor(Math.random() * warnings.length)],
          createdAt: new Date().toISOString(),
          metadata: { emotion: 'sad', isSystemHint: true },
        };
        setMessages((prev) => [...prev, warningMsg]);
      }

      if (data.characterMessage?.metadata?.emotion) {
        const newEmotion = data.characterMessage.metadata.emotion;
        setCurrentEmotion(newEmotion);
        // 感情に応じたテーマカラーを背景に反映
        const EMOTION_THEMES: Record<string, string> = {
          excited:   'rgba(234,88,12,0.08), rgba(153,27,27,0.06)',
          happy:     'rgba(202,138,4,0.08), rgba(161,98,7,0.05)',
          angry:     'rgba(153,27,27,0.10), rgba(190,18,60,0.07)',
          sad:       'rgba(29,78,216,0.09), rgba(67,56,202,0.06)',
          hungry:    'rgba(217,119,6,0.08), rgba(180,83,9,0.05)',
          surprised: 'rgba(14,116,144,0.08), rgba(15,118,110,0.06)',
          neutral:   'rgba(88,28,135,0.06), rgba(0,0,0,0)',
        };
        setBgTheme(EMOTION_THEMES[newEmotion] ?? EMOTION_THEMES.neutral);
        // 感情エフェクトをトリガー
        if (data.characterMessage?.id) setLastEmotionMsgId(data.characterMessage.id);
        if (newEmotion === 'hungry') {
          const emojis = Array.from({ length: 4 }, (_, i) => ({
            id: Date.now() + i,
            x: 15 + i * 20,
            delay: i * 0.25,
          }));
          setHungryEmojis(emojis);
          setTimeout(() => setHungryEmojis([]), 2000);
        }
        if (newEmotion === 'excited') {
          setShowStars(true);
          setTimeout(() => setShowStars(false), 3200);
        }
      }

      if (data.characterMessage && data.characterMessage.role === 'CHARACTER') {
        generateVoiceForMessage(data.characterMessage.id, data.characterMessage.content, characterId);
      }
      // 本日送信数インクリメント（Free plan 表示・後方互換）
      setTodayMsgCount((prev) => prev + 1);
      // デイリーミッション: chat_today 自動完了（1セッション1回）
      if (!sessionStorage.getItem('mission_triggered_chat_today')) {
        sessionStorage.setItem('mission_triggered_chat_today', '1');
        fetch('/api/missions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ missionId: 'chat_today' }),
        }).catch(() => {/* ignore */});
      }
      // コイン残高更新
      if (data.relationship?.coinBalance !== undefined) {
        setCoinBalance(data.relationship.coinBalance);
      }

      // クリフハンガー予告メッセージ（キャラが自然に差し込む）
      if (data.cliffhangerTease) {
        setTimeout(() => {
          const teaseMsg: Message = {
            id: `cliff-${Date.now()}`,
            role: 'CHARACTER',
            content: data.cliffhangerTease,
            createdAt: new Date().toISOString(),
            metadata: { emotion: 'mysterious', isCliffhanger: true },
          };
          setMessages((prev) => [...prev, teaseMsg]);
        }, 2000); // 2秒後に自然に差し込む
      }

      // ストリークマイルストーン通知
      if (data.streak?.milestone) {
        const milestoneMessages: Record<number, string> = {
          7: '🔥 7日連続！すごい絆だ！',
          30: '🔥 30日連続！もう離れられないな…',
          100: '🔥 100日連続！伝説の絆！',
          365: '🔥 365日！1年間ずっと一緒…最高の仲間だ！',
        };
        const streakMsg: Message = {
          id: `streak-${Date.now()}`,
          role: 'SYSTEM',
          content: milestoneMessages[data.streak.milestone] || `🔥 ${data.streak.milestone}日連続ストリーク！`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, streakMsg]);
      }

      if (data.relationship) {
        setRelationship((prev) => ({
          ...(prev || { levelName: '', xp: 0, nextLevelXp: null, totalMessages: 0 }),
          level: data.relationship.level,
          xp: data.relationship.xp,
        }));
        if (data.relationship.leveledUp && data.relationship.newLevel) {
          const milestone = LUFFY_MILESTONES.find((m) => m.level === data.relationship.newLevel);
          setLevelUpData({ newLevel: data.relationship.newLevel, milestone });
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

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
    setIsSendBouncing(true);
    setTimeout(() => setIsSendBouncing(false), 400);
    if (inputRef.current) {
      inputRef.current.classList.add('input-flash');
      setTimeout(() => inputRef.current?.classList.remove('input-flash'), 500);
    }
    sendMessage();
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
      alert('ルフィからの通知をONにしました 🔔');
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
  const handleStartChat = async (_userProfile?: UserProfile) => {
    setShowOnboarding(false);
    setIsGreeting(true);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">読み込み中...</p>
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
      className="flex flex-col h-[100dvh] max-w-lg mx-auto relative chat-bg"
      style={{ background: charBgGradient ? `radial-gradient(ellipse at top, ${bgTheme}), ${charBgGradient}` : `radial-gradient(ellipse at top, ${bgTheme}), #111827` }}
    >
      {/* グローバルスタイル */}
      <style>{GLOBAL_STYLES}</style>

      {/* 🍖 ハングリーエフェクト：浮かぶ肉絵文字 */}
      {hungryEmojis.map((e) => (
        <div
          key={e.id}
          className="absolute bottom-24 z-20 pointer-events-none float-meat text-3xl select-none"
          style={{ left: `${e.x}%`, animationDelay: `${e.delay}s` }}
        >
          🍖
        </div>
      ))}

      {/* ✨ 興奮エフェクト：星が舞う */}
      {showStars && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-xl star-twinkle select-none"
              style={{
                left: `${8 + i * 9}%`,
                top: `${15 + (i % 4) * 20}%`,
                animationDelay: `${i * 0.18}s`,
                animationDuration: `${0.9 + (i % 3) * 0.35}s`,
              }}
            >
              {i % 3 === 0 ? '⭐' : i % 3 === 1 ? '✨' : '🌟'}
            </div>
          ))}
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
        <CallModal
          characterId={characterId}
          characterName={character.name}
          characterAvatar={character.avatarUrl}
          onClose={() => setShowCall(false)}
        />
      )}

      {/* 🧠 記憶ペークモーダル */}
      {showMemoryPeek && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowMemoryPeek(false)}
        >
          <div
            className="w-full max-w-lg bg-gray-950 border-t border-purple-500/20 rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* タイトル */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <h3 className="font-bold text-white text-sm">
                  {character?.name ?? 'キャラ'}の記憶
                </h3>
              </div>
              <button
                onClick={() => setShowMemoryPeek(false)}
                className="text-gray-500 hover:text-gray-300 text-xs p-1"
              >
                ✕
              </button>
            </div>

            {memoryLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : !memoryData || (memoryData.factMemory.length === 0 && memoryData.episodeMemory.length === 0) ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-2">💭</p>
                <p className="text-gray-400 text-xs">まだ記憶がありません</p>
                <p className="text-gray-600 text-xs mt-1">会話を重ねると覚えてくれます</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 統計 */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-900 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-400">{memoryData.totalMessages}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">通話メッセージ</p>
                  </div>
                  {memoryData.firstMessageAt && (
                    <div className="flex-1 bg-gray-900 rounded-xl p-3 text-center">
                      <p className="text-sm font-bold text-pink-400">
                        {new Date(memoryData.firstMessageAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                      </p>
                      <p className="text-gray-500 text-[10px] mt-0.5">初めて話した日</p>
                    </div>
                  )}
                </div>

                {/* 事実記憶 */}
                {memoryData.factMemory.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                      <span>📌</span> あなたのこと
                    </p>
                    <div className="space-y-1.5">
                      {memoryData.factMemory.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 bg-gray-900/70 rounded-lg px-3 py-2">
                          <span className="text-purple-400 mt-0.5 text-xs">•</span>
                          <span className="text-gray-200 text-xs leading-relaxed flex-1">{f.fact}</span>
                          <span className="text-gray-600 text-[10px] flex-shrink-0 mt-0.5">{Math.round(f.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* エピソード記憶 */}
                {memoryData.episodeMemory.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-pink-400 mb-2 flex items-center gap-1">
                      <span>✨</span> 大切な思い出
                    </p>
                    <div className="space-y-1.5">
                      {memoryData.episodeMemory.map((e, i) => (
                        <div key={i} className="bg-gray-900/70 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{e.emotion}</span>
                            <span className="text-gray-500 text-[10px]">
                              {new Date(e.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-gray-200 text-xs leading-relaxed">{e.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 好き嫌い */}
                {(memoryData.preferences.likes.length > 0 || memoryData.preferences.dislikes.length > 0) && (
                  <div className="flex gap-2">
                    {memoryData.preferences.likes.length > 0 && (
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-green-400 mb-1.5">💚 好き</p>
                        <div className="flex flex-wrap gap-1">
                          {memoryData.preferences.likes.slice(0, 6).map((l, i) => (
                            <span key={i} className="text-[10px] bg-green-900/30 border border-green-700/30 text-green-300 rounded-full px-2 py-0.5">
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {memoryData.preferences.dislikes.length > 0 && (
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-red-400 mb-1.5">🔴 苦手</p>
                        <div className="flex flex-wrap gap-1">
                          {memoryData.preferences.dislikes.slice(0, 6).map((d, i) => (
                            <span key={i} className="text-[10px] bg-red-900/30 border border-red-700/30 text-red-300 rounded-full px-2 py-0.5">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📞 通話選択モーダル */}
      {/* 📞 通話選択モーダル — フルスクリーン グラスモーフィズム */}
      {showCallModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-between"
          style={{
            background: 'linear-gradient(160deg, rgba(10,5,30,0.96) 0%, rgba(20,5,50,0.98) 50%, rgba(5,5,20,0.97) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            paddingTop: 'calc(env(safe-area-inset-top) + 3rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
          }}
          onClick={() => setShowCallModal(false)}
        >
          {/* 背景グロー */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-600/15 blur-3xl" />
            <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-pink-600/10 blur-3xl" />
          </div>

          {/* 上部: アバター + 名前 */}
          <div className="flex flex-col items-center gap-4 relative z-10" onClick={(e) => e.stopPropagation()}>
            {/* アバター */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-125" />
              <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-purple-500/40 ring-offset-4 ring-offset-transparent shadow-2xl shadow-purple-900/60">
                {character?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-5xl">🏴‍☠️</div>
                )}
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold tracking-wide">{character?.name ?? 'キャラクター'}</h2>
              <p className="text-gray-400 text-sm mt-1">通話方法を選んでください</p>
            </div>
          </div>

          {/* 中部: 通話選択カード */}
          <div className="w-full max-w-sm px-5 space-y-3 relative z-10" onClick={(e) => e.stopPropagation()}>
            {/* 音声通話カード */}
            <button
              onClick={() => { setCallToast(true); setTimeout(() => setCallToast(false), 3000); }}
              className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98] group"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold text-base">音声通話</div>
                <div className="text-gray-400 text-sm mt-0.5">声を聴く</div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-700/80 text-gray-400 border border-gray-600/30 flex-shrink-0">近日公開</span>
            </button>

            {/* ビデオ通話カード */}
            <button
              onClick={() => { setCallToast(true); setTimeout(() => setCallToast(false), 3000); }}
              className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98] group"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold text-base">ビデオ通話</div>
                <div className="text-gray-400 text-sm mt-0.5">顔を見る</div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-700/80 text-gray-400 border border-gray-600/30 flex-shrink-0">近日公開</span>
            </button>
          </div>

          {/* 下部: キャンセルボタン */}
          <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowCallModal(false)}
              className="px-10 py-3 rounded-full text-gray-400 hover:text-white text-sm transition-colors border border-white/10 hover:border-white/20 hover:bg-white/5"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

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

      {/* 復帰時演出モーダル */}
      {showWelcomeBack && character && (
        <WelcomeBackModal
          characterName={character.name}
          characterAvatar={character.avatarUrl}
          characterSlug={character.slug ?? ''}
          daysSinceLastChat={daysSinceLastChat}
          onClose={() => setShowWelcomeBack(false)}
        />
      )}

      {/* FC加入決済完了お祝いモーダル */}
      {showFcSuccess && character && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-gradient-to-b from-[#1a0a2e] to-[#0d0d1a] border border-yellow-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            {/* キラキラエフェクト */}
            <div className="text-5xl mb-2 animate-bounce">🎉</div>
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              {['✨','⭐','💫','🌟','✨'].map((s, i) => (
                <span key={i} className="absolute text-xl animate-ping opacity-70"
                  style={{ top: `${15 + i * 16}%`, left: `${10 + i * 18}%`, animationDelay: `${i * 0.3}s`, animationDuration: '2s' }}>
                  {s}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">FC加入完了！</h2>
            <p className="text-white/80 text-sm mb-1">
              {character.name}のファンクラブへようこそ💖
            </p>
            <p className="text-white/60 text-xs mb-6">
              チャット無制限・月{character.fcMonthlyCoins ?? 500}コイン・特典コンテンツが解放されました
            </p>
            <button
              onClick={() => setShowFcSuccess(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-base hover:opacity-90 transition"
            >
              {character.name}と話す ▶
            </button>
          </div>
        </div>
      )}

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
              const data = await res.json() as { checkoutUrl?: string; error?: string };
              if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
              } else if (data.error === 'Already subscribed') {
                setShowFcModal(false);
                router.push(`/chat/${characterId}?fc_active=1`);
              } else {
                throw new Error(data.error ?? 'Failed to create checkout session');
              }
            } catch (err) {
              console.error('FC subscribe error:', err);
              // フォールバック: プロフィールページへ
              setShowFcModal(false);
              router.push(`/profile/${characterId}#fc`);
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

      {/* デイリーイベント演出（good/rare/super_rare時） */}
      {showDailyEvent && dailyEvent && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          style={{ animation: 'fadeInUp 0.5s ease-out' }}
        >
          <div
            className="bg-black/80 backdrop-blur-xl rounded-2xl px-8 py-6 text-center border pointer-events-auto"
            style={{
              borderColor: dailyEvent.display.color,
              boxShadow: `0 0 40px ${dailyEvent.display.color}40`,
              animation: dailyEvent.display.animation === 'rainbow'
                ? 'glowPulse 1s ease-in-out infinite'
                : dailyEvent.display.animation === 'glow'
                  ? 'glowPulse 2s ease-in-out infinite'
                  : undefined,
            }}
          >
            <div className="text-2xl font-bold mb-2" style={{ color: dailyEvent.display.color }}>
              {dailyEvent.display.title}
            </div>
            <div className="text-gray-300 text-sm">{dailyEvent.display.description}</div>
            {dailyEvent.reward?.coins && (
              <div className="mt-3 text-amber-400 font-semibold">
                +{dailyEvent.reward.coins} コイン獲得！
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ ヘッダー ══════════════ */}
      <ChatHeader
        character={character}
        relationship={relationship}
        presence={presence}
        characterId={characterId}
        isLateNight={isLateNight}
        onBack={() => router.push('/chat')}
        onCallClick={() => setShowCallModal(true)}
        onMenuClick={() => setShowMenu(true)}
        onMemoryClick={openMemoryPeek}
        onProfileClick={() => router.push(`/profile/${characterId}`)}
        onFcClick={() => setShowFcModal(true)}
      />

      {/* ══════════════ 共有トピック（覚えてくれてる記憶） ══════════════ */}
      {relationship?.sharedTopics && relationship.sharedTopics.length > 0 && (
        <div className="flex-shrink-0 bg-purple-950/30 border-b border-white/5 px-3 py-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] text-gray-500 flex-shrink-0">覚えてること:</span>
            {relationship.sharedTopics.slice(0, 5).map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/30"
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
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-3">
        {messages.length === 0 && !isSending && (
          <div className="text-center text-gray-500 py-16">
            <div className="text-5xl mb-4 opacity-60">💬</div>
            <p className="text-sm font-medium text-gray-400">最初のメッセージを送ろう！</p>
            <p className="text-xs text-gray-600 mt-1">{character?.name ?? 'キャラクター'}が待ってるぞ</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          // 日付セパレーター計算
          const msgDate = new Date(msg.createdAt);
          const prevMsg = messages[idx - 1];
          const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
          const showDateSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          let dateLabelText = '';
          if (showDateSeparator) {
            if (msgDate.toDateString() === today.toDateString()) {
              dateLabelText = '今日';
            } else if (msgDate.toDateString() === yesterday.toDateString()) {
              dateLabelText = '昨日';
            } else {
              dateLabelText = `${msgDate.getMonth() + 1}月${msgDate.getDate()}日`;
            }
          }

          // SYSTEM メッセージ（CTA等）は専用UI
          if (msg.role === 'SYSTEM') {
            return (
              <div key={msg.id}>
                {showDateSeparator && (
                  <div className="flex items-center gap-3 my-4 px-2">
                    <div className="flex-1 h-px bg-gray-800" />
                    <span className="text-[11px] text-gray-600 font-medium px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800">{dateLabelText}</span>
                    <div className="flex-1 h-px bg-gray-800" />
                  </div>
                )}
                <div className="msg-animate flex justify-center my-2" style={{ animationDelay: `${Math.min(idx * 30, 120)}ms` }}>
                  <button
                    onClick={() => setShowFcModal(true)}
                    className="block max-w-[85%] bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/30 rounded-2xl px-5 py-3 text-center backdrop-blur-sm hover:border-purple-400/50 transition-all"
                  >
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                    <span className="inline-block mt-2 text-xs font-bold text-purple-300 bg-purple-500/20 px-4 py-1.5 rounded-full">
                      FC会員になる →
                    </span>
                  </button>
                </div>
              </div>
            );
          }

          const isUser = msg.role === 'USER';
          const emotion = msg.metadata?.emotion;
          const emotionEmoji = getEmotionEmoji(emotion);
          // 記憶参照タグ検出・除去
          const hasMemoryRef = !isUser && msg.content.includes('【MEMORY_REF】');
          const displayContent = hasMemoryRef ? msg.content.replace(/【MEMORY_REF】/g, '').trim() : msg.content;
          // 連続メッセージの最後にだけアバター表示
          const nextMsg = messages[idx + 1];
          const showAvatar = !isUser && (nextMsg?.role !== 'CHARACTER' || nextMsg == null);

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-4 px-2">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-[11px] text-gray-600 font-medium px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800">{dateLabelText}</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
              )}
            <div
              className={`msg-animate flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
              style={{ animationDelay: `${Math.min(idx * 30, 120)}ms` }}
            >
              {/* キャラクターアバター */}
              {!isUser && (
                <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                  {character?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm">
                      🏴‍☠️
                    </div>
                  )}
                </div>
              )}

              <div className={`max-w-[78%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
                {!isUser && showAvatar && (
                  <span className="text-xs text-gray-500 px-1 ml-0.5">
                    {character?.name ?? 'キャラクター'}
                  </span>
                )}

                {/* 💭 記憶参照バッジ */}
                {hasMemoryRef && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-0.5 ml-0.5 select-none"
                    style={{
                      background: 'rgba(168,85,247,0.18)',
                      color: '#d8b4fe',
                      border: '1px solid rgba(168,85,247,0.35)',
                      boxShadow: '0 0 8px 2px rgba(168,85,247,0.25)',
                    }}
                  >
                    💭 覚えてるよ
                  </span>
                )}

                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-colors duration-500 select-none ${
                    isUser
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-sm shadow-purple-900/30'
                      : `rounded-2xl rounded-tl-sm ${getCharacterBubbleStyle(emotion)} ${
                      msg.id === lastEmotionMsgId && emotion === 'angry'   ? 'bubble-angry'   :
                      msg.id === lastEmotionMsgId && emotion === 'excited' ? 'bubble-excited' : ''
                    }`
                  }`}
                  style={hasMemoryRef ? { boxShadow: '0 0 12px 3px rgba(168,85,247,0.35)' } : undefined}
                  onTouchStart={!isUser ? () => handleMsgLongPressStart(msg.id, displayContent) : undefined}
                  onTouchEnd={!isUser ? handleMsgLongPressEnd : undefined}
                  onTouchMove={!isUser ? handleMsgLongPressEnd : undefined}
                  onMouseDown={!isUser ? () => handleMsgLongPressStart(msg.id, displayContent) : undefined}
                  onMouseUp={!isUser ? handleMsgLongPressEnd : undefined}
                  onMouseLeave={!isUser ? handleMsgLongPressEnd : undefined}
                  onContextMenu={!isUser ? (e) => { e.preventDefault(); setCtxMenu({ msgId: msg.id, content: displayContent }); } : undefined}
                >
                  <span className="whitespace-pre-wrap break-words">{displayContent}</span>
                  {emotionEmoji && (
                    <span className="ml-1.5 text-base">{emotionEmoji}</span>
                  )}

                  {/* ミニ音声プレーヤー */}
                  {!isUser && msg.audioUrl && (
                    <MiniAudioPlayer
                      audioUrl={msg.audioUrl}
                      messageId={msg.id}
                      playingId={playingAudioId}
                      onToggle={handleAudioToggle}
                    />
                  )}

                  {/* 音声生成中スピナー */}
                  {!isUser && msg.audioUrl === undefined && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-full border border-gray-500 border-t-transparent animate-spin inline-block" />
                      <span>音声生成中...</span>
                    </div>
                  )}
                </div>

                {/* タイムスタンプ + 既読 */}
                <span className="text-[10px] text-gray-600 px-1 flex items-center gap-1">
                  {new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  {isUser && idx === messages.length - 1 && (
                    (() => {
                      const hasCharReply = messages.slice(idx + 1).some((m: Message) => m.role === 'CHARACTER');
                      return hasCharReply ? (
                        <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M1 12l5 5L17 6M7 12l5 5L23 6" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
                        </svg>
                      );
                    })()
                  )}
                </span>
              </div>
            </div>
            </div>
          );
        })}

        {/* タイピングインジケーター */}
        {isSending && (
          <div className="flex justify-start items-end gap-2 msg-animate">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1">
              {character?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.avatarUrl} alt={character?.name ?? ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm">
                  🏴‍☠️
                </div>
              )}
            </div>
            <TypingIndicator characterName={character?.name} avatarUrl={character?.avatarUrl} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ══════════════ 入力エリア ══════════════ */}
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSendClick}
        isSending={isSending}
        isGreeting={isGreeting}
        character={character}
        characterId={characterId}
        coinBalance={coinBalance}
        relationship={relationship}
        inputRef={inputRef}
        isSendBouncing={isSendBouncing}
        placeholderIndex={placeholderIndex}
        showPlusMenu={showPlusMenu}
        setShowPlusMenu={setShowPlusMenu}
        onGift={() => setShowGift(true)}
        handleKeyDown={handleKeyDown}
        lastCharacterMessage={
          [...messages].reverse().find((m: Message) => m.role === 'CHARACTER')?.content ?? undefined
        }
      />
      {/* メッセージ長押しコンテキストメニュー */}
      {ctxMenu && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={() => setCtxMenu(null)}
        >
          <div
            className="bg-gray-800 border border-white/10 rounded-2xl shadow-2xl p-1 min-w-[160px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleCopyMsg(ctxMenu.content)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
            >
              <span className="text-lg">📋</span>
              <span>コピー</span>
            </button>
            <button
              onClick={() => handleBookmarkMsg(ctxMenu.msgId, ctxMenu.content)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
            >
              <span className="text-lg">🔖</span>
              <span>ブックマーク</span>
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ text: ctxMenu.content }).catch(() => {});
                } else {
                  handleCopyMsg(ctxMenu.content);
                }
                setCtxMenu(null);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
            >
              <span className="text-lg">🔗</span>
              <span>シェア</span>
            </button>
            <button
              onClick={() => setCtxMenu(null)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-gray-400 text-sm text-left"
            >
              <span className="text-lg">✕</span>
              <span>閉じる</span>
            </button>
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
