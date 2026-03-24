'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { isSoundMuted, toggleSoundMute } from '@/lib/sound-effects';
import { StickerPicker } from './StickerPicker';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useCoinPurchase } from '@/components/coins/CoinPurchaseContext';

interface Character {
  id: string;
  name: string;
  nameEn?: string | null;
  franchise: string;
  franchiseEn?: string | null;
  description?: string | null;
  avatarUrl: string | null;
  coverUrl?: string | null;
  slug?: string;
  voiceModelId?: string | null;
  fcMonthlyPriceJpy?: number;
  fcIncludedCallMin?: number;
  fcMonthlyCoins?: number;
  catchphrases?: string[];
  personalityTraits?: string[];
  hasVoice?: boolean;
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

/* ── クイック返信チップ ── */
const QUICK_REPLIES_BY_SLUG: Record<string, string[]> = {
  luffy: ['腹減った！', '仲間になれよ！', '海賊王になる！', 'ゴムゴムの〜！', '冒険しようぜ！'],
  zoro: ['迷ってる...', '修業中だ', '眠い', '強くなりたい', 'なんでもねぇ'],
  nami: ['お金ちょうだい！', '地図描いてるよ', 'うらやましい〜', '天気変わりそう', '財布見せて'],
  sanji: ['料理作るよ', '美しい...', 'ゾロと喧嘩した', '空腹？', 'お役に立てて光栄'],
  chopper: ['医者だよ！', 'ドクドクミ〜', '人間じゃないよ！', '診察しようか', 'わーい！'],
  robin: ['あら、そう', '歴史を調べてる', '花びらみたい', '少し疲れた', 'ふふ'],
  brook: ['ヨホホ！', '骨格標本になっちゃった', 'パンツ見せて', '音楽が好き', '生きてるよ'],
  franky: ['SUPERだぜ！', 'コーラを飲みたい', '改造したい', '船大工さ', 'SUPER！！'],
  usopp: ['嘘じゃないよ！', '勇気が出ない', '10億人の兵士！', '狙撃の腕前は', '冒険したい'],
  jinbe: ['落ち着いて', '仁義を守る', '魚人だ', 'ルフィ船長！', '海流を読んで'],
  law: ['心臓持ってる', 'ルームッ！', '同盟を組もう', 'シャンブルズ！', '計算通り'],
  hancock: ['ぺろな様', '愛が大きすぎる', 'キスしてあげる', '美しいでしょ', 'ルフィ〜！'],
  shanks: ['乾杯！', 'ルフィを頼む', '冒険を楽しんで', '帽子を返して', '見守ってるよ'],
  yamato: ['おでんになりたい！', '冒険したい！', '父上…', 'ワノ国から出たい', '鬼神！'],
  mihawk: ['剣技を磨け', 'ゾロを鍛えてる', '強者はいるか', '最強の剣士', '決闘しよう'],
  crocodile: ['砂漠の王者', '計画通り', 'スナスナ！', 'アラバスタ...', '弱者は嫌いだ'],
  perona: ['ネガティブホロウ！', '幽霊が好き！', 'かわいいでしょ', 'ネガティブ！', 'ぬいぐるみ欲しい'],
  whitebeard: ['息子たちよ！', '家族を守る', 'グラグラ！', '時代を変える', '海賊の夢'],
  blackbeard: ['夢を諦めるな！', 'ヤミヤミ！', '大物になる', '運命だぜ', 'グラグラ...'],
  ace: ['炎が好き！', '弟を守る', 'メラメラ！', 'ルフィのこと', '生きててよかった'],
  kaido: ['最強の生き物', '酒が飲みたい', 'ワノ国は俺の', 'バオウ！', '強さだけが正義'],
  vivi: ['アラバスタのために', 'ご馳走様', '皆が好き', '困ったな', 'いつまでも友達'],
};
const GENERIC_QUICK_REPLIES = ['おはよう！', 'おやすみ！', '元気？', '好きだよ❤️', 'ありがとう', '今何してる？'];

/* ── プレースホルダーベース ── */
const BASE_PLACEHOLDERS = [
  (name: string) => `${name}に話しかける...`,
  (name: string) => `${name}に何か聞いてみよう！`,
  (_: string) => '今日はどんな気分？',
  (_: string) => '推しに伝えたいことは？',
  (name: string) => `${name}と話そう 😊`,
  (_: string) => '一緒に冒険しようぜ！',
  (_: string) => '「○○が好き」って伝えてみて…',
  (name: string) => `${name}の秘密、聞いてみる？`,
  (_: string) => '「ありがとう」って言ってみよう',
  (name: string) => `${name}の本音、聞けるかも…`,
];

const LATE_NIGHT_PLACEHOLDERS = [
  (name: string) => `${name}もまだ起きてるよ…`,
  (_: string) => 'こんな時間に何考えてる？',
  (name: string) => `${name}に夜の秘密話…`,
  (_: string) => '眠れない夜は、ここにおいで',
  (name: string) => `${name}と二人きりの時間…`,
  (_: string) => '小さな声で話そうか…',
];

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  onSendImage?: (file: File) => void;
  onSendSticker?: (stickerUrl: string, label: string) => void;
  isSending: boolean;
  isGreeting: boolean;
  character: Character | null;
  characterId: string;
  coinBalance: number | null;
  relationship: RelationshipInfo | null;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isSendBouncing: boolean;
  isLateNight?: boolean;
  placeholderIndex: number;
  showPlusMenu: boolean;
  setShowPlusMenu: React.Dispatch<React.SetStateAction<boolean>>;
  onGift: () => void;
  onFcClick?: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  lastCharacterMessage?: string;
}

export function ChatInput({
  inputText,
  setInputText,
  onSend,
  onSendImage,
  onSendSticker,
  isSending,
  isGreeting,
  character,
  characterId,
  coinBalance,
  relationship,
  inputRef,
  isSendBouncing,
  isLateNight = false,
  placeholderIndex,
  showPlusMenu,
  setShowPlusMenu,
  onGift,
  onFcClick,
  handleKeyDown,
  lastCharacterMessage,
}: ChatInputProps) {
  const t = useTranslations('chat');
  const tc = useTranslations('common');
  const hasInput = inputText.length > 0;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  // LINE風 展開/折りたたみ state
  const [isExpanded, setIsExpanded] = useState(false);

  // 🎤 音声入力
  const { openCoinPurchase } = useCoinPurchase();
  const { isListening, isSupported: isVoiceSupported, interimText, toggleListening } = useVoiceInput({
    language: 'ja-JP',
    onResult: (text) => {
      setInputText(inputText + text);
    },
    onInterim: () => {
      // リアルタイムプレビュー（interimTextで表示）
    },
  });
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(() => isSoundMuted());
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  const handleToggleSound = useCallback(() => {
    const muted = toggleSoundMute();
    setSoundMuted(muted);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t('imageSizeTooLarge'));
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert(t('imageTypeNotSupported'));
      return;
    }
    if (onSendImage) {
      setSelectedImageName(file.name);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      onSendImage(file);
    } else {
      setSelectedImageName(file.name);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
    e.target.value = '';
  };

  const clearImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImageName(null);
    setImagePreviewUrl(null);
  };

  return (
    <div className="flex-shrink-0 border-t border-white/8 bg-gray-950 px-3 py-2 relative" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      {/* スタンプピッカー */}
      <StickerPicker
        characterSlug={character?.slug || ''}
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={(url, label) => onSendSticker?.(url, label)}
      />
      {/* コイン残高 + FC加入バー（FC非加入時のみ） */}
      {!relationship?.isFanclub && coinBalance !== null && (
        <div className="flex flex-col gap-1.5 mb-2 px-1">
          {coinBalance <= 5 && coinBalance > 0 && (
            <button onClick={() => openCoinPurchase(coinBalance)} className="flex items-center gap-2 bg-red-900/40 border border-red-500/30 rounded-xl px-3 py-2 text-xs w-full text-left active:scale-[0.98]">
              <span className="text-red-300 font-medium">{t('coinLow', { count: coinBalance, name: character?.name ?? '推し' })}</span>
              <span className="text-red-400 ml-auto">{t('coinRefill')}</span>
            </button>
          )}
          {coinBalance === 0 && (
            <button onClick={() => openCoinPurchase(0)} className="flex items-center gap-2 bg-red-900/60 border border-red-500/40 rounded-xl px-3 py-2.5 text-xs animate-pulse w-full text-left active:scale-[0.98]">
              <span className="text-red-200 font-bold">{t('coinEmpty', { name: character?.name ?? '推し' })}</span>
              <span className="text-red-300 ml-auto font-bold">{t('coinRefillNow')}</span>
            </button>
          )}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCoinPurchase(coinBalance)}
              className={`flex items-center gap-0.5 text-xs rounded-full pl-1.5 pr-2.5 py-1 transition-colors active:scale-95 ${coinBalance <= 5 ? 'bg-red-900/40 hover:bg-red-800/50' : 'bg-gray-800/80 hover:bg-gray-700/80'}`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-400/60">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                <circle cx="12" cy="12" r="10"/><path d="M12 7v10M9 10h6M9 14h6" strokeLinecap="round"/>
              </svg>
              <span className={`font-bold ml-0.5 ${coinBalance <= 5 ? 'text-red-300' : 'text-amber-300'}`}>{coinBalance}</span>
            </button>
            <button
              onClick={handleToggleSound}
              title={soundMuted ? t('soundOn') : t('soundOff')}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors p-1"
            >
              {soundMuted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round"/>
                  <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={() => onFcClick?.()}
            className="flex items-center gap-1 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-3 py-1.5 font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-900/30"
          >
            <span>⭐</span>
            <span>{t('fcJoinUnlimited')}</span>
          </button>
          </div>
        </div>
      )}
      {/* ── クイック返信チップ（入力が空の時のみ表示） ── */}
      {!inputText && !isSending && !isGreeting && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-1 no-scrollbar">
          {(character?.slug && QUICK_REPLIES_BY_SLUG[character.slug]
            ? QUICK_REPLIES_BY_SLUG[character.slug]
            : GENERIC_QUICK_REPLIES
          ).map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setInputText(chip);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 50);
              }}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-purple-500/30 text-purple-300 bg-purple-900/20 hover:bg-purple-900/40 hover:border-purple-500/60 transition-all touch-manipulation whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* 画像プレビュー */}
      {imagePreviewUrl && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="選択した画像"
              className="h-16 w-16 object-cover rounded-xl border border-purple-500/40"
            />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
          <span className="text-xs text-gray-400 truncate max-w-[160px]">{selectedImageName}</span>
        </div>
      )}

      <div className="relative flex items-end gap-1">
        {/* 隠しファイル入力: +ボタン（全ファイル） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={handleImageSelect}
          className="hidden"
          aria-hidden="true"
        />
        {/* カメラ起動用 */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          className="hidden"
          aria-hidden="true"
        />
        {/* 写真ライブラリ（画像のみ） */}
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          aria-hidden="true"
        />

        {/* ── LINE風 左側エリア ── */}
        <div className="flex items-center gap-0 flex-shrink-0">
          {isExpanded ? (
            <>
              {/* 折りたたみボタン (＜) */}
              <button
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
                aria-label={tc('closeMenu')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {/* + ボタン → ファイル送信 */}
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
                aria-label={t('sendFile')}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                </svg>
              </button>
              {/* 📷 カメラ → カメラ起動 */}
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
                aria-label="camera"
                onClick={() => cameraInputRef.current?.click()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {/* 🖼️ 画像/動画 → カメラフォルダ */}
              <button
                onClick={() => mediaInputRef.current?.click()}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
                aria-label={t('sendImage')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          ) : (
            /* 展開ボタン (＞) */
            <button
              onClick={() => setIsExpanded(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
              aria-label={tc('openMenu')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── テキスト入力 + インラインアイコン ── */}
        <div className={`flex-1 min-w-0 relative flex items-end bg-gray-800 rounded-2xl border transition-all ${
          hasInput || imagePreviewUrl
            ? 'border-purple-500/60 ring-1 ring-purple-500/30'
            : 'border-gray-700/60'
        }`}>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening && interimText ? `🎤 ${interimText}` : isListening ? t('callStatusListening') : isLateNight ? LATE_NIGHT_PLACEHOLDERS[placeholderIndex % LATE_NIGHT_PLACEHOLDERS.length](character?.name ?? 'キャラクター') : BASE_PLACEHOLDERS[placeholderIndex](character?.name ?? 'キャラクター')}
            maxLength={2000}
            rows={1}
            disabled={isSending || isGreeting}
            style={{ fontSize: '16px', resize: 'none' }}
            enterKeyHint="send"
            inputMode="text"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm pl-3 pr-1 py-2 focus:outline-none disabled:opacity-50 touch-manipulation overflow-y-auto"
          />
          {/* インラインアイコン: スタンプ */}
          <div className="flex items-center pr-1.5 pb-1.5 flex-shrink-0">
            {onSendSticker && (
              <button
                onClick={() => setShowStickerPicker(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
                aria-label={t('sticker')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="2.5"/>
                  <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="2.5"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── 右側: 送信/マイク + ギフト ── */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {(hasInput || imagePreviewUrl) ? (
            <button
              onClick={onSend}
              disabled={isSending || isGreeting}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden touch-manipulation ${
                isSendBouncing ? 'send-bounce' : ''
              } send-glow`}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)',
              }}
              aria-label={t('send')}
            >
              <span className="absolute inset-0 bg-white/10 rounded-full" />
              <svg className="w-4 h-4 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          ) : isVoiceSupported ? (
            <button
              onClick={toggleListening}
              disabled={isSending || isGreeting}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all touch-manipulation relative overflow-hidden ${
                isListening ? 'voice-pulse' : ''
              }`}
              style={{
                background: isListening
                  ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
                  : 'transparent',
              }}
              aria-label={isListening ? t('voiceInputStop') : t('voiceInput')}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-500/30" />
              )}
              <svg className={`w-5 h-5 relative z-10 ${isListening ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={true}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-40 cursor-not-allowed touch-manipulation"
              aria-label={t('send')}
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
          {/* 🎁 ギフトボタン */}
          <button
            onClick={onGift}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-pink-400 hover:bg-pink-500/15 transition-all touch-manipulation -ml-0.5"
            aria-label={t('giftButton')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 12v10H4V12" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 7h20v5H2z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 22V7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 文字数カウンター */}
      <div className={`text-right mt-0.5 pr-12 transition-colors ${
        inputText.length >= 1900 ? 'text-red-400' :
        inputText.length >= 1500 ? 'text-amber-400' : 'text-gray-600'
      } text-xs`}>
        {inputText.length > 0 && `${inputText.length}/2000`}
      </div>
    </div>
  );
}
