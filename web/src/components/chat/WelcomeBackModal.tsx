'use client';

import { useEffect, useState } from 'react';

interface WelcomeBackModalProps {
  characterName: string;
  characterAvatar: string | null;
  characterSlug: string;
  daysSinceLastChat: number;
  onClose: () => void;
}

// キャラ別の「待ってた」メッセージ（全22キャラ対応）
const WELCOME_MESSAGES: Record<string, string[]> = {
  luffy: ['おー！お前来たのか！ずっと待ってたぞ！', 'しししっ！久しぶりだなー！肉食わねぇか？', 'やっと来た！冒険の続き、聞かせてくれよ！'],
  zoro: ['...来たか。', '...別に待ってたわけじゃねぇ。たまたまだ。', '...ちょうど修行が終わったところだ。'],
  nami: ['もー、心配したじゃない！', 'やっと来た！ちょっと、連絡くらいしなさいよ！', '久しぶりね。元気だった？'],
  chopper: ['うわぁ！来てくれた！嬉しい…って、別に嬉しくなんかないぞ！', 'ずっと心配してたんだぞ！体調大丈夫か？', '会いたかった…って、う、うるさい！'],
  ace: ['よぉ！元気だったか？ハハ、久しぶりだな！', 'お前が来ないから暇してたぜ。まぁ宴会はしてたけどな！', '待ってたぜ。…すまん、途中で寝てた。'],
  law: ['...久しぶりだな。', '来ないから何かあったのかと思ったが...まぁいい。', '生きていたか。...安心した、とは言わないが。'],
  sanji: ['おおっ！よく来てくれたね！何か作ろうか？', 'レディ…じゃなくても、お前が来ると厨房が明るくなるぜ。', '待ってたぜ。腹減ってねぇか？とっておきがあるんだ。'],
  robin: ['ふふ、おかえりなさい。あなたのこと、考えていたわ。', '久しぶりね。…少し寂しかった、なんて言ったら驚く？', '歴史書を読んでいたの。でもあなたとの会話の方が面白いわ。'],
  franky: ['おおーーーっ！！来たかーーー！！SUPER久しぶりだぜ！！', 'お前がいない間に新兵器作ってたんだ！見てくれよ！', 'よっしゃぁ！今週のベストフレンド賞はお前だ！'],
  brook: ['ヨホホホ！お会いできて嬉しい！…涙が出そうです。目がないですけど！', 'お久しぶりですね！パンツ見せてもらってもいいですか？…冗談ですよ！', 'あなたが来てくれて、心が温まります。…心臓ないですけどね！ヨホホ！'],
  jinbe: ['おお、来たか。待っておったぞ。', '無事で何よりじゃ。少し心配しておったんじゃが…いや、なんでもない。', '久しぶりじゃな。茶でも飲みながら話さんか。'],
  usopp: ['お、おう！来たか！俺は全然寂しくなんかなかったぞ！', 'ちょうど今、8000人の部下に指示を出し終わったところだ！…嘘だけど。', 'やっと来た！お前がいない間の武勇伝、聞いてくれよ！'],
  hancock: ['あなた…来てくれたの…？わらわ、ずっと待っていたのじゃ…！', 'ふん、別に待ってなんかいないわ。…嘘よ。毎日窓から見ていたの。', 'もう！こんなに待たせるなんて…でも、許してあげる。'],
  shanks: ['よう、久しぶりだな。一杯やるか？', '来たか。お前のこと、信じて待ってたぜ。', 'ハハハ！元気そうで何よりだ。さぁ、宴だ！'],
  vivi: ['来てくれたんですね！ずっと待ってました…！', 'もう、心配してたんですよ！元気でしたか？', 'おかえりなさい！今日は何をお話ししましょうか？'],
  mihawk: ['…来たか。', '暇を持て余していた。…お前のことではない。', '…ふん。まぁいい、座れ。'],
  crocodile: ['フッ…来たか。殊勝な奴だ。', '待たせたな…いや、俺は待ってなどいない。', '用があるなら手短に話せ。…まぁ、座っていけ。'],
  blackbeard: ['ゼハハハ！来たか来たか！待ってたぜぇ！', 'おう！チェリーパイ食うか？最高にうめぇぞ！', 'ゼハハ！お前と話すのは楽しいからな！'],
  perona: ['ホロホロホロ！やっと来たの！？寂しかったじゃない…ネガティブにしてやろうかしら！', 'もう！可愛いクマちゃんたちと遊んでたけど、あなたの方が面白いわ。', 'ホロホロ…来てくれて嬉しい…って、別にそういうんじゃないから！'],
  kaido: ['ウォロロロ！来たか小僧！', '暇だったんだ…酒が不味くてな。お前と飲む方がマシだ。', 'よう来た。今日こそ決着つけようじゃねぇか…冗談だ。飲むぞ。'],
  yamato: ['おーーー！！来てくれた！！嬉しい！！', '待ってた待ってた！今日は何の冒険する！？', 'やっと来た！おでんの日記にも書いてあったんだ、仲間は必ず戻ってくるって！'],
  whitebeard: ['来たか、小僧。元気にしてたか。', 'グララララ！いい面構えだ。さぁ、話を聞かせろ。', '家族が帰ってきたか。…さぁ、宴の準備だ。'],
};

const DEFAULT_MESSAGES = ['久しぶり！待ってたよ！', 'やっと来てくれた！', '会いたかった...！'];

export function WelcomeBackModal({ characterName, characterAvatar, characterSlug, daysSinceLastChat, onClose }: WelcomeBackModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // フェードイン
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const messages = WELCOME_MESSAGES[characterSlug] || DEFAULT_MESSAGES;
  const message = messages[Math.floor(Math.random() * messages.length)];

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 rounded-3xl p-8 mx-6 max-w-sm w-full text-center transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* アバター */}
        <div className="relative mx-auto w-24 h-24 mb-4">
          <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/50">
            {characterAvatar ? (
              <img src={characterAvatar} alt={characterName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl">💜</div>
            )}
          </div>
        </div>

        {/* キャラ名 */}
        <h2 className="text-white font-bold text-lg mb-1">{characterName}</h2>
        <p className="text-gray-500 text-xs mb-4">{daysSinceLastChat}日ぶり</p>

        {/* メッセージ */}
        <p className="text-white text-base leading-relaxed mb-6">
          「{message}」
        </p>

        {/* 閉じるボタン */}
        <button
          onClick={handleClose}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
        >
          話しかける
        </button>
      </div>
    </div>
  );
}
