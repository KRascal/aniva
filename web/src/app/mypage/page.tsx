'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: string;
  email: string;
  displayName: string | null;
  plan: string;
}

interface Character {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  isFanclub?: boolean;
}

interface RelationshipData {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  character: { name: string; slug: string };
}

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  FREE:     { label: 'Free',     color: 'text-gray-300',  bg: 'bg-gray-700/60' },
  STANDARD: { label: 'Standard', color: 'text-blue-300',  bg: 'bg-blue-900/40' },
  PREMIUM:  { label: 'Premium',  color: 'text-purple-300', bg: 'bg-purple-900/40' },
};

export default function MyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [following, setFollowing] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<RelationshipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    Promise.all([
      fetch('/api/users/me').then((r) => r.json()),
      fetch('/api/relationship/following').then((r) => r.json()),
      fetch('/api/relationship/all').then((r) => r.json()),
    ])
      .then(([userData, followingData, relData]) => {
        if (userData && !userData.error) {
          setUser(userData);
          setEditName(userData.displayName ?? userData.email ?? '');
        }
        if (followingData?.following) setFollowing(followingData.following);
        if (relData?.relationships) setRelationships(relData.relationships);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    // 通知権限チェック
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, [status]);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    try {
      // displayName更新（現時点ではAPIがない場合はローカルのみ反映）
      setUser((prev) => prev ? { ...prev, displayName: editName.trim() } : prev);
      setIsEditingName(false);
    } catch (e) {
      console.error(e);
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
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    } else {
      // OFF にする（ブラウザ側での解除は設定から行う旨を伝える）
      alert('通知をOFFにするにはブラウザの設定から変更してください');
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  const plan = user?.plan ?? 'FREE';
  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.FREE;
  const displayName = user?.displayName || user?.email || 'ユーザー';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* ヘッダー */}
      <header className="bg-black/60 backdrop-blur-md border-b border-white/8 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800 -ml-1"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">マイページ</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* ユーザープロフィールカード */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-5 flex flex-col items-center gap-4">
          {/* アバター */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
            {avatarLetter}
          </div>

          {/* 表示名（編集可能） */}
          {isEditingName ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="w-full bg-gray-800 text-white text-center rounded-xl px-3 py-2 border border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveName}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-medium transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => { setIsEditingName(false); setEditName(user?.displayName ?? user?.email ?? ''); }}
                  className="px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{displayName}</h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-gray-500 hover:text-purple-400 transition-colors"
                  aria-label="名前を編集"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          )}

          {/* プランバッジ */}
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${planInfo.bg}`}>
            <span className="text-base">
              {plan === 'PREMIUM' ? '👑' : plan === 'STANDARD' ? '⭐' : '🆓'}
            </span>
            <span className={`text-sm font-bold ${planInfo.color}`}>{planInfo.label} プラン</span>
            {plan === 'FREE' && (
              <a
                href="/pricing"
                className="ml-2 text-xs text-purple-400 hover:text-purple-300 hover:underline transition-colors"
              >
                アップグレード →
              </a>
            )}
          </div>
        </section>

        {/* フォロー中のキャラ一覧 */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <span>💕</span> フォロー中のキャラ
          </h3>
          {following.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-600 text-sm">まだフォローしていません</p>
              <a href="/chat" className="text-purple-400 text-xs hover:underline mt-1 block">
                キャラを探す →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {following.map((char) => (
                <a
                  key={char.id}
                  href={`/chat/${char.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                    {char.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg">
                        🏴‍☠️
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{char.name}</p>
                    <p className="text-xs text-gray-500 truncate">{char.franchise}</p>
                  </div>
                  {char.isFanclub && (
                    <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full">ファン</span>
                  )}
                  <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* 絆レベルサマリー */}
        {relationships.length > 0 && (
          <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <span>🔮</span> 絆レベル
            </h3>
            <div className="space-y-3">
              {relationships.map((rel) => (
                <div key={rel.characterId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white font-medium truncate">{rel.character.name}</span>
                      <span className="text-xs text-purple-400 ml-2 flex-shrink-0">Lv.{rel.level} {rel.levelName}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (rel.xp / 100) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">通算{rel.totalMessages}通</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 設定 */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-400 px-4 pt-4 pb-2 flex items-center gap-2">
            <span>⚙️</span> 設定
          </h3>

          {/* 通知設定 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div>
              <p className="text-sm text-white">プッシュ通知</p>
              <p className="text-xs text-gray-500">キャラからのお知らせ</p>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* プライバシー */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div>
              <p className="text-sm text-white">プライバシーポリシー</p>
            </div>
            <a href="/privacy" className="text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* 利用規約 */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm text-white">利用規約</p>
            </div>
            <a href="/terms" className="text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </section>

        {/* ログアウトボタン */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full py-3 rounded-xl bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 hover:text-red-300 font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* バージョン情報 */}
        <p className="text-center text-xs text-gray-700 pb-2">ANIVA v1.0.0</p>
      </div>
    </div>
  );
}
