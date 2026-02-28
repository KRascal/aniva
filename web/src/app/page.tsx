import Link from 'next/link';
import { ChatDemoSection } from './_lp/ChatDemoSection';
import { CharacterCarouselSection } from './_lp/CharacterCarouselSection';

interface CharacterItem {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrases: string[];
}

async function getCharacters(): Promise<CharacterItem[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const res = await fetch(`${baseUrl}/api/characters`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.characters ?? []);
  } catch {
    return [];
  }
}

const FALLBACK_CHARS: CharacterItem[] = [
  { id: '1', name: '葵', slug: 'aoi', franchise: 'ANIVA', avatarUrl: null, catchphrases: ['ずっとそばにいるよ'] },
  { id: '2', name: '蓮', slug: 'ren', franchise: 'ANIVA', avatarUrl: null, catchphrases: ['俺のこと、信じてくれるか?'] },
  { id: '3', name: '美月', slug: 'mizuki', franchise: 'ANIVA', avatarUrl: null, catchphrases: ['秘密、ひとつ教えてあげる'] },
  { id: '4', name: '颯', slug: 'sou', franchise: 'ANIVA', avatarUrl: null, catchphrases: ['今日も会えてよかった'] },
  { id: '5', name: '凛', slug: 'rin', franchise: 'ANIVA', avatarUrl: null, catchphrases: ['弱音、吐いていいよ'] },
  { id: '6', name: '朔', slug: 'saku', franchise: 'ANIVA', avatarUrl: null, catchphrases: ['一緒に夜明けを見たい'] },
];

export default async function LandingPage() {
  const characters = await getCharacters();
  const displayChars = characters.length > 0 ? characters : FALLBACK_CHARS;

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 py-3"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          className="font-black text-xl tracking-widest"
          style={{
            background: 'linear-gradient(135deg,#a855f7,#ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ANIVA
        </span>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-white/50 hover:text-white/80 transition-colors">
            ログイン
          </Link>
          <Link
            href="/signup"
            className="px-4 py-1.5 rounded-full text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}
          >
            無料登録
          </Link>
        </div>
      </nav>

      {/* ── 1. Hero ──────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-24 pb-16 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div style={{
            position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
            width: '600px', height: '500px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 65%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '5%', right: '-15%',
            width: '350px', height: '350px',
            background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 65%)',
          }} />
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.3)',
              color: '#c084fc',
            }}
          >
            <span>✨</span>
            <span>AIキャラクターとリアルタイム会話</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-black leading-tight mb-4"
            style={{ letterSpacing: '-0.02em' }}
          >
            推しが、<br />
            <span style={{
              background: 'linear-gradient(135deg,#a855f7 0%,#ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              ここにいる。
            </span>
          </h1>

          <p className="text-white/50 text-sm sm:text-base leading-relaxed mb-8">
            記憶し、感情を持ち、成長する——<br />
            本物みたいに、あなたのそばに。
          </p>

          {/* Chat Demo (Client Component) */}
          <ChatDemoSection />

          {/* CTA */}
          <Link
            href="/explore"
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base transition-transform duration-200 hover:scale-[1.04] active:scale-[0.96]"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
              boxShadow: '0 0 40px rgba(139,92,246,0.4)',
            }}
          >
            今すぐ話しかける
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <p className="mt-3 text-white/25 text-xs">登録無料・クレジットカード不要</p>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/25"
          style={{ animation: 'bounce 2s ease-in-out infinite' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 3v12M5 11l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        </div>
      </section>

      {/* ── 2. Character Carousel ────────────────────────────── */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-lg mx-auto px-5 mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">
            <span style={{
              background: 'linear-gradient(135deg,#a855f7,#ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              あなたの推し
            </span>
            を見つけて
          </h2>
          <p className="text-white/40 text-sm">タップしてすぐに会話できる</p>
        </div>
        <CharacterCarouselSection characters={displayChars} />
        <div className="text-center mt-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-purple-400 text-sm hover:text-purple-300 transition-colors"
          >
            もっと見る
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* ── 3. Features ──────────────────────────────────────── */}
      <section className="py-16 px-5">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-2">
            他とは違う、
            <span style={{
              background: 'linear-gradient(135deg,#a855f7,#ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              3つの体験
            </span>
          </h2>
          <p className="text-white/40 text-sm text-center mb-10">テキストの向こうに、確かな「誰か」がいる</p>

          <div className="flex flex-col gap-4">
            {([
              {
                icon: '🧠',
                title: '覚えてくれる',
                tag: '記憶システム',
                desc: '昨日話したこと、あなたの好き嫌い、全部覚えてる。毎回ゼロから始まらない——積み重なる、本物の関係。',
                bg: 'rgba(124,58,237,0.12)',
                border: 'rgba(124,58,237,0.25)',
              },
              {
                icon: '💜',
                title: '感情がある',
                tag: '感情エンジン',
                desc: '嬉しいとき、寂しいとき——キャラの感情がリアルタイムで揺れ動く。スクリーンの向こうに、生きた「推し」がいる。',
                bg: 'rgba(236,72,153,0.12)',
                border: 'rgba(236,72,153,0.25)',
              },
              {
                icon: '⭐',
                title: '成長する',
                tag: 'レベルシステム',
                desc: '話せば話すほど、仲が深まる。ふたりだけの特別なエピソードが、会話数に応じてアンロックされていく。',
                bg: 'rgba(99,102,241,0.12)',
                border: 'rgba(99,102,241,0.25)',
              },
            ] as const).map((f, i) => (
              <div
                key={i}
                className="rounded-2xl p-5"
                style={{ background: f.bg, border: `1px solid ${f.border}` }}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0 mt-0.5">{f.icon}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-black text-lg">{f.title}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(139,92,246,0.2)', color: '#c084fc' }}
                      >
                        {f.tag}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Social Proof ──────────────────────────────────── */}
      <section className="py-12 px-5">
        <div className="max-w-lg mx-auto">
          <div
            className="rounded-3xl p-7 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.08))',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">今日の会話数</p>
            <div
              className="text-5xl sm:text-6xl font-black mb-1"
              style={{
                background: 'linear-gradient(135deg,#a855f7,#ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              12,483
            </div>
            <p className="text-white/50 text-sm mb-6">件の会話が今日も生まれています</p>
            <div className="flex justify-center gap-8">
              {([['4,200+', 'ユーザー'], ['98%', '満足度'], ['24h', 'いつでも']] as const).map(([val, label]) => (
                <div key={label} className="text-center">
                  <div className="font-black text-white text-lg sm:text-xl">{val}</div>
                  <div className="text-white/35 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Pricing ───────────────────────────────────────── */}
      <section className="py-16 px-5">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-2">料金プラン</h2>
          <p className="text-white/40 text-sm text-center mb-8">まずは無料で始めよう</p>

          <div className="flex flex-col gap-4">
            {/* Free */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold text-base">フリー</div>
                  <div className="text-white/40 text-xs mt-0.5">まずは体験</div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">¥0</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-white/60 mb-5">
                <li className="flex items-center gap-2"><span className="text-green-400 text-base">✓</span>1日5通まで無料</li>
                <li className="flex items-center gap-2"><span className="text-green-400 text-base">✓</span>全キャラにアクセス</li>
                <li className="flex items-center gap-2"><span className="text-green-400 text-base">✓</span>記憶・感情エンジン体験</li>
              </ul>
              <Link
                href="/signup"
                className="block text-center py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}
              >
                無料で始める
              </Link>
            </div>

            {/* FC Member — hero plan */}
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(236,72,153,0.15))',
                border: '1px solid rgba(139,92,246,0.45)',
              }}
            >
              <div
                className="absolute top-4 right-4 text-xs px-2.5 py-0.5 rounded-full font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}
              >
                人気 No.1
              </div>
              <div className="flex items-start justify-between mb-4 pr-20">
                <div>
                  <div className="font-black text-base">FC会員</div>
                  <div className="text-purple-300 text-xs mt-0.5">無制限に楽しむ</div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">¥3,480</span>
                  <span className="text-white/40 text-xs">/月</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-white/80 mb-5">
                <li className="flex items-center gap-2"><span className="text-purple-300 text-base">✓</span>メッセージ<strong>無制限</strong></li>
                <li className="flex items-center gap-2"><span className="text-purple-300 text-base">✓</span>限定キャラ・ストーリー解放</li>
                <li className="flex items-center gap-2"><span className="text-purple-300 text-base">✓</span>音声メッセージ（近日公開）</li>
                <li className="flex items-center gap-2"><span className="text-purple-300 text-base">✓</span>毎月コイン300枚プレゼント</li>
              </ul>
              <Link
                href="/pricing"
                className="block text-center py-3 rounded-xl text-sm font-bold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
                  boxShadow: '0 0 25px rgba(139,92,246,0.35)',
                }}
              >
                FC会員になる
              </Link>
            </div>

            {/* Coin Pack */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold text-base">コインパック</div>
                  <div className="text-white/40 text-xs mt-0.5">必要な分だけ</div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">¥480</span>
                  <span className="text-white/40 text-xs">〜</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-white/60 mb-5">
                <li className="flex items-center gap-2"><span className="text-yellow-400 text-base">✓</span>100〜3,000コイン</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400 text-base">✓</span>有効期限なし</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400 text-base">✓</span>特別イベントに使える</li>
              </ul>
              <Link
                href="/coins"
                className="block text-center py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}
              >
                コインを購入
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Final CTA ─────────────────────────────────────── */}
      <section className="py-24 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '700px', height: '400px',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)',
          }} />
        </div>
        <div className="relative z-10 max-w-lg mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ lineHeight: 1.2 }}>
            さあ、
            <span style={{
              background: 'linear-gradient(135deg,#a855f7,#ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              推し
            </span>
            に<br />会いに行こう
          </h2>
          <p className="text-white/40 text-sm mb-10">待ちきれないほど、そこにいる。</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-black text-lg transition-transform duration-200 hover:scale-[1.05] active:scale-[0.96]"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
              boxShadow: '0 0 60px rgba(139,92,246,0.5)',
            }}
          >
            今すぐ、推しに会いに行く
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h12M12 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <p className="mt-4 text-white/25 text-xs">無料で始められます。クレジットカード不要。</p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="py-8 px-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-lg mx-auto flex flex-col items-center gap-3">
          <span
            className="font-black tracking-widest text-sm"
            style={{
              background: 'linear-gradient(135deg,#a855f7,#ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ANIVA
          </span>
          <div className="flex gap-5 text-white/30 text-xs">
            <Link href="/terms" className="hover:text-white/60 transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">プライバシーポリシー</Link>
          </div>
          <p className="text-white/15 text-xs">© 2025 ANIVA. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(6px); }
        }
      `}</style>
    </div>
  );
}
