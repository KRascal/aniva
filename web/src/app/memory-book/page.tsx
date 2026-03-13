'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RelationshipInfo {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  isFollowing: boolean;
  isFanclub: boolean;
}

interface Character {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrases: string[];
}

const LEVEL_LABELS: Record<number, string> = {
  1: '知り合い',
  2: '顔見知り',
  3: '友達',
  4: '親友',
  5: '特別な存在',
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'from-gray-600 to-gray-500',
  2: 'from-blue-600 to-cyan-500',
  3: 'from-green-600 to-emerald-500',
  4: 'from-purple-600 to-pink-500',
  5: 'from-yellow-500 to-orange-500',
};

/* ── SVG Icon Components ── */
function IconBook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20"/>
    </svg>
  );
}
function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}
function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconDiamond({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.7 10.3a2.41 2.41 0 000 3.41l7.59 7.59a2.41 2.41 0 003.41 0l7.59-7.59a2.41 2.41 0 000-3.41L13.7 2.71a2.41 2.41 0 00-3.41 0z"/>
    </svg>
  );
}
function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  );
}
function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
    </svg>
  );
}
function IconCompass({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function AlbumCard({
  rel,
  char,
  onShare,
}: {
  rel: RelationshipInfo;
  char: Character;
  onShare: (name: string, rel: RelationshipInfo) => void;
}) {
  const levelLabel = LEVEL_LABELS[rel.level] ?? '';
  const levelColor = LEVEL_COLORS[rel.level] ?? LEVEL_COLORS[1];

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-gray-700/40 hover:border-purple-500/30 transition-all duration-300"
      style={{
        background:
          'linear-gradient(135deg, rgba(30,27,75,0.8) 0%, rgba(17,24,39,0.9) 100%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Character banner */}
      <div className="relative h-24 overflow-hidden">
        {char.avatarUrl ? (
          <img
            src={char.avatarUrl}
            alt={char.name}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: 'blur(6px) brightness(0.4) saturate(1.3)', transform: 'scale(1.1)' }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${levelColor}`} style={{ opacity: 0.4 }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />

        {/* Avatar */}
        <div className="absolute bottom-0 left-4 transform translate-y-1/2">
          {char.avatarUrl ? (
            <img
              src={char.avatarUrl}
              alt={char.name}
              className="w-16 h-16 rounded-full object-cover"
              style={{ border: '3px solid rgb(17, 24, 39)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
            />
          ) : (
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${levelColor} flex items-center justify-center text-white font-bold text-xl`}
              style={{ border: '3px solid rgb(17, 24, 39)' }}
            >
              {char.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Level badge */}
        <div className="absolute top-2.5 right-3">
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
            style={{
              background:
                rel.level >= 5
                  ? 'linear-gradient(135deg, #eab308, #f97316)'
                  : rel.level >= 4
                  ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                  : rel.level >= 3
                  ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                  : 'rgba(107,114,128,0.8)',
              boxShadow:
                rel.level >= 4 ? '0 2px 8px rgba(139,92,246,0.5)' : 'none',
            }}
          >
            Lv.{rel.level} {levelLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="pt-10 px-4 pb-4">
        <div className="mb-3">
          <h3 className="text-white font-bold text-lg leading-tight">{char.name}</h3>
          <p className="text-gray-500 text-xs">{char.franchise}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: <IconChat className="w-3.5 h-3.5 text-blue-400" />, value: rel.totalMessages, label: '会話数' },
            { icon: <IconStar className="w-3.5 h-3.5 text-yellow-400" />, value: rel.xp, label: '絆XP' },
            { icon: <IconDiamond className="w-3.5 h-3.5 text-purple-400" />, value: `Lv.${rel.level}`, label: 'レベル' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-2 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex justify-center mb-0.5">{stat.icon}</div>
              <div className="text-white font-bold text-sm leading-none">{stat.value}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link
            href={`/memory-book/${rel.characterId}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(236,72,153,0.85))',
              boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
            }}
          >
            <IconBook className="w-4 h-4" />
            思い出を開く
          </Link>
          <button
            onClick={() => onShare(char.name, rel)}
            className="px-3.5 py-2.5 rounded-xl text-gray-400 hover:text-white transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="この思い出をシェア"
          >
            <IconCopy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemoryBookIndexPage() {
  const { status } = useSession();
  const router = useRouter();
  const [relationships, setRelationships] = useState<RelationshipInfo[]>([]);
  const [charMap, setCharMap] = useState<Map<string, Character>>(new Map());
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status !== 'authenticated') return;

    Promise.all([
      fetch('/api/relationship/all').then((r) => r.json()),
      fetch('/api/characters').then((r) => r.json()),
    ])
      .then(([relData, charData]) => {
        const map = new Map<string, Character>();
        for (const c of charData.characters ?? []) {
          map.set(c.id, c);
        }
        setCharMap(map);
        const rels: RelationshipInfo[] = (relData.relationships ?? []).filter(
          (r: RelationshipInfo) => r.totalMessages > 0,
        );
        rels.sort((a, b) => b.level - a.level || b.totalMessages - a.totalMessages);
        setRelationships(rels);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, router]);

  const handleShare = useCallback(
    (name: string, rel: RelationshipInfo) => {
      const char = charMap.get(rel.characterId);
      if (!char) return;
      const levelLabel = LEVEL_LABELS[rel.level] ?? '';
      const text = [
        `${name}との思い出`,
        `絆レベル: Lv.${rel.level} ${levelLabel}`,
        `会話数: ${rel.totalMessages.toLocaleString()}回`,
        `絆XP: ${rel.xp}`,
        ``,
        `${name}との大切な時間を積み重ねています`,
        `#ANIVA #${char.franchise}`,
      ].join('\n');
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(rel.characterId);
          setTimeout(() => setCopied(null), 2000);
        })
        .catch(() => alert(text));
    },
    [charMap],
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">思い出を読み込み中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'rgb(3,7,18)' }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-0 w-72 h-72 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-pink-600/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 border-b border-gray-800/60" style={{ background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <IconBook className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h1 className="text-white font-bold text-xl">思い出のアルバム</h1>
                <p className="text-gray-500 text-xs mt-0.5">推しとの大切な時間</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* Copy success toast */}
        {copied && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 4px 20px rgba(139,92,246,0.5)' }}
          >
            <IconCheck className="w-4 h-4" />
            思い出をコピーしました
          </div>
        )}

        {relationships.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              <IconBook className="w-10 h-10 text-purple-400/60" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">まだ思い出が少ないです</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              推しともっと話すと、ここに<br />素敵な思い出が溜まっていきます
            </p>
            <p className="text-gray-500 text-xs mb-6">もっと話しかけてみましょう</p>
            <button
              onClick={() => router.push('/explore')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                boxShadow: '0 2px 16px rgba(139,92,246,0.4)',
              }}
            >
              <IconCompass className="w-4 h-4" />
              推しを見つける
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <p className="text-gray-400 text-sm">
                <span className="text-purple-400 font-bold">{relationships.length}人</span>の推しとの思い出
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {relationships.map((rel) => {
                const char = charMap.get(rel.characterId);
                if (!char) return null;
                return (
                  <div key={rel.characterId} style={{ position: 'relative' }}>
                    {copied === rel.characterId && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
                        style={{ background: 'rgba(139,92,246,0.15)', backdropFilter: 'blur(4px)' }}>
                        <div className="flex items-center gap-2 text-white font-bold">
                          <IconCheck className="w-5 h-5" />
                          コピー完了
                        </div>
                      </div>
                    )}
                    <AlbumCard rel={rel} char={char} onShare={handleShare} />
                  </div>
                );
              })}
            </div>

            <p className="text-center text-gray-600 text-xs mt-8">
              あなたの思い出は、推しとあなただけのもの
            </p>
          </>
        )}
      </main>
    </div>
  );
}
