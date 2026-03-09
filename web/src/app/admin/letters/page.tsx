'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Character {
  id: string;
  name: string;
  slug: string;
}

interface AdminLetter {
  id: string;
  characterId: string;
  title: string;
  content: string;
  type: string;
  isFcOnly: boolean;
  createdAt: string;
  character: { name: string; slug: string };
  _count: { deliveries: number };
}

export default function AdminLettersPage() {
  const [letters, setLetters] = useState<AdminLetter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規作成フォーム
  const [showForm, setShowForm] = useState(false);
  const [charId, setCharId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isFcOnly, setIsFcOnly] = useState(true);
  const [deliverNow, setDeliverNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/letters').then(r => r.json()),
      fetch('/api/characters').then(r => r.json()),
    ]).then(([lettersData, charsData]) => {
      setLetters(lettersData.letters ?? []);
      setCharacters(charsData.characters ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!charId || !title || !content) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: charId, title, content, isFcOnly, deliverNow }),
      });
      const data = await res.json();
      if (data.ok) {
        // リスト更新
        const refreshed = await fetch('/api/admin/letters').then(r => r.json());
        setLetters(refreshed.letters ?? []);
        setShowForm(false);
        setTitle('');
        setContent('');
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">💌 手紙管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          + 新規作成
        </button>
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">キャラクター</label>
            <select
              value={charId}
              onChange={e => setCharId(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm"
            >
              <option value="">選択...</option>
              {characters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">タイトル</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm"
              placeholder="手紙のタイトル"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">本文</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm h-40 resize-none"
              placeholder="手紙の本文（キャラの口調で）"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={isFcOnly} onChange={e => setIsFcOnly(e.target.checked)} className="rounded" />
              FC限定
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={deliverNow} onChange={e => setDeliverNow(e.target.checked)} className="rounded" />
              即時配信
            </label>
          </div>
          <button
            onClick={handleCreate}
            disabled={submitting || !charId || !title || !content}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold rounded-xl text-sm"
          >
            {submitting ? '配信中...' : '作成・配信'}
          </button>
        </div>
      )}

      {/* 手紙リスト */}
      {loading ? (
        <p className="text-gray-500 text-sm">読み込み中...</p>
      ) : letters.length === 0 ? (
        <p className="text-gray-500 text-sm">まだ手紙はありません</p>
      ) : (
        <div className="space-y-2">
          {letters.map(l => (
            <div key={l.id} className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-semibold">{l.title}</p>
                <p className="text-gray-500 text-xs">{l.character.name} • {l._count.deliveries}通配信 • {l.isFcOnly ? 'FC限定' : '全員'}</p>
              </div>
              <span className="text-gray-600 text-xs">{new Date(l.createdAt).toLocaleDateString('ja-JP')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
