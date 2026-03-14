/**
 * ContextTriggers — プロアクティブDM強化のための環境コンテキスト収集
 *
 * - 天気情報（Open-Meteo、無料・APIキー不要）
 * - 離脱段階分類（ChurnStage）
 * - 季節イベント取得（seasonal-event-system.ts ラッパー）
 *
 * NOTE: UserStateSnapshotへの追加フィールド（types.tsに追加済み）:
 *   weatherContext?: { temp: number; description: string; location: string } | null;
 *   seasonalEvents?: string[];
 *   churnStage: 'active' | 'cooling' | 'at_risk' | 'churned';
 */

import { prisma } from '../prisma';
import { logger } from '@/lib/logger';

// ── 型定義 ──────────────────────────────────────────────────

interface WeatherContext {
  temp: number;        // 気温 (°C)
  description: string; // "晴れ", "雨", "雪" 等
  location: string;    // 都市名
  weatherCode: number; // WMO weather code
}

export type ChurnStage = 'active' | 'cooling' | 'at_risk' | 'churned';

// ── 天気キャッシュ（1時間、location単位） ────────────────────

const weatherCache = new Map<string, { data: WeatherContext; at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1時間

// ── WMOコード → 日本語変換 ────────────────────────────────

function weatherCodeToDescription(code: number): string {
  if (code === 0) return '快晴';
  if (code <= 3) return '晴れ';
  if (code <= 48) return '曇り';
  if (code <= 55) return '霧雨';
  if (code <= 65) return '雨';
  if (code <= 77) return '雪';
  if (code <= 82) return 'にわか雨';
  return '雷雨';
}

// ── 天気取得 ──────────────────────────────────────────────

/**
 * ユーザーの居住地天気を取得する（Open-Meteo使用、APIキー不要）
 * エラー時はnullを返す（天気取得失敗でパイプラインを止めない）
 */
export async function getWeatherForUser(userId: string): Promise<WeatherContext | null> {
  try {
    // 1. UserProfileからlocation/lat/lonを取得
    let location = '東京';
    let latitude: number | null = null;
    let longitude: number | null = null;
    let resolvedLocation = '東京';
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { basics: true },
      });
      if (profile?.basics) {
        const basics = profile.basics as Record<string, unknown>;
        // Layer 2: ブラウザGeolocationのlat/lonが保存されていれば最優先
        if (typeof basics.latitude === 'number' && typeof basics.longitude === 'number') {
          latitude = basics.latitude;
          longitude = basics.longitude;
          resolvedLocation = typeof basics.location === 'string' && basics.location.trim()
            ? basics.location.trim()
            : `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
          location = resolvedLocation;
        }
        // Layer 1: 会話から抽出されたlocation（テキスト）
        else if (typeof basics.location === 'string' && basics.location.trim()) {
          location = basics.location.trim();
        }
      }
    } catch {
      // プロファイル取得失敗 → デフォルト "東京" を使用
    }

    // 2. キャッシュチェック（location単位）
    const cached = weatherCache.get(location);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }

    // 3. lat/lonが既にあればGeocodingスキップ、なければGeocoding API
    if (latitude === null || longitude === null) {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&language=ja&count=1`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!geoRes.ok) {
        logger.warn(`[ContextTriggers] Geocoding failed for "${location}": ${geoRes.status}`);
        return null;
      }
      const geoData = await geoRes.json() as { results?: Array<{ latitude: number; longitude: number; name: string }> };
      const geoResult = geoData.results?.[0];
      if (!geoResult) {
        logger.warn(`[ContextTriggers] Geocoding: no results for "${location}"`);
        return null;
      }
      latitude = geoResult.latitude;
      longitude = geoResult.longitude;
      resolvedLocation = geoResult.name;
    }

    // 4. Open-Meteo Forecast APIで現在の天気を取得
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=Asia/Tokyo`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!weatherRes.ok) {
      logger.warn(`[ContextTriggers] Weather API failed for "${location}": ${weatherRes.status}`);
      return null;
    }
    const weatherData = await weatherRes.json() as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const current = weatherData.current;
    if (!current) {
      logger.warn(`[ContextTriggers] Weather API: no current data for "${location}"`);
      return null;
    }

    const weatherCode = current.weather_code ?? 0;
    const result: WeatherContext = {
      temp: Math.round((current.temperature_2m ?? 0) * 10) / 10,
      description: weatherCodeToDescription(weatherCode),
      location: resolvedLocation,
      weatherCode,
    };

    // 5. キャッシュ保存
    weatherCache.set(location, { data: result, at: Date.now() });

    return result;
  } catch (error) {
    logger.warn('[ContextTriggers] getWeatherForUser error:', error);
    return null;
  }
}

// ── 離脱段階分類 ──────────────────────────────────────────

/**
 * 最終メッセージからの経過日数をもとに離脱段階を分類する
 */
export function classifyChurnStage(daysSinceLastMessage: number): ChurnStage {
  if (daysSinceLastMessage <= 2) return 'active';
  if (daysSinceLastMessage <= 6) return 'cooling';
  if (daysSinceLastMessage <= 13) return 'at_risk';
  return 'churned';
}

// ── 季節イベント取得 ──────────────────────────────────────

/**
 * 現在アクティブな季節イベント名の配列を返す
 * seasonal-event-system.ts の getCurrentSeasonalEvents() をラップ
 */
export function getActiveSeasonalEvents(): string[] {
  try {
    // dynamic importではなくstaticにimportすると循環importになる可能性があるため、
    // require形式でのアクセスを避けつつ直接importする
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCurrentSeasonalEvents } = require('@/lib/seasonal-event-system') as {
      getCurrentSeasonalEvents: () => Array<{ name: string }>;
    };
    const events = getCurrentSeasonalEvents();
    return events.map(e => e.name);
  } catch (error) {
    logger.warn('[ContextTriggers] getActiveSeasonalEvents error:', error);
    return [];
  }
}
