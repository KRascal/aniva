'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Section = 'all' | 'voice' | 'personality' | 'boundary';

interface EnrichResult {
  success: boolean;
  enriched?: Record<string, unknown>;
  rawContent?: string;
  parsed?: boolean;
  applied?: boolean;
  error?: string;
}

export default function AiEnrichPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [section, setSection] = useState<Section>('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [error, setError] = useState('');

  const handleEnrich = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/admin/characters/${id}/ai-enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section }),
      });
      const data = await res.json() as EnrichResult;
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
      } else {
        setResult(data);
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
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >← 戻る</button>
          <h1 className="text-xl font-bold text-white">🤖 AI人格深掘り</h1>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <p className="text-gray-300 text-sm mb-6">
            AIがキャラクターの原作情報を元に、人格・口調・境界設定を自動深掘りします。
            生成後、DBに即時反映されます。
          </p>

          {/* セクション選択 */}
          <div className="mb-6">
            <label className="text-gray-400 text-sm block mb-2">深掘りセクション</label>
            <div className="grid grid-cols-2 gap-2">
              {(['all', 'personality', 'voice', 'boundary'] as Section[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    section === s
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {s === 'all' ? '🌟 全て' : s === 'personality' ? '💭 人格' : s === 'voice' ? '🗣 音声/口調' : '🚫 境界設定'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-500/40 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleEnrich}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold rounded-xl transition-all"
          >
            {loading ? '⏳ AI深掘り中...' : '✨ AIで深掘りする'}
          </button>
        </div>

        {/* 結果表示 */}
        {result && (
          <div className="bg-gray-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-400 text-lg">✅</span>
              <h2 className="text-white font-semibold">
                深掘り完了 {result.applied ? '（DB反映済み）' : '（手動確認要）'}
              </h2>
            </div>

            {result.enriched && (
              <div className="space-y-4">
                {/* 人格 */}
                {(result.enriched.personality as Record<string, unknown>) && (
                  <div>
                    <h3 className="text-purple-400 text-sm font-semibold mb-2">💭 人格</h3>
                    <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-300 space-y-2">
                      {Object.entries(result.enriched.personality as Record<string, string>).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-gray-500">{k}: </span>
                          <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* 音声 */}
                {(result.enriched.voice as Record<string, unknown>) && (
                  <div>
                    <h3 className="text-blue-400 text-sm font-semibold mb-2">🗣 音声/口調</h3>
                    <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-300 space-y-2">
                      {Object.entries(result.enriched.voice as Record<string, unknown>).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-gray-500">{k}: </span>
                          <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.rawContent && !result.parsed && (
              <pre className="bg-gray-800 rounded-xl p-4 text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {result.rawContent}
              </pre>
            )}

            <button
              onClick={() => router.push(`/admin/characters/${id}/bible`)}
              className="mt-4 w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-all"
            >
              Bibleページで確認する →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
