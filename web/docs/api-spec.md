# ANIVA API 仕様書

**更新日:** 2026-02-25  
**ベースURL:** `http://162.43.90.97:3050` (本番) / `http://localhost:3050` (ローカル)

---

## 認証

ほとんどのエンドポイントは NextAuth.js セッション認証が必要。  
`Authorization: Bearer <token>` は不要。セッションCookieを使用。

---

## 認証フロー (`/api/auth/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/auth/send-code` | メール確認コード送信 (Resend) | 不要 |
| * | `/api/auth/[...nextauth]` | NextAuth.js ハンドラ | - |

### POST /api/auth/send-code
```json
// Request
{ "email": "user@example.com" }
// Response
{ "success": true, "message": "コードを送信しました" }
```

---

## キャラクター (`/api/characters/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/characters` | キャラ一覧取得（active） | 不要 |
| GET | `/api/characters/[slug]` | キャラ詳細（slug指定） | 不要 |
| GET | `/api/characters/id/[id]` | キャラ詳細（ID指定） | 不要 |

### GET /api/characters
```json
// Response
{
  "characters": [
    {
      "id": "uuid",
      "name": "モンキー・D・ルフィ",
      "nameEn": "Monkey D. Luffy",
      "slug": "luffy",
      "franchise": "ONE PIECE",
      "description": "...",
      "avatarUrl": null,
      "coverUrl": null,
      "catchphrases": ["海賊王に、俺はなる！", ...]
    }
  ]
}
```

---

## チャット (`/api/chat/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/chat/send` | メッセージ送信（AI応答） | 必要 |
| GET | `/api/chat/history/[relationshipId]` | チャット履歴取得 | 必要 |
| GET | `/api/chat/history-by-user` | ユーザー全チャット履歴 | 必要 |
| GET | `/api/chat/greet` | 初回挨拶生成 | 必要 |

### POST /api/chat/send
```json
// Request
{ "characterId": "uuid", "message": "こんにちは！" }
// Response (SSE stream)
data: {"type": "delta", "content": "ルフィ"}
data: {"type": "delta", "content": "だ！"}
data: {"type": "done"}
```

---

## コイン経済 (`/api/coins/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/coins/balance` | コイン残高取得 | 必要 |
| POST | `/api/coins/spend` | コイン消費（冪等性付き） | 必要 |
| POST | `/api/coins/purchase` | コイン購入（Stripe/デモ） | 必要 |

### GET /api/coins/balance
```json
// Response
{ "balance": 100, "userId": "uuid" }
```

---

## オンボーディング (`/api/onboarding/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/onboarding/init-deeplink` | ディープリンク初期化 | 不要 |
| POST | `/api/onboarding/guest-chat` | ゲストチャット（3往復） | 不要 |
| POST | `/api/onboarding/select-character` | キャラ選択 | 必要 |
| POST | `/api/onboarding/nickname` | ニックネーム設定 | 必要 |
| POST | `/api/onboarding/first-chat` | 初回チャット | 必要 |
| POST | `/api/onboarding/complete` | オンボーディング完了 | 必要 |

---

## リレーション (`/api/relationship/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/relationship/all` | 全リレーション取得 | 必要 |
| GET | `/api/relationship/following` | フォロー中リスト | 必要 |
| GET/PUT | `/api/relationship/[characterId]` | リレーション詳細/更新 | 必要 |
| POST | `/api/relationship/[characterId]/follow` | フォロー/アンフォロー | 必要 |
| GET/POST | `/api/relationship/[characterId]/fanclub` | FC加入状態/加入 | 必要 |
| GET | `/api/relationship/[characterId]/milestones` | マイルストーン | 必要 |

---

## Moments (`/api/moments/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/moments` | Moments一覧（tier制限付き） | 任意 |
| POST | `/api/moments/[momentId]/react` | リアクション | 必要 |
| POST | `/api/moments/seed` | Momentsシード（管理者） | 管理者 |

---

## サブスクリプション (`/api/subscription/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/subscription/create` | FC加入（Stripe） | 必要 |
| POST | `/api/subscription/cancel` | FC解約 | 必要 |

---

## ユーザー (`/api/users/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/users/me` | 自分のプロフィール | 必要 |
| GET/PUT | `/api/users/settings` | 設定取得/更新 | 必要 |

---

## 音声・画像 (`/api/voice/`, `/api/image/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/voice/generate` | 音声生成 (ElevenLabs) | 必要 |
| POST | `/api/image/generate` | 画像生成 | 必要 |

---

## プッシュ通知 (`/api/push/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/push/subscribe` | Push購読登録 | 必要 |
| POST | `/api/push/send` | 通知送信（管理者） | 管理者 |
| POST | `/api/push/character-notify` | キャラ通知 | 管理者 |

---

## 管理 (`/api/admin/`)

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET/POST/PUT | `/api/admin/characters` | キャラ管理 | 管理者 |
| GET/POST/PUT/DELETE | `/api/admin/moments` | Moments管理 | 管理者 |
| GET | `/api/admin/users` | ユーザー管理 | 管理者 |
| PUT | `/api/admin/users/[id]/plan` | プラン変更 | 管理者 |
| POST | `/api/admin/upload` | 画像アップロード | 管理者 |
| GET | `/api/admin/analytics` | 分析データ | 管理者 |
| GET | `/api/admin/stats` | 統計 | 管理者 |

---

## その他

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/health` | ヘルスチェック | 不要 |
| POST | `/api/transaction/tip` | チップ送信 | 必要 |
| POST | `/api/cron/moments` | Moments自動生成 (cron) | CRON_SECRET |
| POST | `/api/webhook/stripe` | Stripeウェブフック | Stripe署名 |

---

## フリーミアム制限

| 機能 | 無料 | FC会員 |
|------|------|--------|
| チャットメッセージ | 10通/月 | 無制限 |
| 通話 | 5分/月 | 30分/月 |
| 超過チャット | コイン消費 | コイン消費 |
| 超過通話 | コイン消費 | 半額コイン |

---

## エラーレスポンス

```json
{ "error": "エラーメッセージ" }
```

HTTP ステータス: 400 (バリデーション), 401 (未認証), 403 (権限不足), 500 (サーバーエラー)
