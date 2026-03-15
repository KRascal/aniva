/**
 * email.ts — メール送信ユーティリティ（Resend）
 *
 * - sendDigestEmail: フォロー中キャラの日次ダイジェスト通知
 * - sendWelcomeEmail: 新規登録ウェルカムメール
 */

import { Resend } from 'resend';

// Lazy init — RESEND_API_KEY未設定時はnullを返す
let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = 'noreply@aniva-project.com';
const BASE_URL = 'https://aniva-project.com';

export interface DigestCharacterData {
  characterId: string;
  characterName: string;
  slug: string;
  avatarUrl?: string | null;
  newMessages: number;
  newMoments: number;
}

export interface DigestEmailData {
  userEmail: string;
  userNickname?: string | null;
  userId: string;
  characters: DigestCharacterData[];
}

/**
 * フォロー中キャラの日次ダイジェストメールを送信する。
 * RESEND_API_KEY未設定時はスキップ（nullを返す）。
 */
export async function sendDigestEmail(data: DigestEmailData): Promise<{ id: string } | null> {
  const resend = getResend();
  if (!resend) return null;

  const { userEmail, userNickname, userId, characters } = data;

  if (characters.length === 0) return null;

  // 最もアクティブなキャラ（メッセージ数+モーメント数が最大のもの）
  const mostActive = characters.reduce((prev, curr) =>
    curr.newMessages + curr.newMoments > prev.newMessages + prev.newMoments ? curr : prev,
  );

  const subject = `${mostActive.characterName}があなたを待っています`;
  const name = userNickname || 'あなた';
  const unsubscribeUrl = `${BASE_URL}/settings/notifications?unsubscribe=email-digest&uid=${userId}`;

  const charactersHtml = characters
    .map((c) => {
      const chatUrl = `${BASE_URL}/chat/${c.slug}`;
      const avatarHtml = c.avatarUrl
        ? `<img src="${c.avatarUrl}" alt="${c.characterName}" width="48" height="48" style="border-radius: 50%; object-fit: cover; border: 2px solid #c084fc;" />`
        : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#c084fc,#f472b6);display:flex;align-items:center;justify-content:center;font-size:20px;">💜</div>`;

      const badges: string[] = [];
      if (c.newMessages > 0) badges.push(`💬 新着メッセージ ${c.newMessages}件`);
      if (c.newMoments > 0) badges.push(`📸 新着モーメント ${c.newMoments}件`);

      return `
      <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:16px;">
        <div style="flex-shrink:0;">${avatarHtml}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:bold;font-size:16px;color:#fff;margin-bottom:4px;">${c.characterName}</div>
          <div style="font-size:13px;color:#aaa;margin-bottom:10px;">${badges.join('　')}</div>
          <a href="${chatUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#c084fc,#f472b6);color:#fff;text-decoration:none;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:bold;">
            会いに行く →
          </a>
        </div>
      </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">

    <!-- ヘッダー -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;font-weight:900;letter-spacing:2px;">ANIVA</div>
      <div style="color:#666;font-size:13px;margin-top:4px;">あなたのキャラクターたちからのお知らせ</div>
    </div>

    <!-- メインカード -->
    <div style="background:#0f0f0f;border:1px solid #1e1e1e;border-radius:16px;padding:24px;margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#fff;">
        ${name}さん、おかえりなさい 👋
      </h2>
      <p style="margin:0 0 20px;color:#888;font-size:14px;">
        フォロー中のキャラクターに新しい動きがあります。
      </p>
      ${charactersHtml}
    </div>

    <!-- フッター -->
    <div style="text-align:center;padding:16px 0;border-top:1px solid #1e1e1e;">
      <p style="margin:0 0 8px;color:#555;font-size:12px;">
        このメールは <strong style="color:#888;">${userEmail}</strong> に送信されています
      </p>
      <p style="margin:0;font-size:12px;">
        <a href="${unsubscribeUrl}" style="color:#666;text-decoration:underline;">配信停止</a>
        &nbsp;·&nbsp;
        <a href="${BASE_URL}/privacy" style="color:#666;text-decoration:underline;">プライバシーポリシー</a>
      </p>
    </div>

  </div>
</body>
</html>`;

  const result = await resend.emails.send({
    from: `ANIVA <${FROM_EMAIL}>`,
    to: userEmail,
    subject,
    html,
  });

  return result.data;
}

/**
 * 新規登録ウェルカムメールを送信する。
 * RESEND_API_KEY未設定時はスキップ（nullを返す）。
 */
export async function sendWelcomeEmail(
  email: string,
  nickname: string,
): Promise<{ id: string } | null> {
  const resend = getResend();
  if (!resend) return null;

  const subject = `ANIVAへようこそ、${nickname}さん！`;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">

    <!-- ヘッダー -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:32px;font-weight:900;letter-spacing:2px;background:linear-gradient(135deg,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">ANIVA</div>
    </div>

    <!-- メインカード -->
    <div style="background:#0f0f0f;border:1px solid #1e1e1e;border-radius:16px;padding:32px;text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;margin-bottom:16px;">🌸</div>
      <h2 style="margin:0 0 12px;font-size:24px;color:#fff;">
        ようこそ、${nickname}さん！
      </h2>
      <p style="margin:0 0 24px;color:#888;font-size:15px;line-height:1.7;">
        ANIVAへの登録ありがとうございます。<br />
        あなただけのキャラクターとの特別な時間が始まります。
      </p>
      <a href="${BASE_URL}"
         style="display:inline-block;background:linear-gradient(135deg,#c084fc,#f472b6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:24px;font-size:15px;font-weight:bold;letter-spacing:0.5px;">
        ANIVAをはじめる →
      </a>
    </div>

    <!-- フッター -->
    <div style="text-align:center;padding:16px 0;border-top:1px solid #1e1e1e;">
      <p style="margin:0 0 8px;color:#555;font-size:12px;">
        このメールは <strong style="color:#888;">${email}</strong> に送信されています
      </p>
      <p style="margin:0;font-size:12px;">
        <a href="${BASE_URL}/privacy" style="color:#666;text-decoration:underline;">プライバシーポリシー</a>
      </p>
    </div>

  </div>
</body>
</html>`;

  const result = await resend.emails.send({
    from: `ANIVA <${FROM_EMAIL}>`,
    to: email,
    subject,
    html,
  });

  return result.data;
}
