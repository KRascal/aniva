'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EventsData {
  date: string;
  todayEvents: string[];
  birthdayCharacters: { id: string; name: string; slug: string; avatarUrl: string | null; franchise: string }[];
  upcomingBirthdays: { id: string; name: string; slug: string; avatarUrl: string | null; birthday: string | null; daysUntil: number }[];
}

const DAY_JP = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_JP[d.getDay()];
  return `${m}月${day}日（${dow}）`;
}

export default function EventsPage() {
  const router = useRouter();
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/explore');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} className="text-gray-400 hover:text-white transition-colors p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-bold text-white">イベント</h1>
          {data && <p className="text-xs text-gray-500">{formatDate(data.date)}</p>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* 今日の記念日 */}
        <section>
          <h2 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <span>🎌</span> 今日の記念日
          </h2>
          {data?.todayEvents && data.todayEvents.length > 0 ? (
            <div className="space-y-2">
              {data.todayEvents.map((event, i) => (
                <div key={i} className="bg-gray-900/70 border border-white/6 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">🎎</span>
                  <span className="text-white text-sm font-medium">{event}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-white/5 rounded-2xl px-4 py-4 text-center text-gray-500 text-sm">
              今日は特別な記念日はないみたい
            </div>
          )}
        </section>

        {/* 今日の誕生日キャラ */}
        {data?.birthdayCharacters && data.birthdayCharacters.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-pink-400 mb-3 flex items-center gap-2">
              <span>🎂</span> 今日が誕生日のキャラ
            </h2>
            <div className="space-y-3">
              {data.birthdayCharacters.map((char) => (
                <Link
                  key={char.id}
                  href={`/c/${char.slug}`}
                  className="flex items-center gap-4 bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/20 rounded-2xl px-4 py-3 hover:border-pink-500/40 transition-all"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-pink-500/50">
                      {char.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {char.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-lg">🎂</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">{char.name}</p>
                    <p className="text-pink-400 text-xs">今日が誕生日🎉 お祝いのメッセージを送ろう！</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* もうすぐ誕生日のキャラ */}
        {data?.upcomingBirthdays && data.upcomingBirthdays.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <span>🎁</span> もうすぐ誕生日
            </h2>
            <div className="space-y-2">
              {data.upcomingBirthdays.map((char) => (
                <Link
                  key={char.id}
                  href={`/c/${char.slug}`}
                  className="flex items-center gap-3 bg-gray-900/60 border border-white/6 rounded-2xl px-4 py-3 hover:border-white/12 transition-all"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {char.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                        {char.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{char.name}</p>
                    <p className="text-yellow-500 text-xs">あと{char.daysUntil}日で誕生日🎂</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 誕生日も記念日もない場合 */}
        {data?.birthdayCharacters?.length === 0 && data?.upcomingBirthdays?.length === 0 && (
          <section>
            <div className="bg-gray-900/50 border border-white/5 rounded-2xl px-4 py-6 text-center space-y-2">
              <p className="text-3xl">⚓</p>
              <p className="text-gray-400 text-sm">今週は誕生日キャラなし</p>
              <p className="text-gray-600 text-xs">いつもキャラたちとのつながりを大切にしよう</p>
            </div>
          </section>
        )}

        {/* 探索ボタン */}
        <section>
          <Link
            href="/explore"
            className="block w-full text-center bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-2xl px-4 py-3 text-sm font-medium hover:bg-purple-600/30 transition-all"
          >
            キャラクターを探す →
          </Link>
        </section>
      </div>
    </div>
  );
}
