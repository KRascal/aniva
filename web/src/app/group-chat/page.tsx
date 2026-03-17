'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GroupCharacter {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  franchise: string;
}

interface GroupMessage {
  id: string;
  type: 'user' | 'character';
  characterId?: string;
  characterName?: string;
  characterAvatarUrl?: string | null;
  content: string;
  emotion?: string;
  timestamp: Date;
}

// EMOTION_COLORS
const EMOTION_COLORS: Record<string, string> = {
  happy: 'border-yellow-400/50',
  excited: 'border-orange-400/50',
  sad: 'border-blue-400/50',
  angry: 'border-red-400/50',
  love: 'border-pink-400/50',
  embarrassed: 'border-rose-300/50',
  neutral: 'border-purple-500/30',
};

export default function GroupChatPage() {
  const router = useRouter();
  const [selectedChars, setSelectedChars] = useState<GroupCharacter[]>([]);
  const [characters, setCharacters] = useState<GroupCharacter[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; characterId: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 掛け合い可能キャラ一覧取得（選択に応じて動的にフィルタ）
  useEffect(() => {
    const selectedIds = selectedChars.map(c => c.id);
    const query = selectedIds.length > 0
      ? `/api/chat/group/available?characterIds=${selectedIds.join(',')}`
      : '/api/chat/group/available';
    fetch(query)
      .then(r => r.json())
      .then(d => setCharacters(d.characters || []))
      .catch(console.error);
  }, [selectedChars]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleCharacter = (char: GroupCharacter) => {
    setSelectedChars(prev => {
      if (prev.find(c => c.id === char.id)) {
        return prev.filter(c => c.id !== char.id);
      }
      if (prev.length >= 3) return prev; // 最大3キャラ
      return [...prev, char];
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || selectedChars.length < 2 || isSending) return;

    const userMsg: GroupMessage = {
      id: `u-${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterIds: selectedChars.map(c => c.id),
          userMessage: currentInput,
          conversationHistory,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { messages: Array<{ characterId: string; characterName: string; content: string; emotion: string }> };
        const newHistory: typeof conversationHistory = [
          { role: 'user', characterId: '', content: currentInput },
        ];

        const newMsgs: GroupMessage[] = data.messages.map(m => {
          const char = selectedChars.find(c => c.id === m.characterId);
          newHistory.push({ role: 'character', characterId: m.characterId, content: m.content });
          return {
            id: `c-${m.characterId}-${Date.now()}-${Math.random()}`,
            type: 'character',
            characterId: m.characterId,
            characterName: m.characterName,
            characterAvatarUrl: char?.avatarUrl ?? null,
            content: m.content,
            emotion: m.emotion,
            timestamp: new Date(),
          };
        });

        setMessages(prev => [...prev, ...newMsgs]);
        setConversationHistory(prev => [...prev, ...newHistory].slice(-20));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col max-w-md mx-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
            ←
          </button>
          <h1 className="font-semibold text-white">グループチャット</h1>
        </div>
        
        {/* 選択済みキャラ */}
        {selectedChars.length > 0 && (
          <div className="flex gap-2 mt-2">
            {selectedChars.map(char => (
              <div key={char.id} className="flex items-center gap-1 bg-purple-900/30 border border-purple-500/30 rounded-full px-2 py-0.5 text-xs">
                {char.avatarUrl && (
                  <Image src={char.avatarUrl} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" unoptimized />
                )}
                <span>{char.name}</span>
                <button onClick={() => toggleCharacter(char)} className="text-gray-500 hover:text-white ml-1">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* キャラ選択（会話前） */}
      {messages.length === 0 && (
        <div className="p-4 flex-1">
          <p className="text-gray-400 text-sm mb-2">2〜3体のキャラを選んでグループチャットを始めよう</p>
          <p className="text-gray-500 text-xs mb-4">※ キャラの世界観の都合上、掛け合わせられない組み合わせも存在します</p>
          <div className="grid grid-cols-3 gap-2">
            {/* 選択済みキャラ + 利用可能キャラを重複なしでマージ表示 */}
            {[...selectedChars, ...characters.filter(c => !selectedChars.find(s => s.id === c.id))].slice(0, 18).map(char => {
              const isSelected = selectedChars.find(c => c.id === char.id);
              return (
                <button
                  key={char.id}
                  onClick={() => toggleCharacter(char)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-900/30'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    {char.avatarUrl ? (
                      <Image src={char.avatarUrl} alt={char.name} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
                    )}
                  </div>
                  <span className="text-xs text-center leading-tight">{char.name}</span>
                </button>
              );
            })}
          </div>
          
          {selectedChars.length >= 2 && (
            <button
              onClick={() => setMessages([{ id: 'start', type: 'user', content: '', timestamp: new Date() }])}
              className="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold"
            >
              チャット開始 ({selectedChars.length}体)
            </button>
          )}
        </div>
      )}

      {/* メッセージエリア */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.filter(m => m.content).map(msg => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {msg.type === 'character' && (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1">
                  {msg.characterAvatarUrl ? (
                    <Image src={msg.characterAvatarUrl} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
                  )}
                </div>
              )}
              <div className={`max-w-[75%] ${msg.type === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {msg.type === 'character' && (
                  <span className="text-xs text-gray-400 ml-1">{msg.characterName}</span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm border ${
                  msg.type === 'user'
                    ? 'bg-purple-600 border-purple-500/50 rounded-br-sm text-white'
                    : `bg-white/5 ${EMOTION_COLORS[msg.emotion ?? 'neutral'] ?? 'border-purple-500/30'} rounded-bl-sm text-gray-100`
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3">
              {selectedChars.map(char => (
                <div key={char.id} className="flex items-center gap-1.5">
                  {char.avatarUrl && (
                    <Image src={char.avatarUrl} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                  )}
                  <div className="flex gap-1 bg-white/5 px-3 py-2 rounded-full">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 入力エリア */}
      {messages.length > 0 && (
        <div className="sticky bottom-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/5 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="みんなに話しかける..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
              disabled={isSending}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isSending}
              className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
