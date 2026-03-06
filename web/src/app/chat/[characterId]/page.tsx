'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { LevelUpModal } from '@/components/chat/LevelUpModal';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import type { Message, Character } from '@/components/chat/ChatMessageList';
import { OnboardingOverlay, type UserProfile } from '@/components/chat/OnboardingOverlay';
import { CallModal } from '@/components/chat/CallModal';
import { RealtimeCallModal } from '@/components/chat/RealtimeCallModal';
import { GiftPanel } from '@/components/chat/GiftPanel';
import { playSound, vibrateLevelUp, vibrateReaction, vibrateSend } from '@/lib/sound-effects';
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

/* ─────────────── ユーティリティ ─────────────── */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type TextEmotion = 'excited' | 'angry' | 'shy' | 'sad' | 'neutral';

function detectEmotionForDelay(text: string): { emotion: TextEmotion; delay: number; pauseEffect: boolean } {
  if (/！！|すげぇ|最高/.test(text)) return { emotion: 'excited', delay: 300, pauseEffect: false };
  if (/許さねぇ|ふざけんな/.test(text)) return { emotion: 'angry', delay: 200, pauseEffect: false };
  if (/別に|うるせぇ/.test(text)) return { emotion: 'shy', delay: 1200, pauseEffect: true };
  const ellipsisCount = (text.match(/…/g) ?? []).length;
  if (ellipsisCount >= 2) return { emotion: 'sad', delay: 1500, pauseEffect: true };
  const defaultDelay = Math.min(600 + text.length * 10, 2000);
  return { emotion: 'neutral', delay: defaultDelay, pauseEffect: false };
}

/* ─────────────── リアクション → キャラ反応パターン ─────────────── */
const REACTION_RESPONSES: Record<string, Record<string, string[]>> = {
  luffy: {
    '❤️': ['え？なんかくれんの？肉か？！…って、照れるじゃねーか！', 'うれしいぞ！！へへへ！', 'なんだなんだ、おれのことが好きか！？まぁ…おれも好きだぞ！'],
    '😂': ['なにわらってんだ！おれも笑っちまうだろ！', 'そんなにおかしかったか！？ははは！！', 'いっしょに笑おうぜ！！ははははは！！'],
    '😢': ['泣くなよ！！おれが心配になるじゃねーか！', 'どうした！？誰かいじめたのか！？言ってくれ！', '泣かなくていい！おれがいるぞ！絶対守ってやる！'],
    '🔥': ['おう！！燃えてきたぞ！！かかってこい！！', 'そうだろそうだろ！！最高だろ！！', 'よっしゃああ！！やる気でてきた！！いくぞ！！'],
    '👏': ['へへ！ほめても何も出ねーぞ！…でもうれしいな！', 'おれをほめてくれんのか！！うれしいぞ！！', 'まぁ…ありがとな！！また言ってくれよ！'],
  },
  zoro: {
    '❤️': ['…別に嬉しくねぇ', 'うるせぇ…', 'そういうことするな。…集中できないだろ'],
    '😂': ['笑うなよ', '…なにがおかしい', 'ちっ、つられて笑うじゃねぇか'],
    '😢': ['泣くな', '大丈夫か', '…なんかあったか。言ってみろ'],
    '🔥': ['当然だ', 'おれは常にそうだ', 'かかってこい。全力で相手してやる'],
    '👏': ['褒めても何も出ねーぞ', '…まぁ悪くねぇ', '…ありがとな'],
  },
  nami: {
    '❤️': ['もう！急に何よ…照れるじゃない', 'えへへ…ありがとね。素直に嬉しい', 'そういうの、悪くないわよ。また言ってよね？'],
    '😂': ['何笑ってるの！？こっちも笑えてきたじゃない！', 'もー！笑わせないでよ！…あははは！', 'もう、一緒に笑うじゃない！笑わせ上手ね'],
    '😢': ['大丈夫？何かあった？話してよ', '泣かないで！私がいるから！', 'ちょっと！どうしたの？一人にしないから'],
    '🔥': ['そうでしょ！！私が本気出したらね！', 'えっへん！！当然よ！もっと褒めていいのよ？', 'いいでしょー！！燃えてきた！！'],
    '👏': ['まあ、褒めてくれるのは素直に嬉しいけど', 'ふふ、ありがとね。照れちゃう', '…照れるじゃない。もう少し言ってくれてもいいのよ？'],
  },
  sanji: {
    '❤️': ['お前のためなら何でもするぜ！俺に言ってくれ', 'そんな風に言われると…嬉しいな。ありがとよ', 'へへ、ありがとよ。もっと言ってくれていいんだぜ？'],
    '😂': ['笑うなよ！恥ずかしいじゃねーか！…でも笑顔は最高だな', 'お前が笑うと俺も笑えてくる。いい顔してんな', 'まったく…そんな笑顔したら俺も笑えてくるだろ'],
    '😢': ['泣くな！その目に涙は似合わない！俺がいる！', '大丈夫か？何かあったか？全部話してくれ', '俺に話してくれ。絶対力になるからよ'],
    '🔥': ['見せてやるよ！俺の本気をな！', 'おう！かかってこい！燃えてきたぜ！', '燃えてきたぜ！最高の料理で応えてやる！'],
    '👏': ['そんな目で見るなよ、照れる', 'お前に褒められると悪い気しないな…ありがとよ', 'ありがとよ。俺もっと頑張れそうだ'],
  },
  ace: {
    '❤️': ['え…ありがとな。嬉しいよ', 'そんなこと言ってくれるのか…照れるじゃないか', 'へへ、照れるじゃないか。でも嬉しいよ'],
    '😂': ['笑うなよ！俺も笑っちまうだろ！', 'ははは！お前と笑ってると楽しいな', '一緒に笑っちまうじゃないか！あははは！'],
    '😢': ['泣くなよ…大丈夫か？', '俺がいるぞ。なんでも話してくれ', 'なんかあったか？一人で抱え込むなよ'],
    '🔥': ['おう！燃えるぜ！一緒に行こう！', '当然だろ！俺の炎は消えない！', 'かかってこい！全力で燃えてやる！'],
    '👏': ['褒めても何も出ねーぞ…でもありがとな', '…ありがとな。嬉しいよ', 'へへ、そんなに言うか。嬉しいよ'],
  },
  chopper: {
    '❤️': ['べ、別に嬉しくなんかないぞ！！…嬉しい！！', 'うわぁ！！ありがとう！！すごく嬉しい！！', 'そ、そういうこと言うなよ！照れるだろ！…でも嬉しいぞ！'],
    '😂': ['笑うなよ！！俺まで笑えてきた！！あははは！！', 'な、なんで笑ってんだよ！！でも俺も笑えてきた！！', 'いっしょに笑っちゃうだろ！！もう！！'],
    '😢': ['大丈夫か！？ドクターチョッパーが診てやる！！', '泣くな！！俺が絶対治してやる！！', 'ど、どうした！？一人にしないからな！！'],
    '🔥': ['おお！燃えるな！！俺もやる気出てきた！！', 'す、すごい！！俺も一緒に頑張るぞ！！', 'よっしゃ！！一緒に燃えようぜ！！'],
    '👏': ['ほ、褒めても何も出ねーぞ！！…出るけど！！', 'う、嬉しくなんかないからな！！…めちゃくちゃ嬉しいけど！！', 'あ、ありがとな…！！本当に嬉しい！！'],
  },
  usopp: {
    '❤️': ['お、俺の実力をわかってくれるか！！感謝するぞ！！', 'へへへ！そうだろそうだろ！俺ってモテるんだよな！', 'え、えへへ…照れるじゃないか！でも嬉しいぞ！'],
    '😂': ['笑うなよ！こっちも笑えてくるだろ！はははは！', 'そんなに面白かったか！？俺の話術は天下一品だからな！', '一緒に笑っちゃうだろ！はははは！'],
    '😢': ['泣くなよ！俺の心も痛くなってくるじゃないか！', 'お、俺がついてるぞ！心配するな！', '俺に任せろ！…絶対大丈夫だから！'],
    '🔥': ['お、おう！俺も燃えてきた！！俺の勇敢な姿を見せてやる！', 'もちろんだ！俺は8000万の男だからな！', '俺に任せろ！かかってこい！！（ちょっと怖いけど）'],
    '👏': ['へへ！俺の偉大さがわかったか！', '当然だ！俺の実力は本物だからな！…ありがとな', 'へへへ…そんなに褒めるなよ！…嬉しいけど！'],
  },
};

const DEFAULT_REACTION_RESPONSES: Record<string, string[]> = {
  '❤️': ['え…ありがとう。照れるな', '別にそんな…嬉しくないし。…ちょっとだけ嬉しい', 'そういうの、嬉しいよ'],
  '😂': ['笑うなよ！', '一緒に笑っちゃうだろ！', 'なにがそんなにおかしいんだ！'],
  '😢': ['泣くなよ…', '大丈夫か？', 'どうしたんだ？一人で抱え込むなよ'],
  '🔥': ['おう！燃えるぜ！', '当然だろ！', 'いい感じじゃないか！一緒に燃えよう！'],
  '👏': ['褒めても何も出ねーぞ', '…ありがとな', 'そんなに？嬉しいよ'],
};

const REACTION_EMOTION: Record<string, string> = {
  '❤️': 'shy',
  '😂': 'excited',
  '😢': 'sad',
  '🔥': 'excited',
  '👏': 'happy',
};

function getReactionResponse(characterSlug: string, emoji: string): string {
  const charMap = REACTION_RESPONSES[characterSlug];
  const patterns = charMap?.[emoji] ?? DEFAULT_REACTION_RESPONSES[emoji] ?? ['…'];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

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
  /* 絆XPフロートアニメーション */
  @keyframes xpFloatUp {
    0%   { opacity: 0; transform: translateY(0px) scale(0.8); }
    15%  { opacity: 1; transform: translateY(-6px) scale(1.05); }
    60%  { opacity: 0.9; transform: translateY(-18px) scale(1); }
    100% { opacity: 0; transform: translateY(-36px) scale(0.9); }
  }
  /* ---- 新規感情吹き出しアニメーション ---- */
  /* 照れ: 左右に小さく揺れ */
  @keyframes bubbleShyWiggle {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-3px); }
    40%       { transform: translateX(3px); }
    60%       { transform: translateX(-2px); }
    80%       { transform: translateX(2px); }
  }
  /* 悲しみ: 全体がゆっくりフェードイン */
  @keyframes bubbleSadFade {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 0.88; transform: translateY(0); }
  }
  /* 寂しい: わずかに小さく出現 */
  @keyframes bubbleLonelyIn {
    from { opacity: 0; transform: scale(0.93); }
    to   { opacity: 1; transform: scale(0.97); }
  }
  /* 興奮スパークル */
  @keyframes sparkleFloat1 {
    0%   { opacity: 0; transform: translate(0, 0) scale(0) rotate(0deg); }
    30%  { opacity: 1; transform: translate(-8px, -12px) scale(1.1) rotate(60deg); }
    100% { opacity: 0; transform: translate(-4px, -26px) scale(0.5) rotate(140deg); }
  }
  @keyframes sparkleFloat2 {
    0%   { opacity: 0; transform: translate(0, 0) scale(0) rotate(0deg); }
    40%  { opacity: 1; transform: translate(10px, -10px) scale(1.0) rotate(-45deg); }
    100% { opacity: 0; transform: translate(6px, -24px) scale(0.5) rotate(-120deg); }
  }
  .bubble-shy {
    animation: bubbleShyWiggle 0.7s ease-in-out;
    box-shadow: 0 0 0 1px rgba(236,72,153,0.25), 0 4px 16px rgba(236,72,153,0.12) !important;
  }
  .bubble-sad {
    animation: bubbleSadFade 0.8s ease-out forwards;
  }
  .bubble-lonely {
    animation: bubbleLonelyIn 0.6s ease-out forwards;
  }
  .sparkle-1 {
    position: absolute;
    top: -4px; right: 4px;
    font-size: 11px;
    pointer-events: none;
    animation: sparkleFloat1 1.1s ease-out forwards;
    z-index: 10;
    user-select: none;
  }
  .sparkle-2 {
    position: absolute;
    top: 2px; right: -8px;
    font-size: 10px;
    pointer-events: none;
    animation: sparkleFloat2 1.1s ease-out forwards;
    animation-delay: 0.2s;
    opacity: 0;
    z-index: 10;
    user-select: none;
  }
`;

/* ─────────────── 型定義 ─────────────── */
// Message と Character は ChatMessageList.tsx からインポート

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
  const [randomEvent, setRandomEvent] = useState<RandomEvent | null>(null);
  // 絆XPフロートアニメーション（チャット送信後に+XP表示）
  const [xpFloat, setXpFloat] = useState<{ amount: number; id: number } | null>(null);
  const prevXpRef = useRef<number>(0);
  // コイン残高（チャット送信後に更新）
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [dailyEvent, setDailyEvent] = useState<{ eventType: string; isNew: boolean; display: { title: string; description: string; animation: string; color: string }; reward?: { coins?: number } } | null>(null);
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

  /* ── リアクション → キャラ反応ハンドラ ── */
  const handleReaction = useCallback((msgId: string, emoji: string, characterSlug: string) => {
    vibrateReaction(); // 軽い振動フィードバック
    // 1〜2秒後にキャラがリアクションに反応するメッセージを追加
    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      const responseText = getReactionResponse(characterSlug || character?.slug || '', emoji);
      const reactionResponseMsg: Message = {
        id: `reaction-res-${Date.now()}`,
        role: 'CHARACTER',
        content: responseText,
        createdAt: new Date().toISOString(),
        metadata: { emotion: REACTION_EMOTION[emoji] ?? 'neutral' },
      };
      setMessages((prev) => [...prev, reactionResponseMsg]);
      playSound('message_receive');
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.slug]);

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

  /* FC決済完了後のお祝いモーダル表示 */
  useEffect(() => {
    if (searchParams.get('fc_success') === '1') {
      setShowFcSuccess(true);
      // URLからパラメータを除去
      router.replace(`/chat/${characterId}`);
    }
  }, [searchParams, characterId, router]);

  /* モーメントtopicパラメータ対応 — キャラ読込後にプリセット */
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (!topicParam || !character) return;
    const truncated = topicParam.slice(0, 100);
    setTopicText(truncated);

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
        prevXpRef.current = relData?.xp ?? 0;
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
        // ストリーク途切れチェック
        if (relData.streakDays === 0 && relData.isStreakActive === false) {
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
            const relRes2 = await fetch(`/api/relationship/${characterId}`);
            const relData2 = await relRes2.json();
            setRelationship(relData2);
            if (relData2?.id) setRelationshipId(relData2.id);
          }
        } catch (e) {
          console.error('Auto-follow failed:', e);
        }
        // ストーリーから来た場合はオンボーディングスキップ
        if (!searchParams.get('fromStory')) {
          setShowOnboarding(true);
        }
      } else if (data.messages?.length === 0) {
        if (!searchParams.get('fromStory')) {
          setShowOnboarding(true);
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

      // ストリーミング中のキャラメッセージを仮追加
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { ...tempUserMsg, id: tempUserMsg.id }, // keep user msg
        {
          id: streamMsgId,
          role: 'CHARACTER',
          content: '',
          createdAt: new Date().toISOString(),
          metadata: { isStreaming: true },
        },
      ]);

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

              // ストリーク表示
              if (parsed.streak?.isNew && parsed.streak.days > 0) {
                // streak更新のハンドリング（既存のstreakロジックがあればここで呼ぶ）
              }

              // レベルアップ
              if (parsed.levelUp) {
                // レベルアップ演出（既存があれば呼ぶ）
              }
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
        const EMOTION_THEMES: Record<string, string> = {
          excited:   'rgba(234,88,12,0.08), rgba(153,27,27,0.06)',
          happy:     'rgba(202,138,4,0.08), rgba(161,98,7,0.05)',
          angry:     'rgba(153,27,27,0.10), rgba(190,18,60,0.07)',
          sad:       'rgba(29,78,216,0.09), rgba(67,56,202,0.06)',
          hungry:    'rgba(217,119,6,0.08), rgba(180,83,9,0.05)',
          surprised: 'rgba(14,116,144,0.08), rgba(15,118,110,0.06)',
          neutral:   'rgba(88,28,135,0.06), rgba(0,0,0,0)',
        };
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
      className={`flex flex-col h-[calc(100dvh-4rem)] max-w-lg mx-auto relative chat-bg ${isNightMode ? 'night-mode' : ''}`}
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
        <div className="fixed top-4 right-4 z-50 text-[10px] text-purple-400/60 flex items-center gap-1 pointer-events-none select-none">
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
          previousStreak={relationship.streakDays ?? 0}
          onClose={() => setShowStreakBreak(false)}
          onRecovered={(newStreak) => {
            setShowStreakBreak(false);
            setRelationship(prev => prev ? { ...prev, streakDays: newStreak, isStreakActive: true } : prev);
          }}
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
        proactiveUnreadCount={charProactiveUnread}
      />

      {/* ══════════════ プロアクティブメッセージバナー ══════════════ */}
      {proactiveMessages.filter(m => m.characterId === characterId && !m.isRead).map(msg => (
        <div
          key={msg.id}
          className="mx-3 my-1 p-2.5 bg-purple-900/30 border border-purple-500/20 rounded-2xl cursor-pointer hover:bg-purple-900/50 transition-colors"
          onClick={async () => { await markProactiveRead(msg.id); }}
        >
          <p className="text-[13px] text-purple-200/80">{msg.content}</p>
          <CountdownTimer expiresAt={msg.expiresAt} className="mt-1" />
        </div>
      ))}

      {/* ══════════════ 共有トピック（覚えてくれてる記憶） ══════════════ */}
      {relationship?.sharedTopics && relationship.sharedTopics.length > 0 && (
        <div className="flex-shrink-0 bg-gray-950 px-3 py-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[9px] text-gray-600 flex-shrink-0">覚えてること:</span>
            {relationship.sharedTopics.slice(0, 5).map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-[9px] bg-purple-900/30 text-purple-400/70 px-1.5 py-0.5 rounded-full"
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
        showStars={showStars}
        messagesEndRef={messagesEndRef}
        onAudioToggle={handleAudioToggle}
        onMsgLongPressStart={handleMsgLongPressStart}
        onMsgLongPressEnd={handleMsgLongPressEnd}
        onCtxMenu={(msgId, content) => setCtxMenu({ msgId, content })}
        onFcClick={() => setShowFcModal(true)}
        onReaction={handleReaction}
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
      {topicCardVisible && topicText && character && (
        <div className="px-3 pb-2">
          <div className="relative bg-purple-900/30 border border-purple-500/30 rounded-2xl p-3 flex items-start gap-3">
            {/* 閉じるボタン */}
            <button
              className="absolute top-2 right-2 text-white/30 hover:text-white/60 transition-colors"
              onClick={() => { setTopicCardVisible(false); setInputText(''); }}
              aria-label="話題カードを閉じる"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* キャラアバター */}
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/40">
              {character.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            {/* コンテンツ */}
            <div className="flex-1 min-w-0 mr-5">
              <p className="text-purple-300 text-[10px] font-semibold mb-1">📸 タイムラインの話題</p>
              <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{topicText}</p>
              <button
                className="mt-2 flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors active:scale-95"
                onClick={() => {
                  setTopicCardVisible(false);
                  handleSendClick();
                }}
              >
                この話題で話す →
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 絆XPフロートアニメーション */}
      {xpFloat && (
        <div
          key={xpFloat.id}
          className="fixed z-50 pointer-events-none select-none"
          style={{
            bottom: '120px',
            right: '24px',
            animation: 'xpFloatUp 1.8s ease-out forwards',
          }}
        >
          <span className="text-sm font-bold text-purple-300/90 drop-shadow-sm">
            💫 +{xpFloat.amount} XP
          </span>
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
