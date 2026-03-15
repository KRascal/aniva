'use client';

import { useCallback, useEffect, useState } from 'react';

interface CalendarEvent {
  id: string;
  type: 'scenario' | 'gacha' | 'story';
  title?: string;
  name?: string;
  startsAt?: string;
  endsAt?: string;
  startAt?: string;
  endAt?: string;
  date?: string;
  isActive?: boolean;
  themeColor?: string | null;
  character?: { id: string; name: string } | null;
  chapterNumber?: number;
}

interface CalendarData {
  year: number;
  month: number;
  scenarios: CalendarEvent[];
  banners: CalendarEvent[];
  stories: CalendarEvent[];
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  scenario: { bg: 'rgba(124,58,237,0.25)', border: 'rgba(124,58,237,0.5)', text: '#c4b5fd', label: 'イベント' },
  gacha: { bg: 'rgba(251,146,60,0.25)', border: 'rgba(251,146,60,0.5)', text: '#fed7aa', label: 'ガチャ' },
  story: { bg: 'rgba(34,211,238,0.2)', border: 'rgba(34,211,238,0.4)', text: '#a5f3fc', label: 'ストーリー' },
};

function getEventStart(e: CalendarEvent): Date {
  const s = e.startsAt ?? e.startAt ?? e.date ?? '';
  return new Date(s);
}

function getEventEnd(e: CalendarEvent): Date | null {
  const s = e.endsAt ?? e.endAt;
  return s ? new Date(s) : null;
}

function getEventTitle(e: CalendarEvent): string {
  const base = e.title ?? e.name ?? '(無題)';
  if (e.type === 'story') return `Ch.${e.chapterNumber} ${base}`;
  return base;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/calendar?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Failed');
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  // 0=Sun…6=Sat, shift to Mon=0
  const startDow = (firstDay.getDay() + 6) % 7;

  const allEvents: CalendarEvent[] = data
    ? [...data.scenarios, ...data.banners, ...data.stories]
    : [];

  // Get events for a day (range-spanning or point)
  function getEventsForDay(day: number): CalendarEvent[] {
    const date = new Date(year, month - 1, day);
    const dateStr = date.toDateString();
    return allEvents.filter((e) => {
      const start = getEventStart(e);
      const end = getEventEnd(e);
      if (end) {
        // range event
        return start <= new Date(year, month - 1, day, 23, 59, 59) && end >= date;
      } else {
        // point event
        return start.toDateString() === dateStr;
      }
    });
  }

  // Check if event starts on this day (for band rendering)
  function eventStartsOn(e: CalendarEvent, day: number): boolean {
    const start = getEventStart(e);
    // Clamp to month start
    const clampedStart = start < firstDay ? firstDay : start;
    return clampedStart.getDate() === day &&
      clampedStart.getMonth() === month - 1 &&
      clampedStart.getFullYear() === year;
  }

  // Calculate band width in days from the visible start
  function eventBandLength(e: CalendarEvent, day: number): number {
    const end = getEventEnd(e);
    if (!end) return 1;
    const clampedEnd = end > lastDay ? lastDay : end;
    const clampedStart = getEventStart(e) < firstDay
      ? firstDay
      : getEventStart(e);
    const startDay = clampedStart.getDate();
    const endDay = clampedEnd.getDate();
    return Math.max(1, endDay - startDay + 1);
  }

  const WEEK_DAYS = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">コンテンツカレンダー</h1>
          <p className="text-gray-500 text-sm mt-1">イベント・ガチャ・ストーリー公開スケジュール</p>
        </div>
        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="text-white font-bold text-lg min-w-[8rem] text-center">
            {year}年 {month}月
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
            className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            今月
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(TYPE_STYLES).map(([type, style]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: style.bg, border: `1px solid ${style.border}` }} />
            <span className="text-xs text-gray-500">{style.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Weekday headers */}
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(255,255,255,0.03)' }}
          >
            {WEEK_DAYS.map((d, i) => (
              <div
                key={d}
                className="text-center text-xs font-semibold py-3"
                style={{
                  color: i === 5 ? '#60a5fa' : i === 6 ? '#f87171' : '#6b7280',
                  borderRight: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
          >
            {/* Empty cells before month start */}
            {Array.from({ length: startDow }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  minHeight: 100,
                  background: 'rgba(255,255,255,0.01)',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map((day) => {
              const isToday =
                day === now.getDate() &&
                month === now.getMonth() + 1 &&
                year === now.getFullYear();
              const dow = (startDow + day - 1) % 7;
              const eventsThisDay = getEventsForDay(day);
              const startingEvents = eventsThisDay.filter((e) => eventStartsOn(e, day));

              return (
                <div
                  key={day}
                  className="p-1.5 relative"
                  style={{
                    minHeight: 100,
                    background: isToday ? 'rgba(124,58,237,0.06)' : 'transparent',
                    borderRight: dow < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Day number */}
                  <div
                    className={`text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'text-white' : dow === 5 ? 'text-blue-400' : dow === 6 ? 'text-red-400' : 'text-gray-400'
                    }`}
                    style={isToday ? { background: '#7c3aed' } : {}}
                  >
                    {day}
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {/* Show range-starting events as bands */}
                    {startingEvents.map((e) => {
                      const style = TYPE_STYLES[e.type];
                      const len = eventBandLength(e, day);
                      // Remaining days until end of week from this day position
                      const posInWeek = dow;
                      const daysToEndOfWeek = 7 - posInWeek;
                      const bandDays = Math.min(len, daysToEndOfWeek);

                      return (
                        <div
                          key={e.id}
                          title={getEventTitle(e)}
                          className="text-xs px-1.5 py-0.5 rounded font-medium truncate"
                          style={{
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            color: style.text,
                            // Approximate band: we can't do true CSS spanning without absolute pos,
                            // so show a colored indicator
                          }}
                        >
                          {bandDays > 1 && <span className="mr-1 opacity-60">{'←'.repeat(0)}{'▶'}</span>}
                          {getEventTitle(e)}
                        </div>
                      );
                    })}

                    {/* Show continuation events (not starting today) */}
                    {eventsThisDay
                      .filter((e) => !eventStartsOn(e, day) && getEventEnd(e) !== null)
                      .map((e) => {
                        const style = TYPE_STYLES[e.type];
                        return (
                          <div
                            key={e.id + '-cont'}
                            title={getEventTitle(e) + ' (継続中)'}
                            className="text-xs px-1.5 py-0.5 rounded truncate opacity-60"
                            style={{
                              background: style.bg,
                              borderLeft: `3px solid ${style.border}`,
                              color: style.text,
                            }}
                          >
                            ⋯
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event list for the month */}
      {data && (
        <div className="grid md:grid-cols-3 gap-4">
          {(['scenarios', 'banners', 'stories'] as const).map((key) => {
            const events = data[key] as CalendarEvent[];
            const typeKey = key === 'scenarios' ? 'scenario' : key === 'banners' ? 'gacha' : 'story';
            const style = TYPE_STYLES[typeKey];
            if (events.length === 0) return null;
            return (
              <div
                key={key}
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: style.text }}>
                  {style.label} ({events.length})
                </h3>
                <div className="space-y-2">
                  {events.map((e) => {
                    const start = getEventStart(e);
                    const end = getEventEnd(e);
                    return (
                      <div key={e.id} className="text-sm">
                        <div className="text-gray-200 font-medium truncate">{getEventTitle(e)}</div>
                        {e.character && (
                          <div className="text-xs text-gray-500">{e.character.name}</div>
                        )}
                        <div className="text-xs text-gray-600">
                          {start.toLocaleDateString('ja-JP')}
                          {end && ` 〜 ${end.toLocaleDateString('ja-JP')}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
