# ANIVA — AIキャラクターファンプラットフォーム

アニメ・マンガキャラクターとリアルタイムで会話・通話できるAIファンプラットフォーム。  
ファンクラブ加入・コイン経済・Moments配信機能を備える。

**本番URL:** http://162.43.90.97:3050  
**管理画面:** http://162.43.90.97:3050/admin

---

## 技術スタック

| 分類 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| DB | PostgreSQL (Prisma ORM) |
| 認証 | NextAuth.js v5 + メール確認コード (Resend) |
| AI | xAI Grok-3 / Claude Sonnet 4.6 |
| 音声 | ElevenLabs TTS |
| 決済 | Stripe (サブスクリプション + Checkout) |
| パッケージ管理 | pnpm |
| デプロイ | PM2 (port 3050) |

---

## キャラクター一覧（現在6キャラ）

| slug | キャラ | 作品 |
|------|--------|------|
| luffy | モンキー・D・ルフィ | ONE PIECE |
| zoro | ロロノア・ゾロ | ONE PIECE |
| nami | ナミ | ONE PIECE |
| chopper | トニートニー・チョッパー | ONE PIECE |
| ace | ポートガス・D・エース | ONE PIECE |
| sanji | ヴィンスモーク・サンジ | ONE PIECE |

---

## 主要機能

### ユーザー向け
- **The Door** — キャラクター検索・選択（トップページ）
- **邂逅フロー** `/c/[slug]` — 未ログインで3回チャット体験 → 登録促進
- **チャット** — AIキャラとリアルタイム会話（SSEストリーミング）
- **通話** — 音声通話（ElevenLabs TTS）
- **Moments** — キャラの投稿（PUBLIC / STANDARD / PREMIUM tier）
- **ファンクラブ** — 月額サブスクリプション（FC限定コンテンツ）
- **コイン経済** — コイン購入・消費（超過チャット/通話）
- **気配の空間** `/discover` — キャラ探索ページ

### フリーミアム制限
- 無料: チャット10通/月、通話5分/月
- FC会員: 無制限チャット、通話30分/月

### 管理者向け
- キャラクター管理（システムプロンプト・料金設定）
- Moments管理（tier別投稿）
- ユーザー管理・プラン変更
- 分析・統計ダッシュボード

---

## セットアップ

### 前提条件
- Node.js 22+
- pnpm
- PostgreSQL
- Redis

### インストール
```bash
cd web
pnpm install
cp .env.example .env  # 環境変数設定
pnpm run db:migrate   # DBマイグレーション
pnpm run db:seed      # 初期データ投入（6キャラ）
pnpm run build
```

### 環境変数（必須）

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL接続文字列 |
| `AUTH_SECRET` | NextAuth.js シークレット |
| `XAI_API_KEY` | xAI/Grok API キー |
| `RESEND_API_KEY` | メール認証用 Resend API キー |
| `STRIPE_SECRET_KEY` | Stripe 秘密鍵 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開鍵 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook シークレット |

### 開発サーバー起動
```bash
pnpm dev  # http://localhost:3050
```

### 本番デプロイ
```bash
pnpm build
pm2 start ecosystem.config.js
```

---

## ディレクトリ構成

```
web/
├── src/
│   ├── app/
│   │   ├── (auth)/        # ログイン・サインアップ
│   │   ├── (main)/        # 認証済みページ
│   │   ├── admin/         # 管理画面
│   │   ├── api/           # APIルート (45エンドポイント)
│   │   ├── c/[slug]/      # 邂逅フロー
│   │   ├── discover/      # 気配の空間
│   │   └── onboarding/    # オンボーディングフロー
│   ├── components/
│   │   ├── onboarding/    # The Door / 邂逅コンポーネント
│   │   └── ui/            # 共通UIコンポーネント
│   └── lib/
│       ├── character-engine.ts  # キャラ定義・AI応答
│       ├── freemium.ts          # フリーミアム判定
│       └── auth.ts              # 認証設定
├── prisma/
│   ├── schema.prisma      # DBスキーマ
│   └── seed.ts            # 初期データ（6キャラ）
└── docs/
    └── api-spec.md        # API仕様書
```

---

## API仕様

→ [docs/api-spec.md](./docs/api-spec.md) 参照（45エンドポイント）

---

## DBシード（キャラクター追加）

```bash
# seed.ts の characters 配列に追加後:
pnpm run db:seed
```

---

## 関連リポジトリ・サービス

- GitHub: `KRascal/aniva`
- DB: `postgresql://localhost:5432/aniva`
- PM2プロセス名: `aniva`
