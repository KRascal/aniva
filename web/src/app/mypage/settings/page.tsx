'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

type ThemeOption = 'light' | 'dark' | 'system';
type LangOption = 'ja' | 'en';

interface SettingsData {
  theme: ThemeOption;
  notifications: boolean;
  language: LangOption;
}

interface AccountInfo {
  email: string;
  displayName: string | null;
  plan: string;
}

const PLAN_LABELS: Record<string, { label: string; emoji: string }> = {
  FREE:     { label: 'Free',     emoji: '🆓' },
  STANDARD: { label: 'Standard', emoji: '⭐' },
  PREMIUM:  { label: 'Premium',  emoji: '👑' },
};

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: string }[] = [
  { value: 'light', label: 'ライト', icon: '☀️' },
  { value: 'dark',  label: 'ダーク', icon: '🌙' },
  { value: 'system', label: 'システム', icon: '💻' },
];

const LANG_OPTIONS: { value: LangOption; label: string; flag: string }[] = [
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setTheme } = useTheme();

  const [settings, setSettings] = useState<SettingsData>({
    theme: 'dark',
    notifications: true,
    language: 'ja',
  });
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    fetch('/api/users/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
          // Sync with next-themes
          setTheme(data.settings.theme);
        }
        if (data.email) {
          setAccount({
            email: data.email,
            displayName: data.displayName ?? null,
            plan: data.plan ?? 'FREE',
          });
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [status, setTheme]);

  const handleSave = async (updates: Partial<SettingsData>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setIsSaving(true);

    // Apply theme immediately
    if (updates.theme) {
      setTheme(updates.theme);
    }

    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        setSaveMessage('保存しました ✓');
        setTimeout(() => setSaveMessage(null), 2000);
      }
    } catch {
      setSaveMessage('保存に失敗しました');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('このブラウザはプッシュ通知に対応していません');
      return;
    }
    if (Notification.permission === 'denied') {
      alert('ブラウザの設定から通知を許可してください');
      return;
    }
    if (!settings.notifications) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await handleSave({ notifications: true });
      }
    } else {
      alert('通知をOFFにするにはブラウザの設定から変更してください');
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-[var(--color-muted)] text-sm animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  const planInfo = PLAN_LABELS[account?.plan ?? 'FREE'] ?? PLAN_LABELS.FREE;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] pb-24 animate-fadeIn">
      {/* ヘッダー */}
      <header className="bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors p-2 rounded-full hover:bg-[var(--color-surface-2)] -ml-1"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[var(--color-text)]">設定</h1>
        {/* 保存メッセージ */}
        {saveMessage && (
          <span className={`ml-auto text-sm font-medium animate-fadeIn ${saveMessage.includes('失敗') ? 'text-red-400' : 'text-green-400'}`}>
            {saveMessage}
          </span>
        )}
        {isSaving && !saveMessage && (
          <div className="ml-auto w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* テーマ設定 */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-muted)] flex items-center gap-2">
              <span>🎨</span> 表示テーマ
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSave({ theme: opt.value })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
                    settings.theme === opt.value
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:border-purple-500/40 hover:text-[var(--color-text)]'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                  {settings.theme === opt.value && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 通知設定 */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '60ms' }}>
          <div className="px-4 pt-4 pb-2 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-muted)] flex items-center gap-2">
              <span>🔔</span> 通知
            </h2>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">プッシュ通知</p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">キャラからのお知らせを受け取る</p>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                settings.notifications ? 'bg-purple-600' : 'bg-[var(--color-surface-2)]'
              }`}
              role="switch"
              aria-checked={settings.notifications}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* 言語設定 */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '120ms' }}>
          <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-muted)] flex items-center gap-2">
              <span>🌐</span> 言語設定
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSave({ language: opt.value })}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                    settings.language === opt.value
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-purple-500/40'
                  }`}
                >
                  <span className="text-xl">{opt.flag}</span>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${settings.language === opt.value ? 'text-purple-400' : 'text-[var(--color-text)]'}`}>
                      {opt.label}
                    </p>
                    {settings.language === opt.value && (
                      <p className="text-[10px] text-purple-400/70">選択中</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-3 text-center">
              ※ i18n対応は準備中です
            </p>
          </div>
        </section>

        {/* アカウント情報 */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '180ms' }}>
          <div className="px-4 pt-4 pb-2 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-muted)] flex items-center gap-2">
              <span>👤</span> アカウント
            </h2>
          </div>

          {/* メール */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div>
              <p className="text-xs text-[var(--color-muted)]">メールアドレス</p>
              <p className="text-sm font-medium text-[var(--color-text)] mt-0.5">{account?.email ?? '—'}</p>
            </div>
            <svg className="w-4 h-4 text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* プラン */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs text-[var(--color-muted)]">プラン</p>
              <p className="text-sm font-medium text-[var(--color-text)] mt-0.5">
                {planInfo.emoji} {planInfo.label}
              </p>
            </div>
            {account?.plan === 'FREE' && (
              <a
                href="/pricing"
                className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors hover:underline"
              >
                アップグレード →
              </a>
            )}
          </div>
        </section>

        {/* リンク */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '240ms' }}>
          {/* プライバシーポリシー・利用規約（準備中） */}
          {[
            { label: 'プライバシーポリシー', icon: '🔒' },
            { label: '利用規約', icon: '📄' },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className={`flex items-center justify-between px-4 py-3.5 opacity-50 ${
                i < arr.length - 1 ? 'border-b border-[var(--color-border)]' : ''
              }`}
            >
              <span className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
                <span>{item.icon}</span>
                {item.label}
              </span>
              <span className="text-[10px] text-[var(--color-muted)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-full">
                準備中
              </span>
            </div>
          ))}
        </section>

        {/* ログアウトボタン */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full py-3.5 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 hover:bg-red-900/40 hover:text-red-300 font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 animate-slide-up"
          style={{ animationDelay: '300ms' }}
        >
          {isSigningOut ? (
            <div className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          {isSigningOut ? 'ログアウト中...' : 'ログアウト'}
        </button>

        <p className="text-center text-xs text-[var(--color-muted)] opacity-40 pb-2">ANIVA v1.0.0</p>
      </div>
    </div>
  );
}
