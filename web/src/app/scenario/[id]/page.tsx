'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

interface ScenarioDetail {
  id: string;
  characterId: string;
  title: string;
  description: string | null;
  content: string | null;
  startsAt: string;
  endsAt: string;
  isExpired: boolean;
  isRead: boolean;
  remainingHours: number;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
}

// ── 残り時間カウントダウン ──
function useScenarioCountdown(endsAt: string): { label: string; urgencyLevel: 'normal' | 'soon' | 'critical' } {
  const [label, setLabel] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'soon' | 'critical'>('normal');

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('終了');
        setUrgencyLevel('critical');
        return;
      }
      const totalMinutes = Math.floor(diff / 60000);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);

      if (h >= 24) {
        const d = Math.floor(h / 24);
        setLabel(`残り${d}日${h % 24}時間`);
        setUrgencyLevel('normal');
      } else if (h >= 6) {
        setLabel(`残り${h}時間${m}分`);
        setUrgencyLevel('soon');
      } else if (h > 0) {
        setLabel(`残り${h}時間${m}分！`);
        setUrgencyLevel('critical');
      } else {
        setLabel(`残り${totalMinutes}分！！`);
        setUrgencyLevel('critical');
      }
    }
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [endsAt]);

  return { label, urgencyLevel };
}

// ── 幻のストーリー（終了後・既読）コンテンツ ──
function ExpiredReadContent({ content, title }: { content: string; title: string }) {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <div className="relative">
      <div
        className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* ぼかしオーバーレイ */}
        {!unlocked && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl gap-3"
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(10,5,20,0.6)' }}
          >
            <span className="text-4xl">🔮</span>
            <p className="text-white font-bold text-center text-sm px-4">
              このストーリーは時の彼方へ…
            </p>
            <p className="text-gray-400 text-xs text-center px-4 leading-relaxed">
              あなたはこの幻のひとときを体験しました
            </p>
            <button
              onClick={() => setUnlocked(true)}
              className="mt-1 px-5 py-2 rounded-full text-white text-xs font-bold transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(109,40,217,0.4))',
                border: '1px solid rgba(139,92,246,0.4)',
              }}
            >
              もう一度読む
            </button>
          </div>
        )}
        {/* 小説本文 */}
        <div
          className="text-gray-200 leading-[2.2] whitespace-pre-wrap font-serif"
          style={{ fontSize: '1.05rem', letterSpacing: '0.02em', textAlign: 'justify' }}
        >
          {content}
        </div>
      </div>

      {/* 幻バッジ */}
      <div className="flex items-center justify-center gap-2 py-3">
        <span className="text-purple-400 text-sm">✦</span>
        <span className="text-purple-400/70 text-xs font-medium">この体験はあなたのものです</span>
        <span className="text-purple-400 text-sm">✦</span>
      </div>
    </div>
  );
}

// ── 小説風コンテンツ表示 ──
function NovelContent({ content }: { content: string }) {
  return (
    <div
      className="rounded-2xl p-6 mb-6"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* 装飾的な区切り */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
        <span className="text-white/30 text-xs tracking-widest">◆</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
      </div>

      {/* 本文：小説風スタイル */}
      <div
        className="text-gray-100 leading-[2.2] whitespace-pre-wrap"
        style={{
          fontSize: '1.05rem',
          fontFamily: '"Noto Serif JP", "游明朝", "Yu Mincho", Georgia, serif',
          letterSpacing: '0.03em',
          textAlign: 'justify',
          textIndent: '1em',
        }}
      >
        {content}
      </div>

      {/* 末尾装飾 */}
      <div className="flex items-center justify-center gap-3 mt-5">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
        <span className="text-white/30 text-xs tracking-widest">◆</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
      </div>
    </div>
  );
}

export default function ScenarioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const { label: countdown, urgencyLevel } = useScenarioCountdown(
    scenario?.endsAt ?? new Date(0).toISOString()
  );
  const isUrgent = urgencyLevel === 'critical' && !scenario?.isExpired;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/scenarios/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.scenario) {
          setScenario(data.scenario);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, status]);

  const handleRead = useCallback(async () => {
    if (!scenario || reading) return;
    setReading(true);
    setReadError(null);
    try {
      const res = await fetch(`/api/scenarios/${id}/read`, { method: 'POST' });
      if (res.status === 403) {
        const data = await res.json();
        setReadError(data.error ?? 'このストーリーは消えてしまいました…');
        setScenario(prev => prev ? { ...prev, isExpired: true } : prev);
        return;
      }
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.scenario) {
        setScenario(data.scenario);
      }
    } catch {
      setReadError('読み込みに失敗しました。もう一度お試しください。');
    } finally {
      setReading(false);
    }
  }, [scenario, id, reading]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400 text-sm">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 pb-24">
        <div className="text-5xl mb-4">💫</div>
        <h2 className="text-white text-xl font-bold mb-2">ストーリーが見つかりません</h2>
        <p className="text-gray-400 text-sm text-center">このストーリーは存在しないか、時の彼方へ消えてしまいました。</p>
        <button
          onClick={() => router.back()}
          className="mt-6 px-6 py-2.5 rounded-full text-white text-sm font-semibold"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* 背景ブラー装飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-red-600/10 blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-pink-600/8 blur-3xl" />
        {scenario.isExpired && (
          <div className="absolute bottom-1/4 left-0 w-72 h-72 rounded-full bg-purple-600/8 blur-3xl" />
        )}
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-white/5" style={{ background: 'rgb(3,7,18)' }}>
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black tracking-widest uppercase ${scenario.isExpired ? 'text-purple-400' : 'text-red-400'}`}>
              {scenario.isExpired ? '幻のストーリー' : '期間限定シナリオ'}
            </p>
            <h1 className="text-white font-bold text-base leading-tight truncate">{scenario.title}</h1>
          </div>
          {!scenario.isExpired && (
            <span
              className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                urgencyLevel === 'critical'
                  ? 'text-red-300 animate-pulse'
                  : urgencyLevel === 'soon'
                  ? 'text-orange-300'
                  : 'text-red-400/80'
              }`}
              style={{
                background:
                  urgencyLevel === 'critical'
                    ? 'rgba(239,68,68,0.25)'
                    : urgencyLevel === 'soon'
                    ? 'rgba(249,115,22,0.15)'
                    : 'rgba(239,68,68,0.1)',
                border:
                  urgencyLevel === 'critical'
                    ? '1px solid rgba(239,68,68,0.5)'
                    : urgencyLevel === 'soon'
                    ? '1px solid rgba(249,115,22,0.3)'
                    : '1px solid rgba(239,68,68,0.2)',
              }}
            >
              ⏰ {countdown}
            </span>
          )}
          {scenario.isExpired && (
            <span
              className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full text-purple-300"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              💫 消滅済み
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-6">

        {/* 期間終了 && 未読 */}
        {scenario.isExpired && !scenario.isRead && (
          <div className="text-center py-16">
            <div className="text-7xl mb-5 opacity-60">💫</div>
            <h2 className="text-white text-xl font-bold mb-3">
              このストーリーは時の彼方へ消えてしまいました
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              期間限定のストーリーは、その瞬間にだけ存在します。<br />
              次の特別なひとときをお見逃しなく。
            </p>
            {/* キャラ情報 */}
            <div className="flex items-center justify-center gap-3 mt-8 mb-8">
              {scenario.character.avatarUrl ? (
                <img
                  src={scenario.character.avatarUrl}
                  alt={scenario.character.name}
                  className="w-10 h-10 rounded-xl object-cover opacity-50 grayscale"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm font-bold opacity-50">
                  {scenario.character.name.charAt(0)}
                </div>
              )}
              <p className="text-gray-500 text-sm">{scenario.character.name}のストーリー</p>
            </div>
            <button
              onClick={() => router.push('/explore')}
              className="px-6 py-2.5 rounded-full text-white text-sm font-semibold"
              style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              探索に戻る
            </button>
          </div>
        )}

        {/* 期間終了 && 既読 → 幻のストーリーとして表示 */}
        {scenario.isExpired && scenario.isRead && scenario.content && (
          <>
            {/* キャラアバター */}
            <div className="flex items-center gap-4 mb-6">
              {scenario.character.avatarUrl ? (
                <img
                  src={scenario.character.avatarUrl}
                  alt={scenario.character.name}
                  className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 grayscale opacity-70"
                  style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.3), 0 4px 16px rgba(0,0,0,0.5)' }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 opacity-70">
                  {scenario.character.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs">{scenario.character.franchise}</p>
                <p className="text-gray-300 font-bold text-lg">{scenario.character.name}</p>
                <p className="text-purple-400/70 text-xs mt-0.5">あなたが読んだ幻のストーリー</p>
              </div>
            </div>
            <ExpiredReadContent content={scenario.content} title={scenario.title} />
          </>
        )}

        {/* アクティブシナリオ */}
        {!scenario.isExpired && (
          <>
            {/* キャラアバター + 名前 */}
            <div className="flex items-center gap-4 mb-6">
              {scenario.character.avatarUrl ? (
                <img
                  src={scenario.character.avatarUrl}
                  alt={scenario.character.name}
                  className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                  style={{ boxShadow: '0 0 0 2px rgba(239,68,68,0.4), 0 4px 16px rgba(0,0,0,0.5)' }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {scenario.character.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-gray-400 text-xs">{scenario.character.franchise}</p>
                <p className="text-white font-bold text-lg">{scenario.character.name}</p>
                {scenario.description && (
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{scenario.description}</p>
                )}
              </div>
            </div>

            {/* FOOMOバナー */}
            <div
              className="rounded-2xl px-4 py-3 mb-6 flex items-center gap-3"
              style={{
                background: isUrgent
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.18))'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(251,113,133,0.1))',
                border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              <span className={`text-2xl flex-shrink-0 ${isUrgent ? 'animate-pulse' : ''}`}>
                {urgencyLevel === 'critical' ? '🔥' : urgencyLevel === 'soon' ? '⚠️' : '⏰'}
              </span>
              <div>
                <p className={`font-bold text-sm ${isUrgent ? 'text-red-300' : urgencyLevel === 'soon' ? 'text-orange-300' : 'text-red-400'}`}>
                  {isUrgent
                    ? `あと${scenario.remainingHours}時間で消えてしまう…！`
                    : `${countdown}で消滅`}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">見逃すと二度と読めない特別なストーリー</p>
              </div>
            </div>

            {/* コンテンツエリア */}
            {scenario.isRead && scenario.content ? (
              <>
                <NovelContent content={scenario.content} />
                {/* 読了マーク */}
                <div className="flex items-center justify-center gap-2 py-4">
                  <span className="text-green-400 text-base">✓</span>
                  <span className="text-green-400/80 text-sm font-medium">読了</span>
                  <span className="text-gray-600 text-xs">— このストーリーを読みました</span>
                </div>
              </>
            ) : (
              /* 未読 — 「読む」ボタン */
              <div className="text-center py-10">
                <div className="text-5xl mb-5">📖</div>
                <p className="text-white font-bold text-lg mb-2">特別なストーリーが届いています</p>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  {scenario.character.name}からのメッセージ。<br />
                  今しか読めない、ふたりだけの時間。
                </p>

                {readError && (
                  <div
                    className="rounded-xl px-4 py-3 mb-6 text-center"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}
                  >
                    <p className="text-red-300 text-sm">{readError}</p>
                  </div>
                )}

                <button
                  onClick={handleRead}
                  disabled={reading}
                  className="px-8 py-3.5 rounded-full text-white font-bold text-base transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    boxShadow: '0 4px 24px rgba(239,68,68,0.4)',
                  }}
                >
                  {reading ? '読み込み中…' : '📖 ストーリーを読む'}
                </button>

                <p className="text-gray-600 text-xs mt-4">
                  ⚠️ 読み始めると既読になります
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
