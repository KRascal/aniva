'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// ThemeToggle: ダークモード固定のため非表示
import { CoinBalanceDisplay } from '@/components/CoinBalance';
import DailyMissionsCard from '@/components/missions/DailyMissionsCard';
import BondCalendar from '@/components/BondCalendar';

/* ── Achievement definitions ── */
interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'rainbow';
  check: (data: AchievementInput) => boolean;
}

interface AchievementInput {
  totalMessages: number;
  followingCount: number;
  maxLevel: number;
  characterCount: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_chat',    icon: '💬', title: '初めてのチャット',    desc: 'キャラに初めてメッセージを送った',         rarity: 'bronze',  check: d => d.totalMessages >= 1 },
  { id: 'chat_50',       icon: '🗣️', title: 'おしゃべり好き',      desc: 'メッセージ累計50通以上',                  rarity: 'bronze',  check: d => d.totalMessages >= 50 },
  { id: 'chat_200',      icon: '🔥', title: 'チャット常連',        desc: 'メッセージ累計200通以上',                 rarity: 'silver',  check: d => d.totalMessages >= 200 },
  { id: 'chat_1000',     icon: '⚡', title: 'チャット廃人',        desc: 'メッセージ累計1000通以上',                rarity: 'gold',    check: d => d.totalMessages >= 1000 },
  { id: 'first_follow',  icon: '🤝', title: '初めてのナカマ',      desc: '初めてキャラをフォローした',               rarity: 'bronze',  check: d => d.followingCount >= 1 },
  { id: 'follow_5',      icon: '⚓', title: '仲間大好き',         desc: '5キャラ以上フォロー中',                   rarity: 'silver',  check: d => d.followingCount >= 5 },
  { id: 'follow_10',     icon: '🏴‍☠️', title: '大船長',           desc: '10キャラ以上フォロー中',                  rarity: 'gold',    check: d => d.followingCount >= 10 },
  { id: 'bond_lv3',      icon: '💜', title: '深まる絆',           desc: 'キャラとの絆Lv.3以上',                   rarity: 'bronze',  check: d => d.maxLevel >= 3 },
  { id: 'bond_lv5',      icon: '💎', title: '心の友',             desc: 'キャラとの絆Lv.5以上',                   rarity: 'silver',  check: d => d.maxLevel >= 5 },
  { id: 'bond_lv10',     icon: '👑', title: '永遠の仲間',          desc: 'キャラとの絆Lv.10以上',                  rarity: 'gold',    check: d => d.maxLevel >= 10 },
  { id: 'multi_char',    icon: '🌊', title: '多キャラ愛',         desc: '3キャラ以上とチャット経験あり',            rarity: 'silver',  check: d => d.characterCount >= 3 },
  { id: 'collector',     icon: '🌟', title: 'コレクター',         desc: '10キャラ以上とチャット経験あり',           rarity: 'gold',    check: d => d.characterCount >= 10 },
];

const RARITY_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  bronze:  { bg: 'bg-amber-900/30',   border: 'border-amber-700/50',   text: 'text-amber-400',   glow: '' },
  silver:  { bg: 'bg-gray-700/40',    border: 'border-gray-500/60',    text: 'text-gray-200',    glow: '' },
  gold:    { bg: 'bg-yellow-900/40',  border: 'border-yellow-500/60',  text: 'text-yellow-300',  glow: 'shadow-yellow-500/20 shadow-md' },
  rainbow: { bg: 'bg-purple-900/40',  border: 'border-pink-400/60',    text: 'text-pink-300',    glow: 'shadow-pink-500/30 shadow-md' },
};

interface UserInfo {
  id: string;
  email: string;
  displayName: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  profilePublic: boolean;
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

/* ── (AvatarUrlDialog は削除 → ファイルアップロードに変更) ── */

export default function MyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [following, setFollowing] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<RelationshipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // プロフィール編集状態
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editProfilePublic, setEditProfilePublic] = useState(true);
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ブックマーク
  interface BookmarkedMessage {
    id: string;
    characterId: string;
    characterName: string;
    avatarUrl: string | null;
    content: string;
    savedAt: number;
  }
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>([]);
  const [showAllBookmarks, setShowAllBookmarks] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aniva_bookmarks');
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    try { localStorage.setItem('aniva_bookmarks', JSON.stringify(updated)); } catch {}
  };

  // 称号バッジ計算
  const unlockedAchievements = useMemo(() => {
    const totalMessages = relationships.reduce((sum, r) => sum + r.totalMessages, 0);
    const followingCount = following.length;
    const maxLevel = relationships.reduce((max, r) => Math.max(max, r.level), 0);
    const characterCount = relationships.filter(r => r.totalMessages > 0).length;
    const input: AchievementInput = { totalMessages, followingCount, maxLevel, characterCount };
    return ACHIEVEMENTS.filter(a => a.check(input));
  }, [relationships, following]);
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
          setEditDisplayName(userData.displayName ?? '');
          setEditNickname(userData.nickname ?? '');
          setEditBio(userData.bio ?? '');
          setEditProfilePublic(userData.profilePublic ?? true);
          setEditAvatarUrl(userData.avatarUrl ?? '');
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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarUploadError('画像サイズは5MB以下にしてください');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarUploadError('JPG・PNG・GIF・WebPのみ対応しています');
      return;
    }
    setAvatarUploadError(null);
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json() as { avatarUrl: string };
        setEditAvatarUrl(data.avatarUrl);
        setUser(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev);
      } else {
        const err = await res.json() as { error?: string };
        setAvatarUploadError(err.error ?? 'アップロードに失敗しました');
      }
    } catch {
      setAvatarUploadError('通信エラーが発生しました');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editDisplayName.trim() || null,
          nickname: editNickname.trim() || null,
          avatarUrl: editAvatarUrl.trim() || null,
          bio: editBio.trim() || null,
          profilePublic: editProfilePublic,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
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
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
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
  const displayName = user?.nickname || user?.displayName || user?.email || 'ユーザー';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-gray-950 border-b border-white/8 px-4 py-3 flex items-center gap-3">
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
        <div className="ml-auto flex items-center gap-2">
          <CoinBalanceDisplay />
          <a
            href="/coins"
            className="flex items-center gap-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors"
            aria-label="コイン購入"
          >
            <span>＋</span>
            <span>購入</span>
          </a>
          {/* テーマ切替は現在ダークモード固定のため非表示 */}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* ユーザープロフィールカード（編集可能） */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-5 flex flex-col items-center gap-4">
          {/* アバター（タップでファイルアップロード） */}
          <div className="relative">
            {/* 隠しファイル入力 */}
            <input
              ref={avatarFileInputRef}
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
              aria-hidden="true"
            />
            <label
              htmlFor="avatar-upload"
              className="relative group cursor-pointer block"
              aria-label="プロフィール画像を変更"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg ring-2 ring-purple-500/30 group-hover:ring-purple-500/60 transition-all">
                {isUploadingAvatar ? (
                  <div className="w-8 h-8 rounded-full border-3 border-white border-t-transparent animate-spin" style={{ borderWidth: '3px' }} />
                ) : editAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editAvatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setEditAvatarUrl('')} />
                ) : (
                  avatarLetter
                )}
              </div>
              {/* カメラアイコンオーバーレイ */}
              {!isUploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-purple-600 border-2 border-gray-900 flex items-center justify-center pointer-events-none">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </span>
            </label>
            {/* アップロードエラー */}
            {avatarUploadError && (
              <p className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs text-red-400 whitespace-nowrap bg-gray-900 px-2 py-1 rounded-lg border border-red-500/30">
                {avatarUploadError}
              </p>
            )}
          </div>

          {/* プロフィール編集フォーム */}
          <div className="w-full space-y-4">
            {/* 表示名 */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">表示名</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                maxLength={30}
                placeholder="表示名を入力"
                className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>

            {/* ニックネーム */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                ニックネーム <span className="text-gray-600">（キャラがこの名前で呼びます）</span>
              </label>
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                maxLength={30}
                placeholder="キャラに呼ばれる名前"
                className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>

            {/* 自己紹介 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400 font-medium">自己紹介</label>
                <span className="text-xs text-gray-600">{editBio.length}/200</span>
              </div>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                placeholder="自分について一言（200文字以内）"
                className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-purple-500/60 transition-colors resize-none"
              />
            </div>

            {/* 公開設定 */}
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <div>
                <p className="text-sm text-white font-medium">プロフィールを公開する</p>
                <p className="text-xs text-gray-500">ONにすると他のユーザーがあなたのプロフィールを見られます</p>
              </div>
              <button
                onClick={() => setEditProfilePublic(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${
                  editProfilePublic ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    editProfilePublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 保存ボタン */}
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                saveSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60'
              }`}
            >
              {isSaving ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : saveSuccess ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  保存しました
                </>
              ) : (
                '保存する'
              )}
            </button>

            {/* メール・プラン表示 */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-600">{user?.email}</p>
              {plan !== 'FREE' && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${planInfo.bg}`}>
                  <span className={`text-xs font-bold ${planInfo.color}`}>{planInfo.label} プラン</span>
                </div>
              )}
            </div>

            {/* 公開プロフィールへのリンク */}
            {user?.id && editProfilePublic && (
              <a
                href={`/user/${user.id}`}
                className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors justify-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                公開プロフィールを見る
              </a>
            )}
          </div>
        </section>

        {/* ファンクラブ加入中 */}
        {following.filter(c => c.isFanclub).length > 0 && (
          <section className="bg-gray-900/80 border border-purple-500/20 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 001 1h8a1 1 0 001-1v-1H7v1z"/>
              </svg>
              ファンクラブ加入中
            </h3>
            <div className="space-y-2">
              {following.filter(c => c.isFanclub).map((char) => (
                <a
                  key={char.id}
                  href={`/profile/${char.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/30">
                    {char.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white">
                        {char.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{char.name}</p>
                    <p className="text-xs text-gray-500 truncate">{char.franchise}</p>
                  </div>
                  <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">FC加入中</span>
                  <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* フォロー中のキャラ一覧 */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            フォロー中のキャラ
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
                  href={`/profile/${char.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                    {char.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white">
                        {char.name.charAt(0)}
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
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              絆レベル
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

        {/* 称号バッジ */}
        {unlockedAchievements.length > 0 && (
          <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400">🏅 称号・実績</h3>
              <span className="text-xs text-purple-400">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unlockedAchievements.map(a => {
                const s = RARITY_STYLES[a.rarity];
                return (
                  <div
                    key={a.id}
                    title={a.desc}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${s.bg} ${s.border} ${s.text} ${s.glow}`}
                  >
                    <span>{a.icon}</span>
                    <span>{a.title}</span>
                  </div>
                );
              })}
            </div>
            {unlockedAchievements.length < ACHIEVEMENTS.length && (
              <p className="text-xs text-gray-600 mt-2">
                あと{ACHIEVEMENTS.length - unlockedAchievements.length}個の称号がロック中… 🔒
              </p>
            )}
          </section>
        )}

        {/* 絆カレンダー */}
        <BondCalendar />

        {/* デイリーミッション */}
        <div id="daily-missions">
          <DailyMissionsCard />
        </div>

        {/* ブックマーク */}
        {bookmarks.length > 0 && (
          <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400">🔖 お気に入りメッセージ</h3>
              <span className="text-xs text-purple-400">{bookmarks.length}件</span>
            </div>
            <div className="flex flex-col gap-2">
              {(showAllBookmarks ? bookmarks : bookmarks.slice(0, 3)).map(b => (
                <div key={b.id} className="flex items-start gap-2 bg-gray-800/60 rounded-xl px-3 py-2.5 group">
                  {b.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.avatarUrl} alt={b.characterName} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      🏴
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-purple-400 font-medium mb-0.5">{b.characterName}</p>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{b.content}</p>
                  </div>
                  <button
                    onClick={() => removeBookmark(b.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 text-sm flex-shrink-0 mt-0.5"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {bookmarks.length > 3 && (
              <button
                onClick={() => setShowAllBookmarks(v => !v)}
                className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {showAllBookmarks ? '折りたたむ ▲' : `さらに${bookmarks.length - 3}件表示 ▼`}
              </button>
            )}
          </section>
        )}

        {/* 特典コンテンツ */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-400 px-4 pt-4 pb-2">
            特典コンテンツ
          </h3>
          <a
            href="/gacha"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-500/20 to-pink-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white">ガチャ</p>
                <p className="text-xs text-gray-500">キャラカードをゲット</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/collection"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white">カードコレクション</p>
                <p className="text-xs text-gray-500">ガチャで集めたカード図鑑</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/letters"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white">キャラからのお手紙</p>
                <p className="text-xs text-gray-500">月1通、特別なメッセージ</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/story"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white">ストーリー</p>
                <p className="text-xs text-gray-500">キャラとの秘密の物語</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/polls"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white">投票・アンケート</p>
                <p className="text-xs text-gray-500">キャラの行動を決める投票</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/events"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white">イベント・記念日</p>
                <p className="text-xs text-gray-500">今日の記念日・誕生日</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/ranking"
            className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white">ランキング</p>
                <p className="text-xs text-gray-500">人気キャラ・ファンランク</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </section>

        {/* 設定 */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-400 px-4 pt-4 pb-2">
            設定
          </h3>

          {/* 設定ページへのリンク */}
          <a
            href="/mypage/settings"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">アプリ設定</p>
              <p className="text-xs text-gray-500">テーマ・通知・言語など</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

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

          {/* プライバシーポリシー */}
          <a
            href="/privacy"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <p className="text-sm text-white">プライバシーポリシー</p>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* 利用規約 */}
          <a
            href="/terms"
            className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <p className="text-sm text-white">利用規約</p>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
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
