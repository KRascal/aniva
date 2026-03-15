'use client';

import { useState } from 'react';

interface IPHolder {
  ipName: string;
  companyName: string;
  contactEmail: string;
  revenueShareIp: number;
  revenueShareAniva: number;
  contractStart: string;
  contractEnd: string;
}

interface CharacterInput {
  name: string;
  work: string; // 作品名
}

interface GeneratedCharacter {
  name: string;
  nameEn: string;
  slug: string;
  personality: string;
  avatarUrl: string;
  coverUrl: string;
  [key: string]: string;
}

const STEPS = [
  { id: 1, label: 'IPホルダー情報' },
  { id: 2, label: 'キャラクター入力' },
  { id: 3, label: 'AI自動生成' },
  { id: 4, label: '生成結果確認' },
  { id: 5, label: '確定・登録' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1
  const [ipHolder, setIpHolder] = useState<IPHolder>({
    ipName: '',
    companyName: '',
    contactEmail: '',
    revenueShareIp: 70,
    revenueShareAniva: 30,
    contractStart: new Date().toISOString().split('T')[0],
    contractEnd: '',
  });

  // Step 2
  const [characterInputs, setCharacterInputs] = useState<CharacterInput[]>([
    { name: '', work: '' },
  ]);

  // Step 3/4
  const [generatedCharacters, setGeneratedCharacters] = useState<GeneratedCharacter[]>([]);

  const addCharacterRow = () => {
    setCharacterInputs([...characterInputs, { name: '', work: '' }]);
  };

  const removeCharacterRow = (i: number) => {
    setCharacterInputs(characterInputs.filter((_, idx) => idx !== i));
  };

  const updateCharacterRow = (i: number, field: keyof CharacterInput, value: string) => {
    const updated = [...characterInputs];
    updated[i] = { ...updated[i], [field]: value };
    setCharacterInputs(updated);
  };

  const handleAIGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const valid = characterInputs.filter((c) => c.name.trim());
      if (!valid.length) {
        setError('キャラクター名を最低1つ入力してください');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/admin/characters/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters: valid.map((c) => ({ name: c.name, work: c.work })),
          ipName: ipHolder.ipName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI生成に失敗しました');
      setGeneratedCharacters(data.characters || []);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const updateGeneratedChar = (i: number, field: string, value: string) => {
    const updated = [...generatedCharacters];
    updated[i] = { ...updated[i], [field]: value };
    setGeneratedCharacters(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/onboarding/ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: ipHolder.companyName,
          contactEmail: ipHolder.contactEmail,
          ipName: ipHolder.ipName,
          revenueShareIp: ipHolder.revenueShareIp,
          revenueShareAniva: ipHolder.revenueShareAniva,
          contractStart: ipHolder.contractStart,
          contractEnd: ipHolder.contractEnd || undefined,
          characters: generatedCharacters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登録に失敗しました');
      setSuccess(true);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">IPオンボーディング</h1>
      <p className="text-neutral-400 mb-8">新規IPホルダーのテナント・キャラクターを一括セットアップします</p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 transition-colors ${
                step > s.id
                  ? 'bg-green-600 border-green-600 text-white'
                  : step === s.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
            >
              {step > s.id ? '✓' : s.id}
            </div>
            <span className={`text-sm hidden sm:block ${step === s.id ? 'text-white font-medium' : 'text-neutral-500'}`}>
              {s.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-8 ${step > s.id ? 'bg-green-600' : 'bg-neutral-700'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">{error}</div>
      )}

      {/* Step 1: IPホルダー情報 */}
      {step === 1 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Step 1: IPホルダー情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">IP名 / 作品名 *</label>
              <input
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="例: ONE PIECE"
                value={ipHolder.ipName}
                onChange={(e) => setIpHolder({ ...ipHolder, ipName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">会社名 *</label>
              <input
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="例: 集英社"
                value={ipHolder.companyName}
                onChange={(e) => setIpHolder({ ...ipHolder, companyName: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-neutral-400 mb-1">連絡先メール *</label>
              <input
                type="email"
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="例: ip-license@company.co.jp"
                value={ipHolder.contactEmail}
                onChange={(e) => setIpHolder({ ...ipHolder, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">IP収益配分 (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={ipHolder.revenueShareIp}
                onChange={(e) => setIpHolder({ ...ipHolder, revenueShareIp: Number(e.target.value), revenueShareAniva: 100 - Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">ANIVA収益配分 (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={ipHolder.revenueShareAniva}
                onChange={(e) => setIpHolder({ ...ipHolder, revenueShareAniva: Number(e.target.value), revenueShareIp: 100 - Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">契約開始日 *</label>
              <input
                type="date"
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={ipHolder.contractStart}
                onChange={(e) => setIpHolder({ ...ipHolder, contractStart: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">契約終了日（任意）</label>
              <input
                type="date"
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={ipHolder.contractEnd}
                onChange={(e) => setIpHolder({ ...ipHolder, contractEnd: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (!ipHolder.ipName || !ipHolder.companyName || !ipHolder.contactEmail) {
                  setError('IP名・会社名・メールは必須です');
                  return;
                }
                setError('');
                setStep(2);
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
            >
              次へ →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: キャラクター入力 */}
      {step === 2 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Step 2: キャラクター入力</h2>
          <p className="text-sm text-neutral-400">キャラクターの名前と作品名を入力してください。AIが設定を自動生成します。</p>
          <div className="space-y-3">
            {characterInputs.map((c, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="flex-1">
                  <input
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="キャラクター名（例: モンキー・D・ルフィ）"
                    value={c.name}
                    onChange={(e) => updateCharacterRow(i, 'name', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <input
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="作品名（例: ONE PIECE）"
                    value={c.work}
                    onChange={(e) => updateCharacterRow(i, 'work', e.target.value)}
                  />
                </div>
                <button
                  onClick={() => removeCharacterRow(i)}
                  disabled={characterInputs.length === 1}
                  className="text-neutral-500 hover:text-red-400 disabled:opacity-30 transition-colors text-lg px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addCharacterRow}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            + キャラクターを追加
          </button>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors">
              ← 戻る
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
            >
              次へ →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: AI自動生成 */}
      {step === 3 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Step 3: AI自動生成</h2>
          <div className="bg-neutral-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-neutral-300 font-medium">生成対象キャラクター</p>
            {characterInputs.filter((c) => c.name.trim()).map((c, i) => (
              <div key={i} className="text-sm text-neutral-400">
                {i + 1}. {c.name} {c.work ? `（${c.work}）` : ''}
              </div>
            ))}
          </div>
          <p className="text-sm text-neutral-400">
            AIがキャラクター設定（英語名・スラッグ・性格説明など）を自動生成します。<br />
            生成後に編集できます。
          </p>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors">
              ← 戻る
            </button>
            <button
              onClick={handleAIGenerate}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  生成中...
                </>
              ) : (
                '✨ AI自動生成'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: 生成結果プレビュー（編集可能） */}
      {step === 4 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Step 4: 生成結果確認・編集</h2>
          <p className="text-sm text-neutral-400">生成されたキャラクター設定を確認・編集してください。</p>
          <div className="space-y-6">
            {generatedCharacters.map((char, i) => (
              <div key={i} className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 space-y-3">
                <p className="text-white font-medium text-sm">キャラクター {i + 1}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['name', 'nameEn', 'slug', 'avatarUrl', 'coverUrl'].map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-neutral-500 mb-1">{field}</label>
                      <input
                        className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                        value={char[field] || ''}
                        onChange={(e) => updateGeneratedChar(i, field, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-neutral-500 mb-1">personality</label>
                    <textarea
                      rows={3}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                      value={char.personality || ''}
                      onChange={(e) => updateGeneratedChar(i, 'personality', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(3)} className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors">
              ← 再生成
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
            >
              確認 →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: 確定 */}
      {step === 5 && !success && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Step 5: 確定・登録</h2>
          <div className="space-y-4">
            <div className="bg-neutral-800 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-white">IPホルダー情報</p>
              <p className="text-sm text-neutral-400">IP名: {ipHolder.ipName}</p>
              <p className="text-sm text-neutral-400">会社: {ipHolder.companyName}</p>
              <p className="text-sm text-neutral-400">メール: {ipHolder.contactEmail}</p>
              <p className="text-sm text-neutral-400">収益配分: IP {ipHolder.revenueShareIp}% / ANIVA {ipHolder.revenueShareAniva}%</p>
            </div>
            <div className="bg-neutral-800 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-white">キャラクター ({generatedCharacters.length}件)</p>
              {generatedCharacters.map((c, i) => (
                <p key={i} className="text-sm text-neutral-400">・{c.name} ({c.nameEn})</p>
              ))}
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(4)} className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors">
              ← 戻る
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登録中...
                </>
              ) : (
                '✅ 確定して登録'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 完了 */}
      {success && (
        <div className="bg-neutral-900 border border-green-800 rounded-xl p-8 text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-semibold text-white">登録完了！</h2>
          <p className="text-neutral-400 text-sm">
            {ipHolder.ipName} のテナント・キャラクター・契約が一括登録されました。
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setStep(1);
                setSuccess(false);
                setGeneratedCharacters([]);
                setCharacterInputs([{ name: '', work: '' }]);
                setIpHolder({ ipName: '', companyName: '', contactEmail: '', revenueShareIp: 70, revenueShareAniva: 30, contractStart: new Date().toISOString().split('T')[0], contractEnd: '' });
              }}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-sm transition-colors"
            >
              新規オンボーディング
            </button>
            <a href="/admin/tenants" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
              テナント一覧へ
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
