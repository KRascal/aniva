import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Send verification email via Resend
    try {
      await resend.emails.send({
        from: 'ANIVA <noreply@aniva.jp>',
        to: emailLower,
        subject: '【ANIVA】認証コード',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0d0d0d; color: #fff; border-radius: 12px;">
            <h2 style="color: #a855f7; margin-bottom: 8px;">認証コード</h2>
            <p style="color: #ccc; margin-bottom: 24px;">ANIVAへようこそ。以下のコードを入力してください。</p>
            <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 24px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #fff;">
              ${code}
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 16px;">このコードは10分間有効です。心当たりがない場合は無視してください。</p>
          </div>
        `,
      });
      console.log(`[ANIVA AUTH] Verification email sent to ${emailLower}`);
    } catch (emailError) {
      // Log error but don't fail — code is already saved in DB
      console.error(`[ANIVA AUTH] Failed to send email to ${emailLower}:`, emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'コードを送信しました',
    });
  } catch (error) {
    console.error('[send-code] Error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
