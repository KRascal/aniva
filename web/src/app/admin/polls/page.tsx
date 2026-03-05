'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// ── 型定義 ──────────────────────────────────────────────────────────────────

interface PollChoice {
  id: string;
  text: string;
}

interface PollCharacter {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
}

interface Poll {
  id: string;
  characterId: string;
  title: string;
  description: string | null;
  choices: PollChoice[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  resultChoiceId: string | null;
  voteCount: number;
  character: PollCharacter;
  createdAt: string;
}

interface Character {
  id: string;
  name: string;
  slug: string;
}

// ── 新規投票フォーム ─────────────────────────────────────────────────────────

function nowPlus(hours: number): string {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

function CreatePollForm({
  characters,
  onCreated,
}: {
  characters: Character[];
  onCreated: () => void;
}) {
  const [characterId, setCharacterId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [choices, setChoices] = useState<string[]>(['', '']);
  const [startsAt, setStartsAt] = useState(nowPlus(0));
  const [endsAt, setEndsAt] = useState(nowPlus(72));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addChoice = () => setChoices((prev) => [...prev, '']);
  const removeChoice = (idx: number) => {
    if (choices.length <= 2) return;
    setChoices((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateChoice = (idx: number, val: string) =>
    setChoices((prev) => prev.map((c, i) => (i === idx ? val : c)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validChoices = choices.filter((c) => c.trim());
    if (validChoices.length < 2) {
      setError('選択肢は2つ以上入力してください');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          title,
          description: description || undefined,
          choices: validChoices.map((text, i) => ({ id: String.fromCharCode(97 + i), text })),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '作成失敗');
      } else {
        setTitle('');
        setDescription('');
        setChoices(['', '']);
        setCharacterId('');
        onCreated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">📊 新規投票作成</h2>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* キャラクター選択 */}
      <div>
        <label className="block text-sm text-white/60 mb-1">キャラクター *</label>
        <select
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          required
          className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="">選択してください</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* タイトル */}
      <div>
        <label className="block text-sm text-white/60 mb-1">タイトル *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="例: 次の冒険先はどっち？"
          className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30"
        />
      </div>

      {/* 説明 */}
      <div>
        <label className="block text-sm text-white/60 mb-1">説明（任意）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="投票の詳細説明..."
          className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 resize-none"
        />
      </div>

      {/* 選択肢 */}
      <div>
        <label className="block text-sm text-white/60 mb-2">選択肢（2つ以上）</label>
        <div className="space-y-2">
          {choices.map((choice, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-white/40 text-sm w-5 mt-2">{String.fromCharCode(97 + idx)}.</span>
              <input
                type="text"
                value={choice}
                onChange={(e) => updateChoice(idx, e.target.value)}
                placeholder={`選択肢 ${idx + 1}`}
                className="flex-1 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30"
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(idx)}
                  className="text-red-400/70 hover:text-red-400 text-sm px-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addChoice}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          ＋ 選択肢を追加
        </button>
      </div>

      {/* 期間 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">開始日時 *</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">終了日時 *</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-bold transition-colors"
      >
        {loading ? '作成中...' : '📊 投票を作成'}
      </button>
    </form>
  );
}

// ── 投票カード ───────────────────────────────────────────────────────────────

function PollCard({ poll, onToggle, onDelete }: { poll: Poll; onToggle: (id: string, isActive: boolean) => void; onDelete: (id: string) => void }) {
  const now = new Date();
  const isExpired = new Date(poll.endsAt) < now;
  const isActive = poll.isActive && !isExpired;

  return (
    <div className={`bg-white/5 border rounded-xl p-5 space-y-3 ${isActive ? 'border-purple-500/30' : 'border-white/10'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {poll.character.avatarUrl ? (
            <img src={poll.character.avatarUrl} alt={poll.character.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-purple-800/50 flex items-center justify-center text-sm">
              {poll.character.name[0]}
            </div>
          )}
          <span className="text-white/60 text-sm">{poll.character.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/20 text-green-400' : isExpired ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {isActive ? '公開中' : isExpired ? '終了' : '非公開'}
          </span>
          <span className="text-white/40 text-xs">🗳 {poll.voteCount}票</span>
        </div>
      </div>

      <h3 className="text-white font-bold">{poll.title}</h3>
      {poll.description && <p className="text-white/50 text-sm">{poll.description}</p>}

      <div className="space-y-1">
        {poll.choices.map((c) => (
          <div key={c.id} className={`text-sm px-3 py-1.5 rounded-lg ${poll.resultChoiceId === c.id ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/60'}`}>
            {c.id}. {c.text} {poll.resultChoiceId === c.id && '✓'}
          </div>
        ))}
      </div>

      <div className="text-xs text-white/30">
        {new Date(poll.startsAt).toLocaleString('ja-JP')} ～ {new Date(poll.endsAt).toLocaleString('ja-JP')}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onToggle(poll.id, !poll.isActive)}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${poll.isActive ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
        >
          {poll.isActive ? '⏸ 非公開にする' : '▶ 公開する'}
        </button>
        <button
          onClick={() => {
            if (confirm('この投票を削除しますか？')) onDelete(poll.id);
          }}
          className="px-4 py-2 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
        >
          🗑 削除
        </button>
      </div>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────────────────────

export default function AdminPollsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'create'>('list');

  // admin guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchPolls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/polls');
      if (res.ok) {
        const data = await res.json();
        setPolls(data.polls ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCharacters = useCallback(async () => {
    const res = await fetch('/api/characters');
    if (res.ok) {
      const data = await res.json();
      setCharacters(data.characters ?? []);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
    fetchCharacters();
  }, [fetchPolls, fetchCharacters]);

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/polls/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    fetchPolls();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/polls/${id}`, { method: 'DELETE' });
    setPolls((prev) => prev.filter((p) => p.id !== id));
  };

  const activePolls = polls.filter((p) => p.isActive && new Date(p.endsAt) > new Date());
  const expiredPolls = polls.filter((p) => new Date(p.endsAt) <= new Date());
  const inactivePolls = polls.filter((p) => !p.isActive && new Date(p.endsAt) > new Date());

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button onClick={() => router.push('/admin')} className="text-white/40 hover:text-white/70 text-sm mb-4 flex items-center gap-1">
            ← 管理画面へ戻る
          </button>
          <h1 className="text-2xl font-bold">📊 投票管理</h1>
          <p className="text-white/50 text-sm mt-1">キャラクター投票イベントの作成・管理</p>

          <div className="flex gap-2 mt-4">
            <span className="text-sm px-3 py-1 bg-green-500/10 text-green-400 rounded-full">公開中: {activePolls.length}</span>
            <span className="text-sm px-3 py-1 bg-gray-500/10 text-gray-400 rounded-full">終了: {expiredPolls.length}</span>
            <span className="text-sm px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full">非公開: {inactivePolls.length}</span>
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-6">
          {(['list', 'create'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
            >
              {t === 'list' ? '📋 投票一覧' : '＋ 新規作成'}
            </button>
          ))}
        </div>

        {/* 新規作成タブ */}
        {tab === 'create' && (
          <CreatePollForm
            characters={characters}
            onCreated={() => {
              fetchPolls();
              setTab('list');
            }}
          />
        )}

        {/* 一覧タブ */}
        {tab === 'list' && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-white/40 text-center py-8">読み込み中...</p>
            ) : polls.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 text-4xl mb-3">📊</p>
                <p className="text-white/40">投票がまだありません</p>
                <button onClick={() => setTab('create')} className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-bold transition-colors">
                  最初の投票を作成
                </button>
              </div>
            ) : (
              <>
                {activePolls.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-green-400 mb-2">🟢 公開中</h2>
                    <div className="space-y-3">
                      {activePolls.map((p) => (
                        <PollCard key={p.id} poll={p} onToggle={handleToggle} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}
                {inactivePolls.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-yellow-400 mb-2">⏸ 非公開</h2>
                    <div className="space-y-3">
                      {inactivePolls.map((p) => (
                        <PollCard key={p.id} poll={p} onToggle={handleToggle} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}
                {expiredPolls.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-400 mb-2">⏹ 終了済み</h2>
                    <div className="space-y-3">
                      {expiredPolls.map((p) => (
                        <PollCard key={p.id} poll={p} onToggle={handleToggle} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
