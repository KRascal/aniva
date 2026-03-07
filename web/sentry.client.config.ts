import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  
  // パフォーマンス計測（10%サンプリング）
  tracesSampleRate: 0.1,
  
  // セッションリプレイ（エラー時のみ100%、通常時0%）
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // 開発環境では送信しない
  enabled: process.env.NODE_ENV === 'production',

  environment: process.env.NODE_ENV,
  
  // PII除外
  beforeSend(event) {
    // パスワード等を除外
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>
      delete data.password
      delete data.token
    }
    return event
  },
})
