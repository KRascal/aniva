import { logger } from '@/lib/logger';

export interface EnvironmentContext {
  weather?: { condition: string; temp: number; description: string };
  churnStage?: 'active' | 'cooling' | 'at_risk' | 'churned';
  season?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  specialDay?: string; // バレンタイン、クリスマス等
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function detectChurnStage(lastMessageAt: Date | null, daysSinceLastMessage: number): EnvironmentContext['churnStage'] {
  if (!lastMessageAt) return 'churned';
  if (daysSinceLastMessage <= 1) return 'active';
  if (daysSinceLastMessage <= 3) return 'cooling';
  if (daysSinceLastMessage <= 7) return 'at_risk';
  return 'churned';
}

export function getSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function getSpecialDay(): string | undefined {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const SPECIAL_DAYS: Record<string, string> = {
    '01-01': '元旦',
    '02-14': 'バレンタインデー',
    '03-14': 'ホワイトデー',
    '04-01': 'エイプリルフール',
    '07-07': '七夕',
    '10-31': 'ハロウィン',
    '12-24': 'クリスマスイヴ',
    '12-25': 'クリスマス',
    '12-31': '大晦日',
  };
  return SPECIAL_DAYS[mmdd];
}

export async function getWeather(lat: number = 35.6762, lon: number = 139.6503): Promise<EnvironmentContext['weather'] | undefined> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia/Tokyo`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const code = data.current?.weather_code ?? 0;
    const temp = data.current?.temperature_2m ?? 20;
    const condition = code <= 3 ? 'clear' : code <= 48 ? 'cloudy' : code <= 67 ? 'rain' : 'storm';
    const descriptions: Record<string, string> = { clear: '晴れ', cloudy: '曇り', rain: '雨', storm: '嵐' };
    return { condition, temp, description: descriptions[condition] ?? '不明' };
  } catch {
    return undefined;
  }
}

export async function buildEnvironmentContext(): Promise<EnvironmentContext> {
  const [weather] = await Promise.allSettled([getWeather()]);
  return {
    weather: weather.status === 'fulfilled' ? weather.value : undefined,
    timeOfDay: getTimeOfDay(),
    season: getSeason(),
    specialDay: getSpecialDay(),
  };
}
