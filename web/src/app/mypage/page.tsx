'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// ThemeToggle: ダークモード固定のため非表示
import { CoinBalanceDisplay } from '@/components/CoinBalance';
import DailyMissionsCard from '@/components/missions/DailyMissionsCard';
import BondCalendar from '@/components/BondCalendar';
import { useCoinPurchase } from '@/components/coins/CoinPurchaseContext';
import AchievementsSection from '@/components/mypage/AchievementsSection';
import BookmarkSection from '@/components/mypage/BookmarkSection';
import { useTranslations } from 'next-intl';

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
  const { openCoinPurchase } = useCoinPurchase();
  const t = useTranslations('profile');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tLegal = useTranslations('legal');

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


  const [isSigningOut, setIsSigningOut] = useState(false);

  // bfcache / Stripe戻り対策: ページ復元時にフルリロード
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

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
        setAvatarUploadError(err.error ?? tCommon('uploadFailed'));
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
      alert(t('pushNotSupported'));
      return;
    }
    if (Notification.permission === 'denied') {
      alert(t('pushDenied'));
      return;
    }
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    } else {
      alert(t('pushTurnOffNote'));
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">{tCommon('loading')}</p>
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
          aria-label={tCommon('back')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">{t('pageTitle')}</h1>
        <div className="ml-auto flex items-center gap-2">
          <CoinBalanceDisplay />
          {/* 購入ボタン削除 — CoinBalanceDisplayのタップでポップアップ起動 */}
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
            <div
              role="button"
              tabIndex={0}
              className="relative group cursor-pointer block touch-manipulation"
              aria-label="プロフィール画像を変更"
              onClick={(e) => { e.preventDefault(); avatarFileInputRef.current?.click(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') avatarFileInputRef.current?.click(); }}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg ring-2 ring-purple-500/30 group-hover:ring-purple-500/60 transition-all">
                {isUploadingAvatar ? (
                  <div className="w-8 h-8 rounded-full border-3 border-white border-t-transparent animate-spin" style={{ borderWidth: '3px' }} />
                ) : editAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editAvatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => {
                    // 旧パス(/uploads/...)が404の場合、API経由(/api/uploads/...)にフォールバック
                    if (editAvatarUrl.startsWith('/uploads/')) {
                      setEditAvatarUrl(editAvatarUrl.replace('/uploads/', '/api/uploads/'));
                    } else if (editAvatarUrl.includes('/api/uploads/') && !editAvatarUrl.includes('?')) {
                      // キャッシュバスト: タイムスタンプ追加で再取得
                      setEditAvatarUrl(`${editAvatarUrl}?t=${Date.now()}`);
                    } else {
                      setEditAvatarUrl('');
                    }
                  }} />
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
            </div>
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
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">{t('displayName')}</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                maxLength={30}
                placeholder={t('displayNamePlaceholder')}
                className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>

            {/* ニックネーム */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                {t('nickname')} <span className="text-gray-600">{t('nicknameSub')}</span>
              </label>
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                maxLength={30}
                placeholder={t('nicknamePlaceholder')}
                className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>

            {/* 自己紹介 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400 font-medium">{t('bio')}</label>
                <span className="text-xs text-gray-600">{editBio.length}/200</span>
              </div>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                placeholder={t('bioPlaceholder')}
                className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-purple-500/60 transition-colors resize-none"
              />
            </div>

            {/* 公開設定 */}
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <div>
                <p className="text-sm text-white font-medium">{t('profilePublicLabel')}</p>
                <p className="text-xs text-gray-500">{t('profilePublicDesc')}</p>
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
                  {t('saveSuccess')}
                </>
              ) : (
                t('saveProfile')
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
                {t('viewPublicProfile')}
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
              {t('fanclubSection')}
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
                  <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">{t('fcBadge')}</span>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400">{t('followingSection')}</h3>
            {following.length > 0 && (
              <span className="text-xs text-purple-400 font-bold">{following.length}人</span>
            )}
          </div>
          {following.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💫</span>
              </div>
              <p className="text-gray-500 text-sm mb-1">{t('noFollowingText')}</p>
              <a href="/explore" className="text-purple-400 text-xs hover:underline">{t('findChara')}</a>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {following.map((char) => {
                const rel = relationships.find(r => r.characterId === char.id);
                return (
                  <a
                    key={char.id}
                    href={`/profile/${char.id}`}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                      {char.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover group-active:scale-95 transition-transform" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg font-black text-white">
                          {char.name.charAt(0)}
                        </div>
                      )}
                      {/* FCバッジ */}
                      {char.isFanclub && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[8px] font-black text-gray-900">FC</div>
                      )}
                      {/* オンラインドット */}
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-green-400 border border-gray-900 animate-pulse" />
                    </div>
                    <p className="text-white/70 text-[10px] font-medium truncate w-full text-center">{char.name}</p>
                    {rel && (
                      <p className="text-purple-400/60 text-[9px]">Lv.{rel.level}</p>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* 絆レベルサマリー */}
        {relationships.length > 0 && (
          <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              {t('bondLevelSection')}
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
                    <p className="text-[10px] text-gray-600 mt-0.5">{t('totalMessages', { count: rel.totalMessages })}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 称号バッジ */}
        <AchievementsSection relationships={relationships} followingCount={following.length} />

        {/* 絆カレンダー */}
        <BondCalendar />

        {/* デイリーミッション */}
        <div id="daily-missions">
          <DailyMissionsCard />
        </div>

        {/* ブックマーク */}
        <BookmarkSection />

        {/* 特典コンテンツ */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-400 px-4 pt-4 pb-2">
            {t('benefitsSection')}
          </h3>
          {/* ガチャ・コレクションはカードタブに統一済み */}
          <a
            href="/shop"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">ショップ</p>
              <p className="text-xs text-gray-500">限定コンテンツ</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/letters"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">{t('letters')}</p>
              <p className="text-xs text-gray-500">{t('lettersSub')}</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/story"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">{t('storiesLabel')}</p>
              <p className="text-xs text-gray-500">{t('storiesSub')}</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/polls"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">{t('pollsLabel')}</p>
              <p className="text-xs text-gray-500">{t('pollsSub')}</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/events"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">{t('eventsLabel')}</p>
              <p className="text-xs text-gray-500">{t('eventsSub')}</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/ranking"
            className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">{t('rankingLabel')}</p>
              <p className="text-xs text-gray-500">{t('rankingSub')}</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </section>

        {/* 設定 */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-400 px-4 pt-4 pb-2">
            {t('settingsSection')}
          </h3>

          {/* 設定ページへのリンク */}
          <a
            href="/mypage/settings"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">{t('appSettings')}</p>
              <p className="text-xs text-gray-500">{t('appSettingsSub')}</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* 通知設定 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div>
              <p className="text-sm text-white">{t('pushNotificationLabel')}</p>
              <p className="text-xs text-gray-500">{t('pushNotificationDesc')}</p>
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

          {/* コイン経済について */}
          <a
            href="/mypage/coin-guide"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm text-white">コイン経済について</p>
              <p className="text-xs text-gray-500">消費・獲得・購入の仕組み</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* プライバシーポリシー */}
          <a
            href="/privacy"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <p className="text-sm text-white">{tLegal('privacy')}</p>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* 利用規約 */}
          <a
            href="/terms"
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <p className="text-sm text-white">{tLegal('terms')}</p>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* 特定商取引法に基づく表記 */}
          <a
            href="/legal/tokushoho"
            className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <p className="text-sm text-white">{tLegal('tokushoho')}</p>
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
          {isSigningOut ? t('loggingOut') : tAuth('logout')}
        </button>

        {/* バージョン情報 */}
        <p className="text-center text-xs text-gray-700 pb-2">{t('version')}</p>
      </div>

    </div>
  );
}
