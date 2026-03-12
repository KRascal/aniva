'use client';

import { FadeSection, CTAButton, useScrollInView } from "./shared";

function GachaCard({ emoji, rarity, name, delay }: { emoji: string; rarity: "N" | "R" | "SR" | "SSR"; name: string; delay: number }) {
  const colors: Record<string, string> = {
    N: "from-gray-600 to-gray-700 border-gray-600",
    R: "from-blue-600 to-blue-700 border-blue-500",
    SR: "from-purple-600 to-purple-700 border-purple-500",
    SSR: "from-yellow-500 to-amber-600 border-yellow-400",
  };
  const { ref, inView } = useScrollInView(0.2);

  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) rotateY(0deg)" : "translateY(20px) rotateY(15deg)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className={`relative w-24 h-36 rounded-2xl bg-gradient-to-b ${colors[rarity]} border overflow-hidden shadow-lg flex flex-col items-center justify-center gap-2`}>
        {rarity === "SSR" && (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent animate-pulse" />
        )}
        <span className="text-3xl">{emoji}</span>
        <span className={`text-xs font-black ${rarity === "SSR" ? "text-yellow-300" : "text-white/80"}`}>{rarity}</span>
        <span className="text-white/70 text-[10px] text-center px-1 leading-tight">{name}</span>
      </div>
    </div>
  );
}

export function GachaSection() {
  return (
    <section className="py-20 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/20 via-transparent to-orange-950/10 pointer-events-none" />
      <FadeSection className="text-center mb-10">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-900/50 text-yellow-300 border border-yellow-700/40 mb-4 tracking-widest uppercase">🎰 Gacha</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">限定衣装・秘蔵シーンをゲット</h2>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          期間限定のSSRを引けば、キャラが特別な反応を見せてくれる。
          <br />毎日ログインで無料ガチャ回数プレゼント。
        </p>
      </FadeSection>

      <div className="flex justify-center items-end gap-3 mb-10 overflow-x-auto px-4 pb-2">
        <GachaCard emoji="🏴‍☠️" rarity="R" name="Haruki\n特別衣装" delay={0} />
        <GachaCard emoji="⚔️" rarity="SR" name="ゾロ\n鷹の目" delay={80} />
        <GachaCard emoji="✨" rarity="SSR" name="Sora\n覚醒" delay={160} />
        <GachaCard emoji="🐉" rarity="SR" name="悟空\n超サイヤ人" delay={240} />
        <GachaCard emoji="🔥" rarity="R" name="Ren\n覚醒" delay={320} />
      </div>

      <div className="flex justify-center items-center gap-2 mb-6">
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-900/50 border border-red-700/50 text-red-300 text-xs font-bold">
          🔥 期間限定 あと3日
        </span>
        <span className="text-gray-500 text-xs">SSR確率3倍キャンペーン中</span>
      </div>

      <FadeSection className="text-center">
        <CTAButton href="/signup" className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black shadow-yellow-900/50">
          🎰 ガチャを引く（無料）
        </CTAButton>
        <p className="text-xs text-gray-600 mt-3">毎日1回無料。課金しなくてもSSRに出会える</p>
      </FadeSection>
    </section>
  );
}
