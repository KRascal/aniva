'use client';

import React from 'react';

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
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
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
  handleKeyDown,
}: ChatInputProps) {
  const hasInput = inputText.length > 0;

  return (
    <div className="flex-shrink-0 border-t border-white/8 bg-black/60 backdrop-blur-md px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] mb-[env(safe-area-inset-bottom)]">
      {/* コイン残高表示（FC非加入時のみ） */}
      {!relationship?.isFanclub && coinBalance !== null && (
        <div className="flex items-center gap-1.5 text-xs mb-2 px-1">
          <span className="text-amber-400">💰</span>
          <span className="text-amber-400/80">
            <span className="font-bold text-amber-300">{coinBalance}</span> コイン
          </span>
          <span className="text-gray-600">|</span>
          <a
            href="/coins"
            className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
          >
            コインを購入 →
          </a>
          <span className="text-gray-600">|</span>
          <a
            href={`/relationship/${characterId}/fanclub`}
            className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
          >
            FC加入で無制限 →
          </a>
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

      <div className="relative flex items-center gap-2">
        {/* ＋ボタン + ポップアップメニュー */}
        <div className="relative flex-shrink-0">
          {showPlusMenu && (
            <div className="absolute bottom-12 left-0 bg-gray-800 border border-white/10 rounded-2xl p-2 space-y-1 shadow-xl z-10 min-w-[160px]">
              <button
                onClick={() => { onGift(); setShowPlusMenu(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
              >
                <span className="text-xl">🎁</span>
                <span>ギフトを送る</span>
              </button>
              <a
                href="/coins"
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm"
              >
                <span className="text-xl">💰</span>
                <span>コインを購入</span>
              </a>
              <button
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-500 text-sm text-left cursor-not-allowed"
                disabled
              >
                <span className="text-xl opacity-50">📷</span>
                <span className="opacity-50">画像を送る</span>
                <span className="ml-auto text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">準備中</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowPlusMenu((v) => !v)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-all touch-manipulation border border-gray-700/60 text-xl font-light"
            aria-label="メニューを開く"
          >
            ＋
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
            hasInput
              ? 'border-purple-500/60 ring-1 ring-purple-500/30'
              : 'border-gray-700/60'
          }`}
        />

        {/* 送信ボタン */}
        <button
          onClick={onSend}
          disabled={isSending || isGreeting || !hasInput}
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden touch-manipulation ${
            isSendBouncing ? 'send-bounce' : ''
          } ${hasInput ? 'send-glow' : ''}`}
          style={{
            background: hasInput
              ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)'
              : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
          }}
          aria-label="送信"
        >
          {/* 光るハイライト */}
          {hasInput && (
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
    </div>
  );
}
