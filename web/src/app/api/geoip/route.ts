import { NextRequest, NextResponse } from 'next/server';
import { Locale } from '@/lib/i18n';

function countryToLocale(countryCode: string): Locale {
  if (countryCode === 'KR') return 'ko';
  if (['TW', 'CN', 'HK'].includes(countryCode)) return 'zh';
  if (['US', 'GB', 'AU', 'CA'].includes(countryCode)) return 'en';
  return 'ja';
}

export async function GET(req: NextRequest) {
  try {
    // X-Forwarded-For からIPを取得
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    // ローカルIPの場合はデフォルトを返す
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return NextResponse.json({ locale: 'ja', country: 'JP' });
    }

    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'ANIVA/1.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ locale: 'ja' });
    }

    const data = await res.json();
    const countryCode: string = data.country_code ?? '';
    const locale = countryToLocale(countryCode);

    return NextResponse.json({ locale, country: countryCode });
  } catch {
    return NextResponse.json({ locale: 'ja' });
  }
}
