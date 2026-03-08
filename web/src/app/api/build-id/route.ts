import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const buildId = readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf-8').trim();
    return NextResponse.json({ buildId }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ buildId: 'unknown' });
  }
}
