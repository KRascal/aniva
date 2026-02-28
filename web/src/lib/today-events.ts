/**
 * today-events.ts
 * 日本の記念日・季節イベント・曜日ネタのデータベース
 * getTodayEvents() で今日の記念日リストを返す
 */

export interface DayEvent {
  /** 表示名 */
  name: string;
  /** キャラが使いやすい短縮表現（例: "ラーメンの日"） */
  short: string;
  /** 盛り上がり度 1-3 */
  hype: 1 | 2 | 3;
}

// ─── 固定記念日 (月/日) ──────────────────────────────────────────
const FIXED_EVENTS: Record<string, DayEvent[]> = {
  '1/1':  [{ name: '元日・お正月', short: '元日', hype: 3 }],
  '1/7':  [{ name: '七草粥の日', short: '七草の日', hype: 1 }],
  '1/11': [{ name: '鏡開き', short: '鏡開き', hype: 2 }],
  '1/17': [{ name: '防災とボランティアの日', short: '防災の日', hype: 1 }],
  '1/25': [{ name: '中華まんの日', short: '中華まんの日', hype: 2 }],
  '2/3':  [{ name: '節分', short: '節分', hype: 3 }],
  '2/4':  [{ name: '立春', short: '立春', hype: 2 }],
  '2/11': [{ name: '建国記念の日', short: '建国記念日', hype: 1 }],
  '2/14': [{ name: 'バレンタインデー', short: 'バレンタイン', hype: 3 }],
  '2/22': [{ name: '猫の日（ニャンニャンニャン）', short: '猫の日', hype: 3 }],
  '3/3':  [{ name: 'ひな祭り・桃の節句', short: 'ひな祭り', hype: 3 }],
  '3/8':  [{ name: '国際女性デー', short: '国際女性デー', hype: 2 }],
  '3/14': [{ name: 'ホワイトデー', short: 'ホワイトデー', hype: 3 }],
  '3/20': [{ name: '春分の日', short: '春分', hype: 2 }],
  '3/31': [{ name: '年度末', short: '年度末', hype: 2 }],
  '4/1':  [{ name: 'エイプリルフール・新年度スタート', short: 'エイプリルフール', hype: 3 }],
  '4/8':  [{ name: '花まつり（お釈迦様の誕生日）', short: '花まつり', hype: 1 }],
  '4/22': [{ name: 'アースデー（地球の日）', short: 'アースデー', hype: 2 }],
  '4/29': [{ name: '昭和の日・GW突入', short: '昭和の日', hype: 2 }],
  '5/3':  [{ name: '憲法記念日', short: '憲法記念日', hype: 1 }],
  '5/4':  [{ name: 'みどりの日', short: 'みどりの日', hype: 1 }],
  '5/5':  [{ name: 'こどもの日・端午の節句', short: 'こどもの日', hype: 3 }],
  '5/9':  [{ name: 'アイスクリームの日', short: 'アイスの日', hype: 2 }],
  '5/18': [{ name: '国際博物館デー', short: '博物館の日', hype: 1 }],
  '5/31': [{ name: '世界禁煙デー', short: '禁煙の日', hype: 1 }],
  '6/1':  [{ name: '電波の日・気象記念日', short: '電波の日', hype: 1 }],
  '6/5':  [{ name: '世界環境デー', short: '環境の日', hype: 2 }],
  '6/16': [{ name: '和菓子の日', short: '和菓子の日', hype: 2 }],
  '6/21': [{ name: '夏至', short: '夏至', hype: 2 }],
  '7/1':  [{ name: '富士山の日・海開き', short: '富士山の日', hype: 2 }],
  '7/4':  [{ name: 'アメリカ独立記念日', short: 'アメリカ独立記念日', hype: 1 }],
  '7/7':  [{ name: '七夕', short: '七夕', hype: 3 }],
  '7/11': [{ name: 'ラーメンの日', short: 'ラーメンの日', hype: 2 }],
  '7/20': [{ name: '海の日', short: '海の日', hype: 2 }],
  '7/27': [{ name: 'スイカの日', short: 'スイカの日', hype: 2 }],
  '8/1':  [{ name: '水の日', short: '水の日', hype: 1 }],
  '8/6':  [{ name: '広島原爆の日', short: '原爆の日', hype: 1 }],
  '8/8':  [{ name: '山の日', short: '山の日', hype: 2 }],
  '8/13': [{ name: 'お盆入り', short: 'お盆', hype: 2 }],
  '8/15': [{ name: '終戦記念日・お盆', short: '終戦記念日', hype: 1 }],
  '9/1':  [{ name: '防災の日・新学期', short: '防災の日', hype: 2 }],
  '9/9':  [{ name: '重陽の節句・栗の日', short: '栗の日', hype: 1 }],
  '9/15': [{ name: '老人の日', short: '老人の日', hype: 1 }],
  '9/22': [{ name: '秋分の日', short: '秋分', hype: 2 }],
  '10/1': [{ name: '日本酒の日・コーヒーの日', short: 'コーヒーの日', hype: 2 }],
  '10/10': [{ name: '目の愛護デー', short: '目の愛護デー', hype: 1 }],
  '10/13': [{ name: 'さつまいもの日', short: 'さつまいもの日', hype: 2 }],
  '10/14': [{ name: '鉄道の日', short: '鉄道の日', hype: 1 }],
  '10/31': [{ name: 'ハロウィン', short: 'ハロウィン', hype: 3 }],
  '11/1': [{ name: '紅茶の日・犬の日', short: '犬の日', hype: 2 }],
  '11/3': [{ name: '文化の日', short: '文化の日', hype: 1 }],
  '11/11': [{ name: 'ポッキー&プリッツの日', short: 'ポッキーの日', hype: 3 }],
  '11/15': [{ name: '七五三', short: '七五三', hype: 2 }],
  '11/23': [{ name: '勤労感謝の日', short: '勤労感謝の日', hype: 2 }],
  '12/13': [{ name: '煤払い・大掃除の日', short: '大掃除の日', hype: 2 }],
  '12/22': [{ name: '冬至', short: '冬至', hype: 2 }],
  '12/24': [{ name: 'クリスマスイブ', short: 'クリスマスイブ', hype: 3 }],
  '12/25': [{ name: 'クリスマス', short: 'クリスマス', hype: 3 }],
  '12/31': [{ name: '大晦日', short: '大晦日', hype: 3 }],
};

// ─── 季節イベント（月のみ判定）──────────────────────────────────
const SEASONAL_BY_MONTH: Record<number, DayEvent> = {
  1:  { name: '正月シーズン', short: 'お正月ムード', hype: 2 },
  3:  { name: '花粉シーズン', short: '花粉シーズン', hype: 1 },
  4:  { name: '花見シーズン', short: '花見シーズン', hype: 3 },
  6:  { name: '梅雨シーズン', short: '梅雨', hype: 1 },
  7:  { name: '夏祭り・花火シーズン', short: '夏祭りシーズン', hype: 3 },
  8:  { name: '真夏・海水浴シーズン', short: '真夏', hype: 2 },
  9:  { name: '食欲の秋', short: '食欲の秋', hype: 2 },
  10: { name: '紅葉シーズン', short: '紅葉シーズン', hype: 2 },
  11: { name: '年末準備シーズン', short: '年末が近い', hype: 1 },
  12: { name: '年末・忘年会シーズン', short: '年末', hype: 2 },
};

// ─── 曜日ネタ ──────────────────────────────────────────────────
const WEEKDAY_EVENTS: Record<number, DayEvent> = {
  0: { name: '日曜日（明日から月曜…）', short: 'サザエさん症候群な日', hype: 2 },
  1: { name: '月曜日（週のスタート）', short: '月曜日', hype: 2 },
  2: { name: '火曜日', short: '火曜日', hype: 1 },
  3: { name: '水曜日（週の折り返し）', short: '水曜日', hype: 2 },
  4: { name: '木曜日（もうすぐ週末）', short: '木曜日', hype: 1 },
  5: { name: '金曜日（花金！）', short: 'TGIF！花金', hype: 3 },
  6: { name: '土曜日（お休み！）', short: '土曜日', hype: 2 },
};

/**
 * 今日の記念日・イベントリストを返す
 * @param date テスト用に日付を指定可能（省略時は今日）
 * @returns 記念日の表示名の配列
 */
export function getTodayEvents(date?: Date): string[] {
  const d = date ?? new Date();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = d.getDay();
  const key = `${month}/${day}`;

  const results: DayEvent[] = [];

  // 固定記念日
  const fixed = FIXED_EVENTS[key];
  if (fixed) results.push(...fixed);

  // 季節イベント（hype>=2 のみ、固定イベントがない日に追加）
  const seasonal = SEASONAL_BY_MONTH[month];
  if (seasonal && seasonal.hype >= 2 && results.length === 0) {
    results.push(seasonal);
  }

  // 曜日ネタ（hype>=2 のみ）
  const weekdayEvent = WEEKDAY_EVENTS[weekday];
  if (weekdayEvent && weekdayEvent.hype >= 2) {
    results.push(weekdayEvent);
  }

  return results.map(e => e.short);
}

/**
 * 今日のメインイベントを1件返す（最もhypeが高いもの）
 */
export function getTodayMainEvent(date?: Date): string | null {
  const d = date ?? new Date();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = d.getDay();
  const key = `${month}/${day}`;

  const candidates: DayEvent[] = [];

  const fixed = FIXED_EVENTS[key];
  if (fixed) candidates.push(...fixed);

  const seasonal = SEASONAL_BY_MONTH[month];
  if (seasonal) candidates.push(seasonal);

  const weekdayEvent = WEEKDAY_EVENTS[weekday];
  if (weekdayEvent) candidates.push(weekdayEvent);

  if (candidates.length === 0) return null;

  // hype降順でソートして最初を返す
  candidates.sort((a, b) => b.hype - a.hype);
  return candidates[0].short;
}

export default { getTodayEvents, getTodayMainEvent, FIXED_EVENTS, WEEKDAY_EVENTS };
