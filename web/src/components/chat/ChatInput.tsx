'use client';

import React, { useRef, useState, useCallback } from 'react';
import { isSoundMuted, toggleSoundMute } from '@/lib/sound-effects';

interface Character {
  id: string;
  name: string;
  nameEn: string;
  franchise: string;
  avatarUrl: string | null;
  slug?: string;
  voiceModelId?: string | null;
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
];

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  isGreeting: boolean;
  character: Character | null;
  characterId: string;
  coinBalance: number | null;
  relationship: RelationshipInfo | null;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isSendBouncing: boolean;
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
  isSending,
  isGreeting,
  character,
  characterId,
  coinBalance,
  relationship,
  inputRef,
  isSendBouncing,
  placeholderIndex,
  showPlusMenu,
  setShowPlusMenu,
  onGift,
  onFcClick,
  handleKeyDown,
  lastCharacterMessage,
}: ChatInputProps) {
  const hasInput = inputText.length > 0;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(() => isSoundMuted());

  const handleToggleSound = useCallback(() => {
    const muted = toggleSoundMute();
    setSoundMuted(muted);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('画像サイズは5MB以下にしてください');
      return;
    }
    setSelectedImageName(file.name);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setShowPlusMenu(false);
    // Reset file input so same file can be reselected
    e.target.value = '';
  };

  const clearImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImageName(null);
    setImagePreviewUrl(null);
  };

  return (
    <div className="flex-shrink-0 border-t border-white/8 bg-gray-950 px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] mb-[env(safe-area-inset-bottom)]">
      {/* コイン残高 + FC加入バー（FC非加入時のみ） */}
      {!relationship?.isFanclub && coinBalance !== null && (
        <div className="flex flex-col gap-1.5 mb-2 px-1">
          {/* コイン残高が少ない時の煽り */}
          {coinBalance <= 5 && coinBalance > 0 && (
            <a href="/coins" className="flex items-center gap-2 bg-red-900/40 border border-red-500/30 rounded-xl px-3 py-2 text-xs">
              <span className="text-base">⚠️</span>
              <span className="text-red-300 font-medium">残り{coinBalance}コイン…{character?.name ?? '推し'}との会話が途切れちゃう</span>
              <span className="text-red-400 ml-auto">→ 補充</span>
            </a>
          )}
          {coinBalance === 0 && (
            <a href="/coins" className="flex items-center gap-2 bg-red-900/60 border border-red-500/40 rounded-xl px-3 py-2.5 text-xs animate-pulse">
              <span className="text-base">💔</span>
              <span className="text-red-200 font-bold">{character?.name ?? '推し'}が待ってるのに…コインがない</span>
              <span className="text-red-300 ml-auto font-bold">→ 今すぐ補充</span>
            </a>
          )}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/coins" className={`flex items-center gap-1 text-xs rounded-full px-2.5 py-1 transition-colors ${coinBalance <= 5 ? 'bg-red-900/40 hover:bg-red-800/50' : 'bg-gray-800/80 hover:bg-gray-700/80'}`}>
              <span className="text-amber-400 text-sm">🪙</span>
              <span className={`font-bold ${coinBalance <= 5 ? 'text-red-300' : 'text-amber-300'}`}>{coinBalance}</span>
              <span className="text-gray-400">コイン</span>
            </a>
            <button
              onClick={handleToggleSound}
              title={soundMuted ? 'サウンドON' : 'サウンドOFF'}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors p-1"
            >
              {soundMuted ? '🔇' : '🔊'}
            </button>
          </div>
          <button
            onClick={() => onFcClick?.()}
            className="flex items-center gap-1 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-3 py-1.5 font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-900/30"
          >
            <span>⭐</span>
            <span>FC加入でチャット無制限</span>
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

      <div className="relative flex items-center gap-2">
        {/* 隠しファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          aria-hidden="true"
        />

        {/* ＋ボタン + ポップアップメニュー */}
        <div className="relative flex-shrink-0">
          {showPlusMenu && (
            <div
              className="absolute bottom-14 left-0 bg-gray-900 border border-white/10 rounded-2xl p-2 space-y-1 shadow-2xl z-10 min-w-[168px]"
              style={{
                animation: 'slideUpFade 0.18s ease-out',
              }}
            >
              {/* 画像を送る（未実装 — 準備中表示） */}
              <button
                onClick={() => { setShowPlusMenu(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/40 text-sm text-left cursor-not-allowed"
                disabled
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-white/40">画像を送る <span className="text-xs text-gray-600">（準備中）</span></span>
              </button>
              {/* ギフトを贈る */}
              <button
                onClick={() => { onGift(); setShowPlusMenu(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors text-white text-sm text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-pink-500/30 transition-colors">
                  <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a4 4 0 00-4-4 4 4 0 00-4 4v2h8zM12 8V6a4 4 0 014-4 4 4 0 014 4v2h-8zM3 9h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </div>
                <span className="text-white/80">ギフトを贈る</span>
              </button>
              {/* コインを購入 */}
              <a
                href="/coins"
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors text-white text-sm group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/30 transition-colors">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v2m0 8v2m-4-6h8" />
                  </svg>
                </div>
                <span className="text-white/80">コインを購入</span>
              </a>
            </div>
          )}
          <button
            onClick={() => setShowPlusMenu((v) => !v)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all touch-manipulation shadow-md"
            style={{
              background: showPlusMenu
                ? 'linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)'
                : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              boxShadow: showPlusMenu ? '0 0 12px rgba(168,85,247,0.5)' : '0 2px 8px rgba(124,58,237,0.3)',
            }}
            aria-label={showPlusMenu ? 'メニューを閉じる' : 'メニューを開く'}
          >
            <span
              className="text-white font-bold text-lg leading-none"
              style={{
                transform: showPlusMenu ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'inline-block',
              }}
            >
              ＋
            </span>
          </button>
        </div>
        {/* テキスト入力 */}
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            // auto-resize: 1行〜最大5行
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder={BASE_PLACEHOLDERS[placeholderIndex](character?.name ?? 'キャラクター')}
          maxLength={2000}
          rows={1}
          disabled={isSending || isGreeting}
          style={{ fontSize: '16px', resize: 'none' }} // prevent iOS auto-zoom
          className={`flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-3xl px-4 py-3 focus:outline-none transition-all disabled:opacity-50 border touch-manipulation overflow-y-auto ${
            hasInput || imagePreviewUrl
              ? 'border-purple-500/60 ring-1 ring-purple-500/30'
              : 'border-gray-700/60'
          }`}
        />

        {/* 送信ボタン */}
        <button
          onClick={onSend}
          disabled={isSending || isGreeting || (!hasInput && !imagePreviewUrl)}
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden touch-manipulation ${
            isSendBouncing ? 'send-bounce' : ''
          } ${(hasInput || imagePreviewUrl) ? 'send-glow' : ''}`}
          style={{
            background: (hasInput || imagePreviewUrl)
              ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)'
              : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
          }}
          aria-label="送信"
        >
          {/* 光るハイライト */}
          {(hasInput || imagePreviewUrl) && (
            <span className="absolute inset-0 bg-white/10 rounded-full" />
          )}
          <svg className="w-5 h-5 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* 文字数カウンター */}
      <div className={`text-right mt-1 pr-14 transition-colors ${
        inputText.length >= 1900 ? 'text-red-400' :
        inputText.length >= 1500 ? 'text-amber-400' : 'text-gray-600'
      } text-[11px]`}>
        {inputText.length > 0 && `${inputText.length}/2000`}
      </div>

      <style jsx>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
