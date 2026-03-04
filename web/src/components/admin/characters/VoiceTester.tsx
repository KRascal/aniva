'use client';

import React, { useRef, useState } from 'react';

export function VoiceTester({ voiceModelId }: { voiceModelId: string }) {
  const [testText, setTestText] = useState('こんにちは！テストです。');
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const runTest = async () => {
    if (!voiceModelId.trim()) {
      setTestError('音声モデルIDを入力してください');
      return;
    }
    setTestError('');
    setTesting(true);
    try {
      const res = await fetch('/api/admin/voice-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceModelId: voiceModelId.trim(), text: testText }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'エラー' }));
        setTestError(d.error || 'テスト失敗');
        setTesting(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTesting(false);
      };
      audio.onerror = () => {
        setTestError('音声の再生に失敗しました');
        setTesting(false);
      };
    } catch {
      setTestError('テスト失敗: ネットワークエラー');
      setTesting(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-gray-900/60 rounded-lg border border-purple-700/40">
      <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-2">🔊 ボイステスト</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="テスト文章を入力..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
        />
        <button
          type="button"
          onClick={runTest}
          disabled={testing || !voiceModelId.trim()}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
        >
          {testing ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              再生中...
            </>
          ) : '▶ 再生'}
        </button>
      </div>
      {testError && <p className="text-red-400 text-xs mt-1.5">{testError}</p>}
    </div>
  );
}
