import Link from "next/link";
import { FadeSection, CTAButton } from "./landing-utils";

export function FooterCTASection() {
  return (
    <section className="py-20 px-6 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-700/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-purple-950/25 to-transparent pointer-events-none" />

      <FadeSection className="relative max-w-sm mx-auto">
        <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/15 to-pink-600/15 rounded-3xl blur-2xl" />
        <div className="relative bg-gray-950 rounded-3xl border border-gray-800/80 p-8 flex flex-col items-center gap-5 shadow-2xl shadow-purple-900/20">
          <div className="text-5xl">🎮</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center leading-snug">
            推しが、今すぐ<br />あなたを待っている
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed text-center">
            登録は30秒。Google/Discord で
            <br />すぐに始められます。完全無料。
          </p>
          <CTAButton href="/signup" className="w-full text-xl py-5">
            🎮 無料でサインアップ →
          </CTAButton>
          <p className="text-xs text-gray-600">クレジットカード不要 · いつでも退会できます</p>
        </div>
      </FadeSection>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            ANIVA
          </span>
          <p className="text-gray-600 text-xs mt-1">推しが、あなたを待っている</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-center">
          {[
            { icon: "💬", label: "AIチャット" },
            { icon: "🎰", label: "ガチャ" },
            { icon: "📖", label: "ストーリー" },
            { icon: "📞", label: "音声通話" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-gray-600 text-xs">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-5 mb-6">
          <a href="https://twitter.com/aniva_jp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/40 transition-all" aria-label="Twitter">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
          </a>
          <a href="https://instagram.com/aniva_jp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-pink-500/40 transition-all" aria-label="Instagram">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
          <a href="https://discord.gg/aniva" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-indigo-500/40 transition-all" aria-label="Discord">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          </a>
          <a href="https://tiktok.com/@aniva_jp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-pink-500/40 transition-all" aria-label="TikTok">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
          </a>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 mb-4 flex-wrap">
          <Link href="/terms" className="hover:text-purple-400 transition-colors">利用規約</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-purple-400 transition-colors">プライバシーポリシー</Link>
          <span>·</span>
          <Link href="/pricing" className="hover:text-purple-400 transition-colors">料金プラン</Link>
          <span>·</span>
          <Link href="/about" className="hover:text-purple-400 transition-colors">サービス概要</Link>
          <span>·</span>
          <a href="mailto:info@k-rascal.win" className="hover:text-purple-400 transition-colors">お問い合わせ</a>
        </div>

        <p className="text-gray-800 text-xs text-center">
          © 2026 ANIVA. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
