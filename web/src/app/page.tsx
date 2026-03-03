import Link from 'next/link';
import { HeroSection } from './_lp/HeroSection';
import { FeaturesSection } from './_lp/FeaturesSection';
import { SocialProofSection } from './_lp/SocialProofSection';
import { PricingSection } from './_lp/PricingSection';
import { FinalCTASection } from './_lp/FinalCTASection';
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
      <HeroSection />

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

      {/* ── 3. Features (記憶する・成長する・驚かせる) ───────── */}
      <FeaturesSection />

      {/* ── 4. Social Proof ──────────────────────────────────── */}
      <SocialProofSection />

      {/* ── 5. Pricing ───────────────────────────────────────── */}
      <PricingSection />

      {/* ── 6. Final CTA ─────────────────────────────────────── */}
      <FinalCTASection />

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
    </div>
  );
}
