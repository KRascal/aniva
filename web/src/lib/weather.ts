/**
 * Weather Integration — Open-Meteo API（無料、APIキー不要）
 * キャラが現実世界の天気に反応する仕組み
 */

interface WeatherData {
  temperature: number; // 摂氏
  weatherCode: number; // WMO Weather code
  isDay: boolean;
  description: string;
  emoji: string;
}

// WMO Weather Code → 日本語 + emoji
const WEATHER_MAP: Record<number, { desc: string; emoji: string }> = {
  0:  { desc: '快晴', emoji: '☀️' },
  1:  { desc: '晴れ', emoji: '🌤️' },
  2:  { desc: '曇り', emoji: '⛅' },
  3:  { desc: '曇天', emoji: '☁️' },
  45: { desc: '霧', emoji: '🌫️' },
  48: { desc: '着氷霧', emoji: '🌫️' },
  51: { desc: '小雨', emoji: '🌦️' },
  53: { desc: '雨', emoji: '🌧️' },
  55: { desc: '大雨', emoji: '🌧️' },
  61: { desc: '小雨', emoji: '🌦️' },
  63: { desc: '雨', emoji: '🌧️' },
  65: { desc: '大雨', emoji: '⛈️' },
  71: { desc: '小雪', emoji: '🌨️' },
  73: { desc: '雪', emoji: '❄️' },
  75: { desc: '大雪', emoji: '❄️' },
  77: { desc: 'あられ', emoji: '🌨️' },
  80: { desc: 'にわか雨', emoji: '🌦️' },
  81: { desc: 'にわか雨', emoji: '🌧️' },
  82: { desc: '激しいにわか雨', emoji: '⛈️' },
  85: { desc: 'にわか雪', emoji: '🌨️' },
  86: { desc: '激しいにわか雪', emoji: '❄️' },
  95: { desc: '雷雨', emoji: '⛈️' },
  96: { desc: '雷雨（雹）', emoji: '⛈️' },
  99: { desc: '激しい雷雨', emoji: '⛈️' },
};

/**
 * Open-Meteo APIで現在の天気を取得
 * デフォルト: 東京 (35.6762, 139.6503)
 */
export async function getCurrentWeather(
  lat: number = 35.6762,
  lon: number = 139.6503
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=Asia%2FTokyo`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current;
    const code = current.weather_code as number;
    const meta = WEATHER_MAP[code] ?? { desc: '不明', emoji: '🌍' };

    return {
      temperature: Math.round(current.temperature_2m),
      weatherCode: code,
      isDay: current.is_day === 1,
      description: meta.desc,
      emoji: meta.emoji,
    };
  } catch {
    return null;
  }
}

/**
 * 天気に応じたキャラのリアクション生成
 * キャラのパーソナリティに応じた天気コメント
 */
export function getWeatherReaction(weather: WeatherData): string {
  const { temperature, weatherCode, isDay } = weather;

  // 雨系
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
    const rainMessages = [
      '雨降ってるね。傘持った？',
      '雨の音、好きなんだ。一緒に聞いてない？',
      '雨の日は室内がいいよね。ゆっくり話そう',
      '外出るなら気をつけてね',
    ];
    return rainMessages[Math.floor(Math.random() * rainMessages.length)];
  }

  // 雪系
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    const snowMessages = [
      '雪だ！寒いけどちょっとワクワクしない？',
      '温かくしてね。風邪引かないで',
      '雪景色、きれいだよね…',
    ];
    return snowMessages[Math.floor(Math.random() * snowMessages.length)];
  }

  // 雷雨
  if ([95, 96, 99].includes(weatherCode)) {
    return '雷すごくない？大丈夫？';
  }

  // 猛暑
  if (temperature >= 35) {
    return '暑すぎない？水分ちゃんと摂ってね…';
  }

  // 寒い
  if (temperature <= 5) {
    return '寒いね…温かい飲み物でも飲んで';
  }

  // 晴天
  if ([0, 1].includes(weatherCode) && isDay) {
    const sunMessages = [
      '今日いい天気だね！どこか行きたくない？',
      '天気いいと気分も上がるよね',
      '日差し気持ちいいね',
    ];
    return sunMessages[Math.floor(Math.random() * sunMessages.length)];
  }

  // 夜
  if (!isDay) {
    const nightMessages = [
      '今日もお疲れさま',
      '夜は静かでいいよね',
    ];
    return nightMessages[Math.floor(Math.random() * nightMessages.length)];
  }

  return '';
}

/**
 * キャラのプロフィール用: 天気付きステータステキスト
 */
export function getWeatherStatus(weather: WeatherData): string {
  return `${weather.emoji} ${weather.description} ${weather.temperature}°C`;
}
