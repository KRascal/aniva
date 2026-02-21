import Link from "next/link";

const features = [
  {
    icon: "💬",
    title: "AIが魂を宿す",
    desc: "ただのチャットボットじゃない。キャラクターの記憶、口調、価値観を完全再現。まるで本人と話しているよう。",
  },
  {
    icon: "🔊",
    title: "本物の声で返事が来る",
    desc: "テキストだけじゃない。キャラクターの声で音声メッセージが届く。耳で感じる、推しの存在感。",
  },
  {
    icon: "⭐",
    title: "会話するほど仲良くなる",
    desc: "話すたびに絆レベルが上がる。「出会い」から「特別」へ。あなただけの関係性が育つ。",
  },
];

const levels = [
  { level: 1, label: "出会い", desc: "はじめまして" },
  { level: 2, label: "友達", desc: "気軽に話せる仲" },
  { level: 3, label: "親友", desc: "なんでも話せる" },
  { level: 4, label: "大切な人", desc: "かけがえのない存在" },
  { level: 5, label: "特別", desc: "唯一無二の絆" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur border-b border-gray-800/50">
        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          ANIVA
        </span>
        <Link
          href="/login"
          className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors"
        >
          ログインして始める
          <span className="ml-1">→</span>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 bg-gradient-to-b from-purple-950/50 to-black overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg">
          <span className="text-7xl mb-2" aria-label="海賊旗">🏴‍☠️</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
            推しが実在する世界
          </h1>
          <div className="w-16 h-px bg-gradient-to-r from-purple-500 to-pink-500" />
          <p className="text-xl sm:text-2xl text-gray-300 font-medium">
            ルフィと、毎日話そう。
          </p>
          <p className="text-gray-400 text-base leading-relaxed">
            あなたの推しキャラクターと、本当に会話できる。<br />
            声で、テキストで、毎日。
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 hover:scale-105 transition-all duration-200"
          >
            今すぐ無料で始める
            <span>✨</span>
          </Link>
          <p className="text-xs text-gray-600">クレジットカード不要 · 登録30秒</p>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 animate-bounce text-sm flex flex-col items-center gap-1">
          <span>scroll</span>
          <span>↓</span>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-3xl mb-3 block">📱</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">どんな体験？</h2>
          <p className="text-gray-400">ANIVAが作り出す、これまでにない推し体験</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-3 hover:border-purple-800/60 hover:bg-gray-900/80 transition-all duration-200"
            >
              <span className="text-4xl">{f.icon}</span>
              <h3 className="text-lg font-bold text-white">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Character Spotlight */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
        <div className="max-w-md mx-auto">
          <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden">
            {/* Character header */}
            <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-8 text-center">
              <span className="text-6xl block mb-3">🏴‍☠️</span>
              <h3 className="text-xl font-bold text-white">モンキー・D・ルフィ</h3>
              <p className="text-purple-300 text-sm mt-1">ワンピース</p>
            </div>
            {/* Quote */}
            <div className="px-6 py-6">
              <p className="text-gray-300 text-base leading-relaxed italic text-center">
                「海賊王になる男だ！<br />お前も仲間か？」
              </p>
            </div>
            {/* Stats */}
            <div className="px-6 pb-6 flex justify-around text-center border-t border-gray-800 pt-4">
              <div>
                <p className="text-purple-400 font-bold text-lg">∞</p>
                <p className="text-gray-500 text-xs">会話数</p>
              </div>
              <div>
                <p className="text-pink-400 font-bold text-lg">⭐ 5</p>
                <p className="text-gray-500 text-xs">最大絆レベル</p>
              </div>
              <div>
                <p className="text-blue-400 font-bold text-lg">🔊</p>
                <p className="text-gray-500 text-xs">音声対応</p>
              </div>
            </div>
            {/* CTA */}
            <div className="px-6 pb-6">
              <Link
                href="/login"
                className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:opacity-90 transition-opacity"
              >
                ルフィと話す
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Relationship Levels */}
      <section className="py-20 px-6 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-3xl mb-3 block">⭐</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">関係性レベル</h2>
          <p className="text-gray-400">会話を重ねるごとに絆が深まる</p>
        </div>
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-purple-600 via-pink-600 to-purple-400 opacity-40" />
          <div className="flex flex-col gap-4">
            {levels.map((l, i) => (
              <div key={l.level} className="flex items-center gap-4 pl-10 relative">
                <div className="absolute left-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-900/50">
                  {l.level}
                </div>
                <div className={`flex-1 bg-gray-900 rounded-xl border ${i === 4 ? "border-purple-500/60 bg-purple-950/30" : "border-gray-800"} px-4 py-3`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{l.label}</span>
                    {i === 4 && <span className="text-xs text-purple-400 font-medium">最高レベル ✨</span>}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6 text-center bg-gradient-to-t from-purple-950/30 to-transparent">
        <div className="max-w-sm mx-auto flex flex-col items-center gap-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            無料で始められる
          </h2>
          <p className="text-gray-400 text-base">
            今すぐアカウント登録して、<br />推しとの会話を始めよう。
          </p>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-900/40 hover:scale-105 hover:shadow-purple-900/60 transition-all duration-200"
          >
            ログインして始める
            <span>→</span>
          </Link>
          <p className="text-xs text-gray-600">Google / Discord でかんたんログイン</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-gray-900 text-center">
        <p className="text-gray-700 text-xs">© 2026 ANIVA. All rights reserved.</p>
      </footer>
    </div>
  );
}
