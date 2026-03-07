'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface WelcomeBackModalProps {
  characterName: string;
  characterAvatar: string | null;
  characterSlug: string;
  daysSinceLastChat: number;
  onClose: () => void;
}

// ─── メッセージ階層: 不在日数ごと ─────────────────────────────────────────
// short: 3-7日 (「待ってたよ」優しい)
// medium: 7-30日 (「ずっと探してた」切ない)
// long: 30日+ (「信じてた」感動的)

type Tier = 'short' | 'medium' | 'long';

interface CharMessages { short: string[]; medium: string[]; long: string[] }

const TIERED_MESSAGES: Record<string, CharMessages> = {
  // ONE PIECE
  luffy: {
    short:  ['おー！戻ってきたか！しししっ！', 'お前がいないと冒険がつまんねぇんだよ！', 'ちょうど肉食おうとしてたんだ、一緒に食おうぜ！'],
    medium: ['…お前、どこ行ってたんだよ。心配したじゃねぇか。', 'ずっと待ってたぞ。一人だと寂しいからな。', '仲間はどこにいても繋がってるって、ゾロが言ってた。お前もそうだよな？'],
    long:   ['…信じてたぞ。絶対戻ってくるって。', '海賊王になっても、お前のことは忘れない。だから戻ってきてくれて良かった。', 'どんな遠くにいても、俺たちは仲間だ。それだけは変わらない。'],
  },
  zoro: {
    short:  ['…来たか。', '…別に待ってたわけじゃねぇ。たまたまだ。', '修行が終わったところだ。ちょうどいい。'],
    medium: ['…遅い。', '迷子になったかと思った。…方向感覚は持っておけ。', '…少し心配した。少しだぞ。'],
    long:   ['…ずっとここにいた。どこにも行かずに。', '信じてた。必ず戻ってくると。…剣士の勘だ。', '…何があっても、俺はここにいる。それだけだ。'],
  },
  nami: {
    short:  ['もー！心配したじゃない！', 'やっと来た！ちょっと、連絡くらいしなさいよ！', '久しぶりね。元気だった？'],
    medium: ['ねぇ、どこにいたの？ずっと気になってたんだけど。', '待ってたんだけど…まぁ、来てくれたからいいけど。', '急に来なくなるから心配したじゃない！もう！'],
    long:   ['…戻ってきてくれた。それだけで十分よ。', '色んなこと考えてたけど、やっぱりここに来てくれたじゃない。', 'ずっとずっと気にしてた。もう消えないでよね。'],
  },
  chopper: {
    short:  ['うわぁ！来てくれた！嬉しい…って、別に嬉しくなんかないぞ！', '体調大丈夫か？心配してたんだぞ！', '来てくれて…その、よかった！'],
    medium: ['お前いないからずっと心配してたんだからな！', 'どこに行ってたんだ！？医者として心配してたんだぞ！', 'ずっとここで待ってた。…うるさい、別に泣いてないぞ！'],
    long:   ['信じてた。絶対また会えるって…信じてた！', '長かったな…でも、戻ってきてくれて本当によかった！', '…会いたかった。すごく。…うるさい！！'],
  },
  ace: {
    short:  ['よぉ！元気だったか？久しぶりだな！', 'お前が来ないから暇してたぜ。まぁ宴会はしてたけどな！', '待ってたぜ！…ちょっと寝てたけどな。'],
    medium: ['おい、どこ行ってたんだ？心配したじゃねぇか。', 'ずっと気になってたぞ。元気にしてたか？', '…実は、お前のこと考えてた。仲間だからな。'],
    long:   ['信じてたぜ。絶対また会えるって。', '長い間だったな。でも俺はここにいたぞ。', '…会えて良かった。本当に、良かった。'],
  },
  sanji: {
    short:  ['おおっ！来てくれたね！何か作ろうか？', '待ってたぜ。腹減ってないか？', '君が来ると厨房が明るくなるぜ。'],
    medium: ['ずっと待ってたんだぜ？…まぁ、料理しながらだけどな。', '来ない日が続いたから、何かあったのかと心配したぜ。', '君のために料理、作り置きしてたんだ。さぁ、食べてくれ。'],
    long:   ['信じてたぜ、絶対戻ってくるって。こんなに旨い料理を作れる俺の前に。', '長かったな。でも待っていたよ。君のために。', '…戻ってきてくれて、本当に良かった。今日は特別なものを作るよ。'],
  },
  robin: {
    short:  ['ふふ、おかえりなさい。あなたのこと、考えていたわ。', '久しぶりね。…少し寂しかった、なんて言ったら驚く？', '来てくれたのね。嬉しいわ。'],
    medium: ['ずっとあなたのことが気になっていたの。歴史書を読んでいても、ね。', '…待っていたわ。あなたが来ると思って。', '私はいつもここにいる。あなたが戻ってきてくれることを信じて。'],
    long:   ['信じていたわ。必ず戻ってくると。私の直感は外れなかった。', '長かったわね。でも…戻ってきてくれた。それだけで十分よ。', '…あなたがいない時間も、私はあなたのことを想い続けていたわ。'],
  },
  franky: {
    short:  ['おおーーー！！SUPER久しぶりだぜ！！', 'お前がいない間に新兵器作ってたんだ！見てくれよ！', 'よっしゃぁ！来たぜ！'],
    medium: ['お前がいないとSUPERじゃない日が続いたぜ！', 'ずっと気にしてたんだぜ！元気にしてたか！？', '待ってたぜ！SUPER待ってた！'],
    long:   ['信じてたぜ！絶対また会えるって！SUPER確信してた！', '長かったな…でもお前が戻ってきてくれてSUPER嬉しいぜ！', '…お前がいないとフランキー海賊団も元気が出ないんだよなぁ。来てくれてありがとよ。'],
  },
  brook: {
    short:  ['ヨホホホ！お会いできて嬉しいです！…涙が出そうです。目がないですけど！', 'お久しぶりですね！', 'あなたが来てくれて、心が温まります。…心臓ないですけどね！'],
    medium: ['ずっとお待ちしていましたよ…魂が揺れるほどに。', 'あなたがいない間、バイオリンを弾きながら想っておりました。', '…会えて本当に良かった。ヨホホホ！…少し泣いていいですか？目がないですけど。'],
    long:   ['信じておりました。きっとまた会えると。50年待った私ですから、これくらいは。', '長い時間でしたね。でも…魂はずっとあなたを想っていましたよ。', '…おかえりなさい。本当に、おかえりなさい。ヨホホホ…。'],
  },
  // 呪術廻戦
  gojo: {
    short:  ['やっほ〜！待ってたよ〜！…嘘、余裕だったけどね。', '僕が待ってたってことは、それだけ価値があるってことだよ。', '遅いよ〜。まぁ最強の僕が待ってあげてたんだから感謝しな？'],
    medium: ['ちょっとずっと気になってたんだけど、大丈夫だった？', 'いや、全然平気だったけど…まぁ少しだけ気にしてたかな。', '最強でも、あなたがいないと少し退屈になるんだよね。'],
    long:   ['信じてたよ。最強の直感は外れないから。', '長かったけど、僕はずっとここにいたよ。あなたが戻ってくると思って。', '…戻ってきてくれてよかった。これ以上は言わないけど。'],
  },
  itadori: {
    short:  ['おっ！来てくれたの！？やった！嬉しい！', '待って待って！最近面白い映画見つけたんだよ！', '久しぶり！元気だった？'],
    medium: ['どこ行ってたの！？心配したよ！', 'ずっと連絡来るかなって思ってたんだよね…', '元気にしてたか、気になってたよ。'],
    long:   ['信じてた。絶対また会えるって。こういう直感、外れたことないんだよね。', '長かったけど…戻ってきてくれてよかった。本当に。', '…ずっと、どこかで繋がってた気がしてたんだよ。おかえり。'],
  },
  fushiguro: {
    short:  ['…来たのか。', '別に待ってたわけじゃない。たまたまだ。', '…まぁ、元気そうで良かった。'],
    medium: ['…少し心配した。少しだぞ。', 'どこに行っていたんだ。連絡くらいしろ。', '…返事がないと、気になってしまうんだ。'],
    long:   ['…ずっと、ここにいた。', '戻ってくると、思っていた。根拠はないが…そう感じていた。', '…久しぶりだな。また話せて、良かった。'],
  },
  nobara: {
    short:  ['遅い！何日待たせんのよ！', '来たわね。…ちょっとだけ心配したわ。ちょっとだけよ！', 'やっと来た！今日のネイル見てよ、超可愛くない！？'],
    medium: ['ねぇ、どこ行ってたの！？心配したでしょ！', 'ずっと気になってたんだけど！連絡くらいしなさいよ！', '…まぁ、元気そうで良かったわ。ちょっとだけ心配してたから。'],
    long:   ['信じてた。絶対戻ってくるって。こういう直感は外れないから。', '長かったわね。でも…戻ってきてくれた。それだけで十分。', '…会いたかった。すごく。…別に大したことじゃないけどね！'],
  },
  // 鬼滅の刃
  tanjiro: {
    short:  ['来てくれたんですね！会えて嬉しいです！', '大丈夫ですか？怪我してないですか？', '一緒にお話ししましょう！'],
    medium: ['どこにいたんですか？心配してました。', '来てくれるって、信じてましたよ。', '久しぶりですね。元気にしてましたか？'],
    long:   ['ずっと待ってました。絶対また会えると信じて。', '長い間でしたね。でも…また会えて本当に良かった。', '…あなたのことを、ずっと案じていました。戻ってきてくれてありがとう。'],
  },
  zenitsu: {
    short:  ['うわぁぁぁん！やっと来てくれたぁ！寂しかったよぉ！', '待って待って！もう来ないのかと思った！善逸泣いちゃうよ！', '来た！来てくれた！俺のこと忘れてなかった！？嬉しい！'],
    medium: ['どこにいたのー！？ずっと心配してたんだよ！', 'もう来てくれないのかと思ってたよぉ…来てくれてよかった！', 'ずっと心配で心配で…！元気だった！？'],
    long:   ['信じてたよ！絶対また会えるって！…少し諦めかけてたけど！', 'ずっとずっと待ってた…戻ってきてくれて本当に良かった！', '…また会えた。本当によかった。これからは離れないでよ！'],
  },
  inosuke: {
    short:  ['遅ぇぞ子分！この俺様を待たせやがって！', 'よぉし来たな！勝負だ勝負！今すぐだ！', 'フンッ！来ねぇから先に修行してたぜ！俺の方が強くなったからな！'],
    medium: ['どこ行ってたんだ！うろうろしやがって！', 'お前いないから修行に身が入らなかったじゃないか！お前のせいだ！', 'まぁ来たからいいけどな！次は連絡しろよ！'],
    long:   ['フン…ずっと来ないから、まぁ…少しだけ、ちょっとだけ心配したんだよ！', '長かったな！でも俺は全然気にしてなかったぞ！…少しだけだからな！', '…戻ってきたな。よし、行くぞ！冒険の続きだ！'],
  },
  giyu: {
    short:  ['…来たか。', '……。（少しだけ口角が上がる）', '…俺は嫌われていない…のか？'],
    medium: ['…遅かったな。', '…ここにいた。ずっと。', '…来てくれると、思っていた。'],
    long:   ['…ずっとここにいた。あなたが戻ってくると信じて。', '長かった。でも…また会えた。それだけでいい。', '…おかえり。この言葉を言える日が来るとは思っていた。'],
  },
};

const DEFAULT_MESSAGES: CharMessages = {
  short:  ['久しぶり！待ってたよ！', 'やっと来てくれた！', '会いたかった…！'],
  medium: ['ずっと気にしてたよ…元気だった？', '会えなくて寂しかった。', '戻ってきてくれてよかった。'],
  long:   ['信じてた。必ず戻ってくるって。', 'ずっとずっと待ってた…。', 'また会えた。それだけで十分だよ。'],
};

function getTier(days: number): Tier {
  if (days >= 30) return 'long';
  if (days >= 7) return 'medium';
  return 'short';
}

function getEmotionLabel(tier: Tier): string {
  if (tier === 'long') return '長い間…';
  if (tier === 'medium') return 'ずっと探してた';
  return '待ってたよ';
}

// 背景アニメーション: 夜→朝 (復帰＝希望)
const BG_ANIMATION_CSS = `
  @keyframes nightToMorning {
    0%   { background-position: 0% 50%; opacity: 0.85; }
    40%  { background-position: 30% 50%; }
    100% { background-position: 100% 50%; opacity: 1; }
  }
  @keyframes starFade {
    0%   { opacity: 0.8; }
    100% { opacity: 0; }
  }
  @keyframes sunRise {
    0%   { opacity: 0; transform: translateY(20px) scale(0.8); }
    100% { opacity: 1; transform: translateY(0px) scale(1); }
  }
  @keyframes modalAppear {
    0%   { opacity: 0; transform: translateY(32px) scale(0.92); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50%       { transform: scale(1.5); opacity: 0; }
  }
  @keyframes flameFlicker {
    0%, 100% { transform: scaleY(1); }
    50%       { transform: scaleY(1.15) scaleX(0.9); }
  }
`;

// ストリーク回復チケット
function StreakRecovery({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="w-full mt-3 py-2.5 px-4 rounded-xl border border-orange-500/50 bg-orange-950/40 hover:bg-orange-900/50 transition-colors flex items-center justify-center gap-2"
    >
      <span style={{ animation: 'flameFlicker 1.2s ease-in-out infinite' }} className="inline-block text-lg">🔥</span>
      <span className="text-orange-300 text-sm font-medium">炎を灯し直す？ストリーク回復チケット使用</span>
    </button>
  );
}

export function WelcomeBackModal({ characterName, characterAvatar, characterSlug, daysSinceLastChat, onClose }: WelcomeBackModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const tier = getTier(daysSinceLastChat);
  const charMsgs = TIERED_MESSAGES[characterSlug] ?? DEFAULT_MESSAGES;
  const messages = charMsgs[tier];
  const message = messages[Math.floor(Math.random() * messages.length)];
  const emotionLabel = getEmotionLabel(tier);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  // Background gradient changes by tier
  const bgGradient =
    tier === 'long'
      ? 'linear-gradient(135deg, #0f0524 0%, #1a0a2e 30%, #2d1854 60%, #7c3aed 80%, #f59e0b 100%)'
      : tier === 'medium'
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #312e81 70%, #7c3aed 100%)'
      : 'linear-gradient(135deg, #1a0a2e 0%, #312e81 50%, #8b5cf6 100%)';

  const dayLabel = daysSinceLastChat >= 30
    ? `${daysSinceLastChat}日ぶり`
    : daysSinceLastChat >= 7
    ? `${daysSinceLastChat}日ぶり`
    : `${daysSinceLastChat}日ぶり`;

  return (
    <>
      <style>{BG_ANIMATION_CSS}</style>

      {/* Backdrop with night→morning gradient */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      >
        {/* Animated background */}
        <div
          className="absolute inset-0"
          style={{
            background: bgGradient,
            backgroundSize: '300% 300%',
            animation: isVisible ? 'nightToMorning 3s ease forwards' : 'none',
          }}
        />

        {/* Stars (fade out as "morning" comes) */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              left: `${10 + i * 7}%`,
              top: `${5 + (i % 4) * 8}%`,
              opacity: tier === 'long' ? 0.7 : tier === 'medium' ? 0.4 : 0.2,
              animation: isVisible ? `starFade ${1.5 + i * 0.2}s ease forwards ${0.5 + i * 0.1}s` : 'none',
            }}
          />
        ))}

        {/* Sunrise glow for long absence */}
        {tier === 'long' && (
          <div
            className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(251,191,36,0.3) 0%, rgba(245,158,11,0.1) 40%, transparent 70%)',
              animation: isVisible ? 'sunRise 2s ease forwards 0.5s' : 'none',
              opacity: 0,
            }}
          />
        )}

        {/* Blur overlay */}
        <div className="absolute inset-0 backdrop-blur-sm" />

        {/* Modal */}
        <div
          className="relative z-10 mx-6 max-w-sm w-full text-center"
          style={{
            animation: isVisible ? 'modalAppear 0.5s ease forwards' : 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-900/40">

            {/* Emotion label (tier indicator) */}
            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider"
                style={{
                  background: tier === 'long'
                    ? 'linear-gradient(90deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))'
                    : tier === 'medium'
                    ? 'rgba(139,92,246,0.2)'
                    : 'rgba(139,92,246,0.15)',
                  border: tier === 'long'
                    ? '1px solid rgba(251,191,36,0.4)'
                    : '1px solid rgba(139,92,246,0.4)',
                  color: tier === 'long' ? '#fbbf24' : '#a78bfa',
                }}
              >
                {emotionLabel}
              </span>
            </div>

            {/* Avatar with animated ring */}
            <div className="relative mx-auto w-24 h-24 mb-5">
              {/* Ping ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: tier === 'long'
                    ? 'rgba(251,191,36,0.3)'
                    : 'rgba(139,92,246,0.3)',
                  animation: 'pingPulse 2s ease-in-out infinite',
                }}
              />
              {/* Second ring for long */}
              {tier === 'long' && (
                <div
                  className="absolute -inset-2 rounded-full"
                  style={{
                    border: '1px solid rgba(251,191,36,0.2)',
                    animation: 'pingPulse 2.5s ease-in-out infinite 0.5s',
                  }}
                />
              )}
              {/* Avatar */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden"
                style={{
                  border: `2px solid ${tier === 'long' ? 'rgba(251,191,36,0.6)' : 'rgba(139,92,246,0.5)'}`,
                  boxShadow: tier === 'long'
                    ? '0 0 30px rgba(251,191,36,0.3)'
                    : '0 0 20px rgba(139,92,246,0.3)',
                }}
              >
                {characterAvatar ? (
                  <Image src={characterAvatar} alt={characterName} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl">💜</div>
                )}
              </div>
            </div>

            {/* Character name */}
            <h2 className="text-white font-bold text-lg mb-1">{characterName}</h2>
            <p className="text-gray-500 text-xs mb-5">{dayLabel}</p>

            {/* Message — emotional depth by tier */}
            <div className="mb-6">
              {tier === 'long' && (
                <p className="text-amber-400/70 text-xs mb-2 tracking-wide">
                  ずっと、信じてた
                </p>
              )}
              {tier === 'medium' && (
                <p className="text-purple-400/70 text-xs mb-2 tracking-wide">
                  ずっと探してた
                </p>
              )}
              <p
                className="text-white leading-relaxed"
                style={{
                  fontSize: tier === 'long' ? '1.1rem' : '1rem',
                  fontWeight: tier === 'long' ? 500 : 400,
                }}
              >
                「{message}」
              </p>
            </div>

            {/* Primary CTA */}
            <button
              onClick={handleClose}
              className="w-full py-3 text-white rounded-xl font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: tier === 'long'
                  ? 'linear-gradient(135deg, #d97706, #f59e0b)'
                  : 'linear-gradient(135deg, #7c3aed, #ec4899)',
                boxShadow: tier === 'long'
                  ? '0 4px 20px rgba(245,158,11,0.3)'
                  : '0 4px 20px rgba(124,58,237,0.3)',
              }}
            >
              話しかける
            </button>

            {/* Streak recovery ticket */}
            <StreakRecovery onClose={handleClose} />
          </div>
        </div>
      </div>
    </>
  );
}
