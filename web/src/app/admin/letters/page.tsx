'use client';

import { useState, useEffect } from 'react';

interface Character {
  id: string;
  name: string;
  slug: string;
}

interface LetterRecord {
  id: string;
  characterId: string;
  character: { name: string; slug: string };
  title: string;
  content: string;
  type: string;
  isFcOnly: boolean;
  createdAt: string;
  _count: { deliveries: number };
}

export default function AdminLettersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [letters, setLetters] = useState<LetterRecord[]>([]);
  const [characterId, setCharacterId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'letter' | 'message'>('letter');
  const [isFcOnly, setIsFcOnly] = useState(true);
  const [deliverNow, setDeliverNow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/characters?limit=100')
      .then(r => r.json())
      .then(d => setCharacters(d.characters ?? []));
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    const res = await fetch('/api/admin/letters');
    if (res.ok) {
      const d = await res.json();
      setLetters(d.letters ?? []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterId || !title || !content) {
      setError('キャラ・タイトル・内容は必須です');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, title, content, type, isFcOnly, deliverNow }),
      });
      const data = await res.json() as { deliveredCount?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'エラー');
      } else {
        setSuccess(`✅ 作成完了！${deliverNow ? ` ${data.deliveredCount}名に配信` : ' スケジュール済み'}`);
        setTitle('');
        setContent('');
        fetchLetters();
      }
    } catch {
      setError('ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-8">✉️ キャラ手紙管理</h1>

        {/* 作成フォーム */}
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold mb-4">新規手紙作成</h2>

          <div className="space-y-4">
            {/* キャラ選択 */}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">キャラクター</label>
              <select
                value={characterId}
                onChange={e => setCharacterId(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-white/10"
              >
                <option value="">選択してください</option>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* タイプ */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('letter')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${type === 'letter' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
              >
                📩 手紙
              </button>
              <button
                type="button"
                onClick={() => setType('message')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${type === 'message' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
              >
                💬 メッセージ
              </button>
            </div>

            {/* タイトル */}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">タイトル</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="いつもありがとう"
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-white/10 placeholder-gray-600"
              />
            </div>

            {/* 本文 */}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">本文</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
                placeholder="キャラクターからのメッセージを書いてください..."
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-white/10 placeholder-gray-600 resize-none"
              />
            </div>

            {/* オプション */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFcOnly}
                  onChange={e => setIsFcOnly(e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-sm text-gray-300">FC会員限定</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deliverNow}
                  onChange={e => setDeliverNow(e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-sm text-gray-300">今すぐ配信</span>
              </label>
            </div>
          </div>

          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
          {success && <p className="mt-3 text-green-400 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold rounded-xl"
          >
            {loading ? '送信中...' : '✉️ 手紙を送る'}
          </button>
        </form>

        {/* 手紙履歴 */}
        <div>
          <h2 className="text-white font-semibold mb-4">送信履歴</h2>
          <div className="space-y-3">
            {letters.map(l => (
              <div key={l.id} className="bg-gray-900 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white text-sm font-medium">{l.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{l.character.name} · {l.type} · {l.isFcOnly ? '👑FC限定' : '🌐全員'}</p>
                    <p className="text-gray-600 text-xs mt-1">{new Date(l.createdAt).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-purple-400 font-bold text-sm">{l._count.deliveries}</p>
                    <p className="text-gray-600 text-xs">配信数</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-2 line-clamp-2">{l.content}</p>
              </div>
            ))}
            {letters.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-8">まだ手紙はありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
