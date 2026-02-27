'use client';

import { useEffect, useState } from 'react';

interface NotificationSettings {
  momentNotifications: boolean;
  chatReplyNotifications: boolean;
  coinNotifications: boolean;
  weeklyDigest: boolean;
}

const NOTIFICATION_LABELS: { key: keyof NotificationSettings; label: string; description: string }[] = [
  {
    key: 'momentNotifications',
    label: '新しいMoment通知',
    description: 'キャラクターが新しいMomentを投稿したときに通知を受け取る',
  },
  {
    key: 'chatReplyNotifications',
    label: 'チャット返信通知',
    description: 'キャラクターからの返信があったときに通知を受け取る',
  },
  {
    key: 'coinNotifications',
    label: 'コイン関連通知',
    description: 'コインの獲得・消費などの通知を受け取る',
  },
  {
    key: 'weeklyDigest',
    label: '週次ダイジェスト',
    description: '週に1回、活動まとめのメールを受け取る',
  },
];

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user/notification-settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.notifications);
        setLoading(false);
      })
      .catch(() => {
        setError('設定の読み込みに失敗しました');
        setLoading(false);
      });
  }, []);

  const handleToggle = async (key: keyof NotificationSettings) => {
    if (!settings) return;
    const newValue = !settings[key];
    const updated = { ...settings, [key]: newValue };
    setSettings(updated);
    setSaving(key);
    try {
      const res = await fetch('/api/user/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSettings(data.notifications);
    } catch {
      setSettings(settings); // revert
      setError('設定の保存に失敗しました');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">通知設定</h1>
        <p className="text-gray-400 mb-8">受け取る通知の種類を管理します</p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {NOTIFICATION_LABELS.map(({ key, label, description }) => (
              <div
                key={key}
                className="bg-gray-800 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-white">{label}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{description}</p>
                </div>
                <button
                  onClick={() => handleToggle(key)}
                  disabled={saving === key}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    settings?.[key] ? 'bg-purple-600' : 'bg-gray-600'
                  } ${saving === key ? 'opacity-50' : ''}`}
                  role="switch"
                  aria-checked={settings?.[key] ?? false}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings?.[key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
