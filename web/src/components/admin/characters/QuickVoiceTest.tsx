'use client';

import React, { useRef, useState } from 'react';
import { Character } from '@/components/admin/characters/types';

export function QuickVoiceTest({ character, onClose }: { character: Character; onClose: () => void }) {
  const [text, setText] = useState(`こんにちは！私は${character.name}です。`);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = async () => {
    if (!character.voiceModelId) return;
    setError('');
    setPlaying(true);
    try {
      const res = await fetch('/api/admin/voice-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceModelId: character.voiceModelId, text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'テスト失敗');
        setPlaying(false);
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
      audio.onended = () => { URL.revokeObjectURL(url); setPlaying(false); };
      audio.onerror = () => { setError('再生エラー'); setPlaying(false); };
    } catch {
      setError('ネットワークエラー');
      setPlaying(false);
    }
  };

  return (
    <tr>
      <td colSpan={7} className="px-4 pb-3 pt-0 bg-gray-900">
        <div className="flex items-center gap-3 bg-gray-800/60 border border-purple-700/40 rounded-xl px-4 py-3">
          <span className="text-purple-400 text-sm shrink-0">🔊 {character.name}</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && play()}
            placeholder="テスト文章..."
            autoFocus
          />
          <button
            onClick={play}
            disabled={playing}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
          >
            {playing ? (
              <><svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> 再生中</>
            ) : '▶ 再生'}
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg shrink-0">×</button>
          {error && <span className="text-red-400 text-xs shrink-0">{error}</span>}
        </div>
      </td>
    </tr>
  );
}
