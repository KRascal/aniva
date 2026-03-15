'use client';

import { useState } from 'react';

export const ANIMATION_TYPES = [
  { value: 'standard', label: 'スタンダード',   desc: '通常の演出',              icon: '✨' },
  { value: 'fire',     label: 'ファイア',        desc: '炎が画面を包む演出',      icon: '🔥' },
  { value: 'flame',    label: 'フレイム',        desc: '青白い炎の演出',          icon: '🌊' },
  { value: 'cursed',   label: 'カースド',        desc: '呪力が溢れ出す演出',      icon: '☠️' },
  { value: 'golden',   label: 'ゴールデン',      desc: '黄金の粒子が輝く演出',    icon: '🌟' },
] as const;

export type AnimationType = typeof ANIMATION_TYPES[number]['value'];

const PRE_ROLL_PRESETS: { label: string; value: string }[] = [
  {
    label: 'シンプル',
    value: JSON.stringify({ duration: 2000, particles: false }, null, 2),
  },
  {
    label: 'パーティクル',
    value: JSON.stringify({ duration: 3000, particles: true, particleCount: 50 }, null, 2),
  },
  {
    label: 'フルエフェクト',
    value: JSON.stringify({
      duration: 4000,
      particles: true,
      particleCount: 100,
      screenShake: true,
      flash: true,
    }, null, 2),
  },
];

interface Props {
  animationType: string;
  themeColor: string;
  preRollConfig: string;
  onAnimationTypeChange: (val: string) => void;
  onThemeColorChange: (val: string) => void;
  onPreRollConfigChange: (val: string) => void;
  preRollJsonError?: string;
}

export default function GachaAnimationEditor({
  animationType,
  themeColor,
  preRollConfig,
  onAnimationTypeChange,
  onThemeColorChange,
  onPreRollConfigChange,
  preRollJsonError,
}: Props) {
  const [showPresets, setShowPresets] = useState(false);

  const selectedAnimation = ANIMATION_TYPES.find(a => a.value === animationType) ?? ANIMATION_TYPES[0];

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        🎨 演出設定
      </h3>

      {/* Animation Type */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">演出タイプ</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ANIMATION_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onAnimationTypeChange(type.value)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition-all"
              style={
                animationType === type.value
                  ? {
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.2))',
                      border: '1px solid rgba(168,85,247,0.5)',
                      color: '#fff',
                    }
                  : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: '#6b7280',
                    }
              }
            >
              <span className="text-base">{type.icon}</span>
              <div>
                <div className="font-medium">{type.label}</div>
                <div className="text-[10px] opacity-70">{type.desc}</div>
              </div>
            </button>
          ))}
        </div>
        {/* Preview badge */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: `${themeColor}20`,
              border: `1px solid ${themeColor}40`,
              color: themeColor,
            }}
          >
            <span>{selectedAnimation.icon}</span>
            {selectedAnimation.label}
          </span>
          <span className="text-[10px] text-gray-600">プレビュー</span>
        </div>
      </div>

      {/* Theme Color */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">テーマカラー</label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => onThemeColorChange(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer"
              style={{ padding: '2px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}
            />
          </div>
          <input
            type="text"
            value={themeColor}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) onThemeColorChange(val);
            }}
            className="flex-1 px-3 py-2 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            placeholder="#6d28d9"
            maxLength={7}
          />
          {/* Quick color swatches */}
          <div className="flex gap-1.5">
            {['#7c3aed', '#db2777', '#d97706', '#059669', '#0284c7', '#dc2626'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onThemeColorChange(c)}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  border: themeColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                }}
                title={c}
              />
            ))}
          </div>
        </div>
        {/* Color preview gradient */}
        <div
          className="mt-2 h-1.5 rounded-full"
          style={{ background: `linear-gradient(to right, ${themeColor}00, ${themeColor}, ${themeColor}00)` }}
        />
      </div>

      {/* Pre-Roll Config */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500">演出前設定 (JSON)</label>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            {showPresets ? '▲ プリセット非表示' : '▼ プリセット'}
          </button>
        </div>

        {showPresets && (
          <div className="flex flex-wrap gap-2 mb-2">
            {PRE_ROLL_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onPreRollConfigChange(preset.value);
                  setShowPresets(false);
                }}
                className="px-3 py-1.5 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { onPreRollConfigChange(''); setShowPresets(false); }}
              className="px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              クリア
            </button>
          </div>
        )}

        <textarea
          value={preRollConfig}
          onChange={(e) => onPreRollConfigChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
          style={{
            background: preRollJsonError ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
            border: preRollJsonError ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
          }}
          placeholder='{"duration": 2000, "particles": true}'
        />
        {preRollJsonError && (
          <p className="text-red-400 text-xs mt-1">⚠️ {preRollJsonError}</p>
        )}
        {!preRollJsonError && preRollConfig.trim() && (
          <p className="text-green-500 text-xs mt-1">✓ 有効なJSON</p>
        )}
        <p className="text-gray-700 text-[10px] mt-1">
          未入力の場合はデフォルト演出が使用されます
        </p>
      </div>
    </div>
  );
}
