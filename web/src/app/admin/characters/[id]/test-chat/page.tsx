'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SCENARIOS = [
  { key: 'normal', label: '通常', icon: '💬' },
  { key: 'latenight', label: '深夜', icon: '🌙' },
  { key: 'anniversary', label: '記念日', icon: '🎉' },
  { key: 'jealousy', label: '嫉妬', icon: '😤' },
  { key: 'sad', label: '悲しい時', icon: '😢' },
] as const;

const LOCALES = [
  { key: 'ja', label: '日本語' },
  { key: 'en', label: 'English' },
  { key: 'ko', label: '한국어' },
  { key: 'zh', label: '中文' },
] as const;

export default function TestChatPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [characterName, setCharacterName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [intimacyLevel, setIntimacyLevel] = useState(3);
  const [scenario, setScenario] = useState('normal');
  const [locale, setLocale] = useState('ja');
  const [systemPromptPreview, setSystemPromptPreview] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch character name
  useEffect(() => {
    fetch(`/api/admin/characters/${id}/bible/soul`)
      .then(r => r.json())
      .then(data => {
        if (data.character?.name) setCharacterName(data.character.name);
      })
      .catch(() => {});
  }, [id]);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/characters/${id}/test-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          intimacyLevel,
          scenario,
          locale,
          history: messages,
        }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
        setSystemPromptPreview(data.systemPromptPreview ?? '');
      } else {
        setMessages([...newMessages, { role: 'assistant', content: `⚠️ エラー: ${data.error ?? '不明なエラー'}` }]);
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '⚠️ 通信エラーが発生しました' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSystemPromptPreview('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-bold text-white">
            🧪 テストチャット{characterName ? ` — ${characterName}` : ''}
          </h1>
        </div>
        <Link
          href={`/admin/characters/${id}/bible`}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Bible →
        </Link>
      </div>

      {/* Control Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
        {/* Intimacy Slider */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">
            親密度レベル: <span className="text-white font-bold text-base">{intimacyLevel}</span>
            <span className="text-gray-500 ml-2 text-xs">
              {intimacyLevel <= 2 ? '丁寧語' : intimacyLevel <= 4 ? 'やや砕けた' : intimacyLevel <= 6 ? 'タメ口' : intimacyLevel <= 8 ? '親密' : '最親密'}
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={intimacyLevel}
            onChange={e => setIntimacyLevel(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Scenario Buttons */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">シナリオ</label>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map(s => (
              <button
                key={s.key}
                onClick={() => setScenario(s.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  scenario === s.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Locale */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">言語</label>
          <div className="flex gap-2">
            {LOCALES.map(l => (
              <button
                key={l.key}
                onClick={() => setLocale(l.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  locale === l.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col" style={{ height: '480px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-600 py-20">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm">メッセージを送信してテスト会話を開始</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-800 text-gray-200 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-400 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-4 flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="メッセージを入力..."
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            送信
          </button>
          <button
            onClick={clearChat}
            className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
            title="会話クリア"
          >
            🗑
          </button>
        </div>
      </div>

      {/* System Prompt Preview */}
      {systemPromptPreview && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span>System Promptを確認</span>
            <span className={`transform transition-transform ${showSystemPrompt ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showSystemPrompt && (
            <div className="px-5 pb-5">
              <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-xs text-gray-400 whitespace-pre-wrap overflow-auto max-h-96 leading-relaxed">
                {systemPromptPreview}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
