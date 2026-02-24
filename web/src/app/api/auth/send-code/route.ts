import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'メールアドレスが必要です' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Rate limit: delete old unused codes for this email first (raw SQL for Prisma v7 compatibility)
    await prisma.$executeRaw`
      DELETE FROM "VerificationCode"
      WHERE email = ${emailLower} AND used = false
    `;

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "VerificationCode" (id, email, code, "expiresAt", used, "createdAt")
      VALUES (${id}, ${emailLower}, ${code}, ${expiresAt}, false, NOW())
    `;

    // TODO: Send actual email. For now, log to console (debug mode)
    console.log(`[ANIVA AUTH] Verification code for ${emailLower}: ${code}`);

    // In debug mode, also return the code in the response
    const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true';

    return NextResponse.json({
      success: true,
      message: 'コードを送信しました',
      // Debug: return code in development mode
      ...(isDev && { debugCode: code }),
    });
  } catch (error) {
    console.error('[send-code] Error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
