# ANIVA 管理画面（Admin Panel）設計書

> バージョン: 1.0.0  
> 作成日: 2026-03-07  
> 対象ブランチ: main  
> ステータス: 設計確定

---

## 目次

1. [背景・目的](#1-背景目的)
2. [技術スタック・前提](#2-技術スタック前提)
3. [認証・アクセス制御](#3-認証アクセス制御)
4. [ページ構成（全体ナビゲーション）](#4-ページ構成全体ナビゲーション)
5. [各ページのUI仕様](#5-各ページのui仕様)
   - 5.1 ダッシュボード (`/admin`)
   - 5.2 キャラクター管理 (`/admin/characters`)
   - 5.3 コインパッケージ管理 (`/admin/coins`)
   - 5.4 ユーザー管理 (`/admin/users`)
   - 5.5 モーメンツ管理 (`/admin/moments`)
   - 5.6 ガチャ管理 (`/admin/gacha`)
   - 5.7 ショップ管理 (`/admin/shop`)
   - 5.8 限定シナリオ (`/admin/scenarios`)
   - 5.9 ストーリー管理 (`/admin/stories`)
   - 5.10 投票管理 (`/admin/polls`)
   - 5.11 限定DLコンテンツ (`/admin/downloadable-content`)
   - 5.12 通知配信 (`/admin/notifications`)
   - 5.13 分析 (`/admin/analytics`)
   - 5.14 中毒設計ダッシュボード (`/admin/addiction`)
6. [APIエンドポイント一覧](#6-apiエンドポイント一覧)
7. [DBクエリ設計](#7-dbクエリ設計)
8. [完了条件（Definition of Done）](#8-完了条件definition-of-done)
9. [実装優先度](#9-実装優先度)
10. [未実装・将来課題](#10-未実装将来課題)

---

## 1. 背景・目的

### 背景

ANIVAは **IP × デジタルクローン × OnlyFans型** のモバイルファーストプラットフォームである。  
ユーザーはアニメキャラクターのAIクローンとチャット・通話し、コイン購入・FCメンバーシップ（ファンクラブ課金）によって収益化されている。

現状の課題：
- キャラクター追加・編集は **Prisma Studio または psql での直接DB操作** が必要
- コインパッケージ価格変更・新パッケージ追加も同様にDB直接操作
- ユーザーへのコイン付与・BAN処理に手作業が発生
- モーメンツ（タイムライン投稿）のモデレーションができない
- ダッシュボードでビジネスKPIをリアルタイムに確認できない

### 目的

1. **ノーコード運用** — エンジニア不在でもキャラクター・コンテンツを管理できる
2. **リアルタイム把握** — DAU・収益・チャット数をダッシュボードで即座に確認
3. **ユーザーサポート対応の効率化** — コイン付与・BAN・プラン変更を管理画面から実行
4. **コンテンツ品質管理** — モーメンツのモデレーション、スケジュール公開

### スコープ（本設計書の対象）

| 機能 | 状態 |
|------|------|
| ダッシュボード（KPIサマリー） | ✅ 実装済み（拡張設計） |
| キャラクター管理CRUD | ✅ 実装済み（詳細設計） |
| コインパッケージ管理CRUD | ✅ 実装済み（詳細設計） |
| ユーザー管理・コイン付与・BAN | ✅ 実装済み（詳細設計） |
| モーメンツ管理・モデレーション | ✅ 実装済み（詳細設計） |
| ガチャ・ショップ・シナリオ等 | ✅ 実装済み（補足設計） |

---

## 2. 技術スタック・前提

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| ORM | Prisma 7 |
| DB | PostgreSQL |
| スタイリング | Tailwind CSS |
| 認証 | NextAuth.js (`src/lib/auth.ts`) |
| 管理者判定 | `ADMIN_EMAILS` 環境変数（カンマ区切り） |
| 管理画面パス | `/admin/*` |
| API パス | `/api/admin/*` |
| レンダリング | Client Components（`'use client'`） + Server-side API Routes |

### ディレクトリ構成

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx              # サイドバー・認証チェック
│   │   ├── page.tsx                # ダッシュボード
│   │   ├── characters/page.tsx     # キャラクター管理
│   │   ├── coins/page.tsx          # コインパッケージ管理
│   │   ├── users/page.tsx          # ユーザー管理
│   │   ├── moments/page.tsx        # モーメンツ管理
│   │   ├── gacha/page.tsx          # ガチャ管理
│   │   ├── shop/page.tsx           # ショップ管理
│   │   ├── scenarios/page.tsx      # 限定シナリオ
│   │   ├── stories/page.tsx        # ストーリー管理
│   │   ├── polls/page.tsx          # 投票管理
│   │   ├── downloadable-content/   # 限定DL
│   │   ├── notifications/page.tsx  # 通知配信
│   │   ├── analytics/page.tsx      # 分析
│   │   └── addiction/page.tsx      # 中毒設計
│   └── api/admin/
│       ├── dashboard/route.ts
│       ├── characters/route.ts
│       ├── characters/secrets/route.ts
│       ├── characters/presence/route.ts
│       ├── characters/generate-soul/route.ts
│       ├── characters/generate-moments/route.ts
│       ├── characters/generate-story/route.ts
│       ├── coins/route.ts
│       ├── users/route.ts
│       ├── users/[id]/coins/route.ts
│       ├── users/[id]/plan/route.ts
│       ├── moments/route.ts
│       ├── gacha/banners/route.ts
│       ├── gacha/cards/route.ts
│       ├── shop/route.ts
│       ├── scenarios/route.ts
│       ├── stories/route.ts
│       ├── polls/route.ts (未実装)
│       ├── notifications/route.ts
│       ├── analytics/route.ts
│       ├── addiction/stats/route.ts
│       ├── upload/route.ts
│       ├── voice-test/route.ts
│       └── translate/route.ts
└── lib/
    └── admin.ts                    # requireAdmin() ヘルパー
```

---

## 3. 認証・アクセス制御

### 仕組み

```typescript
// src/lib/admin.ts
export async function requireAdmin(): Promise<{ email: string; id: string } | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  const ok = adminEmails.includes(session.user.email.toLowerCase());
  return ok ? { email: session.user.email, id: session.user.id } : null;
}
```

### APIルートでの適用パターン

```typescript
// 全APIルートで必須
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // ... 処理
}
```

### フロントエンドのガード

`layout.tsx` が `/api/admin/stats` にGETリクエストして403 → 未認証画面を表示。  
管理者でなければサイドバーを含むレイアウト全体を表示しない。

### 環境変数設定

```env
ADMIN_EMAILS=admin@example.com,ops@example.com
```

---

## 4. ページ構成（全体ナビゲーション）

### サイドバーナビゲーション

```
ANIVA Admin
├── 📊 ダッシュボード         /admin
├── 🎭 キャラクター管理       /admin/characters   ★最重要
├── 📸 モーメンツ             /admin/moments      ★最重要
├── 🎰 ガチャ                 /admin/gacha
├── 🛍 ショップ               /admin/shop
├── 👥 ユーザー               /admin/users        ★最重要
├── 📖 限定シナリオ           /admin/scenarios
├── 🗳 投票管理               /admin/polls
├── 📦 限定DL                 /admin/downloadable-content
├── 🧪 中毒設計               /admin/addiction
├── 📈 分析                   /admin/analytics
├── 📖 ストーリーズ           /admin/stories
├── 🪙 コインパッケージ       /admin/coins        ★最重要
└── 🔔 通知配信               /admin/notifications
```

### レイアウト仕様

- **デスクトップ**: 左サイドバー固定（w-64）+ メインコンテンツエリア
- **モバイル**: ハンバーガーメニュー → スライドオーバーサイドバー + オーバーレイ
- **背景色**: `bg-gray-950`（メイン） / `bg-gray-900`（サイドバー）
- **テーマ**: ダークモード固定、アクセントカラー `purple-600`

---

## 5. 各ページのUI仕様

### 5.1 ダッシュボード `/admin`

#### 目的
KPIをリアルタイムで把握し、異常を早期検知する。

#### レイアウト構成

```
┌─────────────────────────────────────────────┐
│ ANIVA 管理ダッシュボード  YYYY年MM月DD日(曜) 🔄更新 │
├────────┬────────┬────────┬────────┤
│  DAU   │新規登録│チャット│コイン収益│  ← 今日のサマリーカード4枚
│   👤   │   ✨   │   💬   │   🪙    │
│ 1,234  │   45   │ 8,901  │ ¥12.5万 │
└────────┴────────┴────────┴────────┘
┌──────────────────────────────────────┐
│ 🔔 要対応（未処理の通報N件 / エラーN件）  │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 📱 クイックアクション（10個グリッド）        │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 📈 直近7日間 DAU推移（棒グラフ）           │
└──────────────────────────────────────┘
```

#### コンポーネント詳細

**KPIサマリーカード（4枚）**
| フィールド | 内容 | 取得元 |
|-----------|------|-------|
| DAU | 今日ログインしたユニークユーザー数 | `User.sessions` |
| 新規登録 | 今日作成されたUser数 | `User.createdAt` |
| チャット数 | 今日送信されたMessage数 | `Message.createdAt` |
| コイン収益 | 今日のCoinTransaction(PURCHASE)合計 | `CoinTransaction` |

**アラートセクション（要対応）**
- 未処理の通報数（将来実装: Report モデル）
- 低ストリークユーザー数（streakDays = 0 かつ 7日以内に最終メッセージ）
- エラーログ数（Sentry連携 or DBエラーログ）

**7日間DAUチャート**
- X軸: 日付ラベル（MM-DD形式）
- Y軸: ユニークユーザー数
- バー: `bg-purple-500/70`、高さは最大値に対する比率

#### データフロー
```
Client → GET /api/admin/dashboard → { today, alerts, weeklyDau }
```

---

### 5.2 キャラクター管理 `/admin/characters`

#### 目的
キャラクターのCRUD + AI自動生成ウィザード。ノーコードでキャラクターを追加・編集できる。

#### 既存実装の概要
- **新規作成**: 7ステップウィザード
- **編集**: フラットフォーム（基本設定タブ + 多言語設定タブ）
- **一覧**: テーブル形式（アバター、名前、フランチャイズ、月額、会話数、ユーザー数、状態）

#### 一覧テーブル仕様

| カラム | 内容 | ソート |
|-------|------|--------|
| キャラ | アバター + 名前 + スラッグ | - |
| フランチャイズ | franchise フィールド | - |
| 月額 | fcMonthlyPriceJpy（¥X,XXX） | - |
| 会話数 | Message集計 | - |
| ユーザー数 | ユニークユーザー数 | - |
| 状態 | アクティブ/停止中（トグルボタン） | - |
| 操作 | 🔊ボイステスト / 編集 / 削除 | - |

#### 新規作成ウィザード（7ステップ）

**Step 1: 基本情報**
| フィールド | 型 | バリデーション |
|-----------|-----|---------------|
| 名前（日本語）* | text | 必須 |
| 名前（英語） | text | 任意 |
| スラッグ* | text | 必須、英数字ハイフン、ユニーク |
| フランチャイズ* | text | 必須 |
| フランチャイズ（英語） | text | 任意 |
| 説明 | textarea | 任意 |
| アバター画像 | image upload | 任意、`/uploads/avatars/{slug}.{ext}` |
| カバー画像 | image upload | 任意、`/uploads/covers/{slug}.{ext}` |

**Step 2: キャラクター設定**
| フィールド | 型 | バリデーション |
|-----------|-----|---------------|
| ElevenLabs ボイスID | text(mono) | 任意 |
| システムプロンプト* | textarea | 必須 |
| キャッチフレーズ | text（カンマ区切り） | 任意 |
| パーソナリティトレイト | textarea（JSON配列） | 任意、JSON検証 |
| アクティブ | toggle | デフォルト: true |

**Step 3: SOUL/VOICE/BOUNDARIES 生成（AI自動生成）**
- 「AIで自動生成」ボタン → POST `/api/admin/characters/generate-soul`
- 生成結果をSOUL / VOICE / BOUNDARIESのテキストエリアに表示
- 手動編集可能
- キャラクター保存時にファイルとして保存（`characters/{slug}/SOUL.md` 等）

**Step 4: 料金設定**

| フィールド | 型 | デフォルト | 制約 |
|-----------|-----|-----------|------|
| チャット/1通（非FC） | number | 10コイン | min: 1 |
| 通話/1分（非FC） | number | 200コイン | min: 200 |
| FC月額 | number | ¥3,480 | min: 3480 |
| FC月額コイン付与 | number | 500コイン | min: 0 |
| FC込み通話時間 | number | 30分/月 | min: 0 |
| FC超過通話料金 | number | 100コイン/分 | min: 100 |

粗利率プレビュー（`GrossMarginPreview` コンポーネント）を表示:
- Stripe手数料3.6%控除後の実手取り
- ElevenLabs TTS想定コスト
- 推定粗利率

**Step 5: 確認・作成**
- 入力内容サマリー表示
- 「🚀 キャラクターを作成」ボタン → POST `/api/admin/characters`
- 成功後 → Step 6へ自動遷移

**Step 6: 初期Moments生成（AI）**
- 「✨ AIで初期Moments生成（5件）」→ POST `/api/admin/characters/generate-moments`
- 成功後 → Step 7へ

**Step 7: ストーリーチャプター生成（AI）**
- 「📖 AIでストーリーチャプター生成（3章）」→ POST `/api/admin/characters/generate-story`
- Chapter 1（無料）/ Chapter 2（Lv3解放）/ Chapter 3（FC限定）を自動生成

#### 編集フォーム

**基本設定タブ**: Step 1-2 + Step 4のフィールドをフラット表示
- プレゼンス設定（手動/自動モード、ステータステキスト、絵文字）
- 秘密コンテンツ管理（SecretContent CRUD）

**多言語設定タブ**:
- 対応ロケール: EN / KO / ZH
- 「🤖 自動翻訳」ボタン → POST `/api/admin/translate`
- 言語別: キャラ名 / Bio / グリーティング / システムプロンプト / ボイスID

#### 削除
- 確認ダイアログ表示（「この操作は取り消せません」）
- DELETE `/api/admin/characters?id={id}`

---

### 5.3 コインパッケージ管理 `/admin/coins`

#### 目的
CoinPackageテーブルのCRUD。価格・ボーナスコインの設定をノーコードで変更できる。

#### 一覧テーブル仕様

| カラム | 内容 |
|-------|------|
| パッケージ名 | name |
| コイン数 | coinAmount |
| Web価格 | priceWebJpy（¥X,XXX） |
| ストア価格 | priceStoreJpy（¥X,XXX）|
| Stripe Price ID | stripePriceId（mono, truncate） |
| ソート順 | sortOrder |
| 状態 | isActive（トグルバッジ） |
| 操作 | 編集 / 削除 |

**価格差プレビュー**: `(priceStoreJpy - priceWebJpy) / priceStoreJpy * 100`%でWeb割引率を表示

#### フォーム仕様

| フィールド | 型 | デフォルト | バリデーション |
|-----------|-----|-----------|---------------|
| パッケージ名* | text | - | 必須 |
| コイン数* | number | 100 | min: 1 |
| Web価格（円）* | number | 120 | min: 1 |
| ストア価格（円）* | number | 160 | min: 1 |
| Stripe Price ID | text(mono) | - | 任意 |
| ソート順 | number | 0 | min: 0 |
| アクティブ | toggle | true | - |

#### モーダルレイアウト

```
┌──────────────────────────────────────┐
│ 新規パッケージ / パッケージ編集               │
├──────────────────────────────────────┤
│ パッケージ名: [____________]               │
│ コイン数:    [____] コイン                  │
│ Web価格:     [____] 円                    │
│ ストア価格:  [____] 円                    │
│              Web割引率: -25.0%（自動計算） │
│ Stripe ID:   [________________________]   │
│ ソート順:    [__]                          │
│ アクティブ:  ○──                           │
├──────────────────────────────────────┤
│ [保存]                [キャンセル]          │
└──────────────────────────────────────┘
```

---

### 5.4 ユーザー管理 `/admin/users`

#### 目的
ユーザー一覧の閲覧・検索、コイン付与、プラン変更、BAN対応。

#### 一覧テーブル仕様

| カラム | 内容 |
|-------|------|
| ユーザー | displayName + email |
| プラン | plan（FREE/STANDARD/PREMIUM バッジ） |
| コイン残高 | coinBalance.balance |
| 関係数 | relationshipCount |
| サブスク数 | activeSubscriptionCount |
| 登録日 | createdAt（YYYY/MM/DD） |
| 最終ログイン | lastLogin（相対時間） |
| 操作 | 詳細ボタン |

**フィルタリング**:
- 検索: email / displayName 部分一致
- プランフィルタ: ALL / FREE / STANDARD / PREMIUM
- ページネーション: 50件/ページ

#### ユーザー詳細スライドオーバー（右パネル）

```
┌──────────────────────────────┐
│ ← 戻る                       │
│ 👤 displayName               │
│    email@example.com          │
│    プラン: [FREE]             │
├──────────────────────────────┤
│ 📊 アクティビティ               │
│   総メッセージ: X,XXX          │
│   総会話数: XXX               │
│   コイン残高: XXX 🪙           │
├──────────────────────────────┤
│ 🎭 フォロー中キャラ              │
│   [アバター] キャラ名 Lv.X      │
│   最終: XX分前 / XXX通         │
├──────────────────────────────┤
│ 👑 FCメンバーシップ              │
│   [アバター] キャラ名           │
├──────────────────────────────┤
│ 🪙 コイン付与                  │
│   [____] コイン  [付与する]     │
│   理由: [_______________]      │
├──────────────────────────────┤
│ ⚙️ アクション                  │
│   [プラン変更▼] [BAN処理]      │
└──────────────────────────────┘
```

#### コイン付与フロー

1. 付与額（整数）・理由を入力
2. POST `/api/admin/users/{id}/coins` `{ amount, description }`
3. 成功 → `CoinTransaction` (type: `ADMIN_ADJUST`) 作成 + `CoinBalance` 更新
4. UI に「✅ XXコインを付与しました」表示

#### BAN処理（将来実装）

現状の代替案: User.settings フィールドに `{ banned: true, bannedAt: "..." }` を保存する方式を暫定採用。  
**実装タスク**: `User` モデルに `bannedAt DateTime?` フィールドを追加し、ログイン時にチェック。

#### プラン変更

PUT `/api/admin/users/{id}/plan` `{ plan: "STANDARD" }`  
ドロップダウン: FREE / STANDARD / PREMIUM

---

### 5.5 モーメンツ管理 `/admin/moments`

#### 目的
キャラクタータイムライン投稿（Moment）の作成・編集・削除・モデレーション。

#### 一覧テーブル仕様

| カラム | 内容 |
|-------|------|
| キャラ | アバター + name |
| タイプ | TEXT/IMAGE/AUDIO/VIDEO バッジ |
| コンテンツ | content（truncate 60文字） |
| 可視性 | PUBLIC/STANDARD/PREMIUM/LEVEL_LOCKED |
| リアクション | reactions._count |
| 公開日時 | publishedAt / scheduledAt |
| 操作 | 編集 / 削除 |

**フィルタ**:
- キャラクター絞り込み（セレクトボックス）
- ページネーション: 20件/ページ

#### 新規作成フォーム

| フィールド | 型 | バリデーション |
|-----------|-----|---------------|
| キャラクター* | select | 必須 |
| タイプ* | select（TEXT/IMAGE/AUDIO/VIDEO） | 必須 |
| コンテンツ | textarea | タイプTEXTの場合必須 |
| メディアURL | text | タイプIMAGE/AUDIO/VIDEO時 |
| 可視性 | select（PUBLIC/STANDARD/PREMIUM/LEVEL_LOCKED） | デフォルト: PUBLIC |
| スケジュール日時 | datetime-local | 任意（未来日時） |

#### モデレーション機能（拡張設計）

現状は削除のみ。追加が推奨される機能:
- **非表示**: `visibility` を `LEVEL_LOCKED` かつ `levelRequired: 999` に変更（実質非表示）
- **コメント一覧表示**: Moment詳細ページでMomentCommentを一覧表示・削除

---

### 5.6 ガチャ管理 `/admin/gacha`

#### 目的
GachaBanner（ガチャバナー）とGachaCard（ガチャカード）のCRUD。

#### バナー管理

**一覧**:
- バナー名、キャラクター、期間（startAt〜endAt）、コスト、状態（アクティブ/終了）
- 一括有効/無効トグル

**フォーム**:
| フィールド | 型 | 内容 |
|-----------|-----|------|
| バナー名* | text | - |
| 説明 | textarea | - |
| キャラクター | select | null=全キャラ混合 |
| 開始日時* | datetime | - |
| 終了日時* | datetime | - |
| 1回コスト | number | デフォルト: 100コイン |
| 10連コスト | number | 省略時は1回×10 |
| SR確定天井 | number | 省略時=天井なし |
| UR天井 | number | デフォルト: 100回 |
| バナー画像URL | text | - |
| テーマカラー | color picker | #HEX |
| 演出タイプ | select | standard/fire/flame/cursed/golden |
| フランチャイズ | text | - |
| アクティブ | toggle | - |

#### カード管理

**一覧**: カード名、レアリティ（N/R/SR/SSR/UR）、キャラクター、カテゴリ、状態

**フォーム**:
| フィールド | 型 | 内容 |
|-----------|-----|------|
| カード名* | text | - |
| キャラクター* | select | - |
| レアリティ* | select（N/R/SR/SSR/UR） | - |
| カテゴリ | select（memory/costume/scene） | - |
| 説明 | textarea | - |
| カード画像URL | text | - |
| イラストURL | text | - |
| ボイスURL | text | - |
| エフェクト設定 | JSON textarea | `{ type, data }` |
| フレームタイプ | select（standard/gold/rainbow） | - |
| フランチャイズ | text | - |
| アクティブ | toggle | - |

---

### 5.7 ショップ管理 `/admin/shop`

#### 目的
ShopItemのCRUD。デジタル商品・物理グッズの管理。

#### 一覧テーブル

| カラム | 内容 |
|-------|------|
| 商品名 | name |
| キャラクター | character.name |
| タイプ | type（digital_wallpaper等） |
| コイン価格 | priceCoins |
| 円価格 | priceJpy（null=コインのみ） |
| 在庫 | stock（null=無限） |
| 状態 | isActive |
| 注文数 | orders._count |

#### フォーム

| フィールド | 型 | バリデーション |
|-----------|-----|---------------|
| 商品名* | text | 必須 |
| キャラクター* | select | 必須 |
| タイプ* | select | 必須 |
| コイン価格* | number | min: 1 |
| 円価格 | number | 任意（物理グッズ用） |
| 商品画像URL | text | - |
| ファイルURL | text | デジタル商品のDL先 |
| 在庫数 | number | null=無限 |
| アクティブ | toggle | - |

---

### 5.8 限定シナリオ `/admin/scenarios`

#### 目的
LimitedScenario（期間限定絆シナリオ）のCRUD。FOMO演出のコンテンツ管理。

#### フォーム

| フィールド | 型 | 内容 |
|-----------|-----|------|
| タイトル* | text | - |
| 説明 | textarea | - |
| コンテンツ* | textarea（大） | シナリオ本文 |
| キャラクター* | select | - |
| 開始日時* | datetime | - |
| 終了日時* | datetime | - |
| アクティブ | toggle | - |

---

### 5.9 ストーリー管理 `/admin/stories`

#### 目的
StoryChapterのCRUD。ストーリーモードのチャプター管理。

#### フォーム

| フィールド | 型 | デフォルト |
|-----------|-----|-----------|
| キャラクター* | select | - |
| チャプター番号* | number | 自動採番 |
| ロケール | select（ja/en/ko/zh） | ja |
| タイトル* | text | - |
| あらすじ* | textarea | - |
| 解放レベル | number | 1 |
| FC限定 | toggle | false |
| トリガープロンプト* | textarea | - |
| 選択肢 | JSON textarea | `[{text, consequence, nextTease, xpReward?}]` |
| コイン報酬 | number | 5 |
| 背景URL | text | - |
| BGMタイプ | select（daily/tension/emotion） | - |
| キャラポーズ | select（normal/happy/angry/sad） | - |
| アクティブ | toggle | true |

---

### 5.10 投票管理 `/admin/polls`

#### 目的
StoryPoll（ユーザー投票型ストーリー）のCRUD。

#### 一覧テーブル

| カラム | 内容 |
|-------|------|
| タイトル | title |
| キャラクター | character.name |
| 投票数 | votes._count |
| 期間 | startsAt〜endsAt |
| 状態 | isActive + 結果選択肢 |

#### フォーム

| フィールド | 型 | 内容 |
|-----------|-----|------|
| タイトル* | text | - |
| 説明 | textarea | - |
| キャラクター* | select | - |
| 選択肢* | dynamic list | `[{id, text}]`、最低2個 |
| 開始日時* | datetime | - |
| 終了日時* | datetime | - |

**結果発表**: 投票終了後に `resultChoiceId` を設定する操作を追加。

---

### 5.11 限定DLコンテンツ `/admin/downloadable-content`

#### 目的
DownloadableContentのCRUD。FC会員向け限定ダウンロードコンテンツ管理。

#### フォーム

| フィールド | 型 | 内容 |
|-----------|-----|------|
| タイトル* | text | - |
| 説明 | textarea | - |
| タイプ* | select（wallpaper/voice_clip/special_art/etc） | - |
| キャラクター* | select | - |
| ファイルURL* | text | `/uploads/content/{id}.ext` |
| サムネイルURL | text | - |
| FC限定 | toggle | true |

---

### 5.12 通知配信 `/admin/notifications`

#### 目的
プッシュ通知・アプリ内通知の配信管理。

#### フォーム

| フィールド | 型 | 内容 |
|-----------|-----|------|
| タイトル* | text | - |
| 本文* | textarea | - |
| 対象 | select（全員/特定プラン/特定キャラフォロワー） | - |
| 配信日時 | datetime | 即時or予約 |

**配信実績一覧**: 過去の配信履歴（タイトル、送信数、既読数、日時）

---

### 5.13 分析 `/admin/analytics`

#### 目的
詳細な利用分析データの閲覧。

#### 表示項目

**期間フィルタ**: 直近7日 / 30日 / 90日 / カスタム

| メトリクス | 内容 |
|-----------|------|
| DAU推移グラフ | 日別アクティブユーザー |
| チャット数推移 | 日別メッセージ数 |
| 収益推移 | 日別コイン購入額（円換算） |
| キャラクター別ランキング | メッセージ数・ユーザー数 |
| コンバージョン率 | 無料→コイン購入率 |
| リテンション | D1/D7/D30リテンション |
| FC加入率 | 全ユーザーに対するFC加入者比率 |

---

### 5.14 中毒設計ダッシュボード `/admin/addiction`

#### 目的
エンゲージメント施策の効果測定と設定。

#### 表示項目

| メトリクス | 内容 |
|-----------|------|
| ストリーク分布 | 0日/1-3日/4-7日/8日以上のユーザー数 |
| Smart DM送信数 | 過去7日のプロアクティブメッセージ数 |
| キャラコメント数 | 過去7日のCharacterCommentCount |
| 月次手紙送信数 | 今月のLetter数 |
| 再訪率 | DM送信後24h以内の返信率 |

**設定パネル**:
- Smart DM送信時刻（デフォルト: 8:00 / 14:00 / 1:00）
- ストリーク復活猶予時間（時間）
- ログインボーナスコイン量（キャラ別）

---

## 6. APIエンドポイント一覧

### 認証

全エンドポイントで `requireAdmin()` による認証チェックが必要。

### 既存APIエンドポイント

#### ダッシュボード

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/dashboard` | KPIサマリー、アラート、7日間DAU |
| GET | `/api/admin/stats` | 管理者権限チェック用 |

#### キャラクター

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/characters` | 一覧（messageCount, uniqueUsers集計付き） |
| POST | `/api/admin/characters` | 新規作成 |
| PUT | `/api/admin/characters` | 更新（`id` bodyに含む） |
| DELETE | `/api/admin/characters?id={id}` | 削除（カスケード） |
| GET | `/api/admin/characters/secrets?characterId={id}` | 秘密コンテンツ一覧 |
| POST | `/api/admin/characters/secrets` | 秘密コンテンツ作成 |
| PUT | `/api/admin/characters/secrets` | 秘密コンテンツ更新 |
| DELETE | `/api/admin/characters/secrets?id={id}` | 秘密コンテンツ削除 |
| PUT | `/api/admin/characters/presence` | プレゼンス設定更新 |
| POST | `/api/admin/characters/generate-soul` | AI: SOUL/VOICE/BOUNDARIES生成 |
| POST | `/api/admin/characters/generate-moments` | AI: 初期Moments生成（5件） |
| POST | `/api/admin/characters/generate-story` | AI: ストーリーチャプター生成（3章） |
| POST | `/api/admin/characters/generate-secrets` | AI: 秘密コンテンツ生成 |

#### コインパッケージ

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/coins` | 一覧（sortOrder昇順） |
| POST | `/api/admin/coins` | 新規作成 |
| PUT | `/api/admin/coins` | 更新（`id` bodyに含む） |
| DELETE | `/api/admin/coins?id={id}` | 削除 |

#### ユーザー

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/users?page=1&search=&plan=` | 一覧（ページネーション） |
| GET | `/api/admin/users/{id}` | ユーザー詳細 |
| PUT | `/api/admin/users/{id}/plan` | プラン変更 |
| POST | `/api/admin/users/{id}/coins` | コイン付与 |

**未実装（追加が必要）**:
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/admin/users/{id}/ban` | BANフラグ設定 |
| DELETE | `/api/admin/users/{id}/ban` | BAN解除 |

#### モーメンツ

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/moments?page=1` | 一覧（ページネーション） |
| POST | `/api/admin/moments` | 新規作成 |
| PUT | `/api/admin/moments` | 更新 |
| DELETE | `/api/admin/moments?id={id}` | 削除 |

#### ガチャ

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/gacha/banners` | バナー一覧 |
| POST | `/api/admin/gacha/banners` | バナー作成 |
| PUT | `/api/admin/gacha/banners/{id}` | バナー更新 |
| DELETE | `/api/admin/gacha/banners/{id}` | バナー削除 |
| GET | `/api/admin/gacha/cards` | カード一覧 |
| POST | `/api/admin/gacha/cards` | カード作成 |
| PUT | `/api/admin/gacha/cards/{id}` | カード更新 |
| DELETE | `/api/admin/gacha/cards/{id}` | カード削除 |

#### その他

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/shop` | ショップ商品一覧 |
| POST | `/api/admin/shop` | 商品作成 |
| PUT | `/api/admin/shop` | 商品更新 |
| DELETE | `/api/admin/shop?id={id}` | 商品削除 |
| GET | `/api/admin/scenarios` | 限定シナリオ一覧 |
| POST | `/api/admin/scenarios` | シナリオ作成 |
| PUT | `/api/admin/scenarios/{id}` | シナリオ更新 |
| DELETE | `/api/admin/scenarios/{id}` | シナリオ削除 |
| GET | `/api/admin/stories` | ストーリー一覧 |
| POST | `/api/admin/stories` | チャプター作成 |
| PUT | `/api/admin/stories` | チャプター更新 |
| DELETE | `/api/admin/stories?id={id}` | チャプター削除 |
| GET | `/api/admin/analytics` | 分析データ |
| GET | `/api/admin/addiction/stats` | エンゲージメント統計 |
| POST | `/api/admin/upload` | 画像アップロード |
| POST | `/api/admin/voice-test` | ボイステスト |
| POST | `/api/admin/translate` | 自動翻訳 |
| POST | `/api/admin/notifications` | 通知配信 |
| GET | `/api/admin/downloadable-content` | DLコンテンツ一覧 |
| POST | `/api/admin/downloadable-content` | DLコンテンツ作成 |

### レスポンス規約

```typescript
// 成功
{ data: T } または T（配列）

// エラー
{ error: string }  // HTTP 4xx/5xx

// ページネーション
{
  items: T[],
  total: number,
  page: number,
  totalPages: number
}
```

---

## 7. DBクエリ設計

### 7.1 ダッシュボード KPI集計

```typescript
// DAU: 今日ログインしたユニークユーザー数
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const dau = await prisma.session.findMany({
  where: { expires: { gte: todayStart } },
  select: { userId: true },
  distinct: ['userId'],
});
// → dau.length

// 新規ユーザー数
const newUsers = await prisma.user.count({
  where: { createdAt: { gte: todayStart } }
});

// 今日のメッセージ数
const totalMessages = await prisma.message.count({
  where: { createdAt: { gte: todayStart } }
});

// 今日のコイン購入額（仮想コイン換算）
const revenue = await prisma.coinTransaction.aggregate({
  where: {
    type: 'PURCHASE',
    createdAt: { gte: todayStart }
  },
  _sum: { amount: true }
});
// → revenue._sum.amount * 1.2 (1コイン≒1.2円と換算)

// 7日間DAU（日別）
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const weeklyData = await prisma.$queryRaw`
  SELECT
    DATE(s.expires - INTERVAL '24 hours') as date,
    COUNT(DISTINCT s."userId") as count
  FROM "Session" s
  WHERE s.expires >= ${sevenDaysAgo}
  GROUP BY DATE(s.expires - INTERVAL '24 hours')
  ORDER BY date ASC
`;
```

### 7.2 キャラクター一覧（集計付き）

```typescript
const characters = await prisma.character.findMany({
  orderBy: { createdAt: 'desc' },
  include: {
    _count: {
      select: { relationships: true }
    }
  }
});

// メッセージ数・ユニークユーザー数はraw queryで集計
const stats = await prisma.$queryRaw`
  SELECT
    r."characterId",
    COUNT(m.id) as message_count,
    COUNT(DISTINCT r."userId") as unique_users
  FROM "Relationship" r
  LEFT JOIN "Conversation" c ON c."relationshipId" = r.id
  LEFT JOIN "Message" m ON m."conversationId" = c.id
  GROUP BY r."characterId"
`;
```

### 7.3 コインパッケージ一覧

```typescript
const packages = await prisma.coinPackage.findMany({
  orderBy: { sortOrder: 'asc' }
});
```

### 7.4 ユーザー一覧（ページネーション）

```typescript
const PAGE_SIZE = 50;

const where: Prisma.UserWhereInput = {
  ...(search ? {
    OR: [
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } }
    ]
  } : {}),
  ...(plan ? { plan: plan as Plan } : {})
};

const [users, total] = await Promise.all([
  prisma.user.findMany({
    where,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      displayName: true,
      plan: true,
      createdAt: true,
      coinBalance: { select: { balance: true } },
      _count: {
        select: {
          relationships: true,
          characterSubscriptions: true
        }
      }
    }
  }),
  prisma.user.count({ where })
]);
```

### 7.5 コイン付与

```typescript
async function grantCoins(userId: string, amount: number, description: string) {
  const [balance] = await Promise.all([
    prisma.coinBalance.upsert({
      where: { userId },
      create: { userId, balance: amount, freeBalance: amount, paidBalance: 0 },
      update: {
        balance: { increment: amount },
        freeBalance: { increment: amount }
      }
    })
  ]);

  await prisma.coinTransaction.create({
    data: {
      userId,
      type: 'ADMIN_ADJUST',
      amount,
      balanceAfter: balance.balance,
      description,
    }
  });

  return balance;
}
```

### 7.6 モーメンツ一覧

```typescript
const PAGE_SIZE = 20;

const moments = await prisma.moment.findMany({
  skip: (page - 1) * PAGE_SIZE,
  take: PAGE_SIZE,
  orderBy: { createdAt: 'desc' },
  include: {
    character: {
      select: { id: true, name: true, avatarUrl: true }
    },
    _count: {
      select: { reactions: true, comments: true }
    }
  }
});
```

### 7.7 分析クエリ

```typescript
// キャラクター別メッセージランキング（直近30日）
const charRanking = await prisma.$queryRaw`
  SELECT
    c.name,
    c."avatarUrl",
    COUNT(m.id) as total_messages,
    COUNT(DISTINCT r."userId") as unique_users
  FROM "Character" c
  JOIN "Relationship" r ON r."characterId" = c.id
  JOIN "Conversation" cv ON cv."relationshipId" = r.id
  JOIN "Message" m ON m."conversationId" = cv.id
  WHERE m."createdAt" >= NOW() - INTERVAL '30 days'
  GROUP BY c.id, c.name, c."avatarUrl"
  ORDER BY total_messages DESC
  LIMIT 10
`;

// D1リテンション
const d1Retention = await prisma.$queryRaw`
  WITH new_users AS (
    SELECT id, "createdAt"::date as signup_date
    FROM "User"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
  ),
  returning_users AS (
    SELECT DISTINCT nu.id
    FROM new_users nu
    JOIN "Session" s ON s."userId" = nu.id
    WHERE DATE(s.expires) = nu.signup_date + INTERVAL '1 day'
  )
  SELECT
    COUNT(nu.id) as cohort_size,
    COUNT(ru.id) as returned,
    ROUND(COUNT(ru.id)::numeric / NULLIF(COUNT(nu.id), 0) * 100, 1) as d1_rate
  FROM new_users nu
  LEFT JOIN returning_users ru ON ru.id = nu.id
`;
```

### 7.8 エンゲージメント統計（中毒設計）

```typescript
// ストリーク分布
const streakDistribution = await prisma.$queryRaw`
  SELECT
    CASE
      WHEN "streakDays" = 0 THEN '0日'
      WHEN "streakDays" BETWEEN 1 AND 3 THEN '1-3日'
      WHEN "streakDays" BETWEEN 4 AND 7 THEN '4-7日'
      ELSE '8日以上'
    END as range,
    COUNT(*) as count
  FROM "Relationship"
  GROUP BY range
  ORDER BY MIN("streakDays")
`;

// Smart DM効果（送信後24h以内の返信率）
const dmEffectiveness = await prisma.$queryRaw`
  SELECT
    COUNT(pm.id) as sent_count,
    COUNT(DISTINCT CASE
      WHEN m."createdAt" BETWEEN pm."createdAt" AND pm."createdAt" + INTERVAL '24 hours'
      THEN pm."userId"
    END) as responded_count
  FROM "CharacterProactiveMessage" pm
  LEFT JOIN "Relationship" r ON r."userId" = pm."userId" AND r."characterId" = pm."characterId"
  LEFT JOIN "Conversation" c ON c."relationshipId" = r.id
  LEFT JOIN "Message" m ON m."conversationId" = c.id AND m.role = 'USER'
  WHERE pm."createdAt" >= NOW() - INTERVAL '7 days'
`;
```

---

## 8. 完了条件（Definition of Done）

### 必須（Priority 1）

- [ ] **認証**: `ADMIN_EMAILS` 環境変数で管理者メールを設定すれば `/admin` にアクセスできる
- [ ] **ダッシュボード**: DAU・新規ユーザー・チャット数・収益の4KPIが正しく表示される
- [ ] **キャラクター作成**: ウィザード7ステップを完了するとDBにキャラクターが登録され、 `/chat/{slug}` でアクセスできる
- [ ] **キャラクター編集**: 既存キャラクターの全フィールドを変更・保存できる
- [ ] **キャラクター削除**: 削除確認ダイアログ後に削除、関連データがカスケード削除される
- [ ] **コインパッケージCRUD**: 新規作成・編集・削除が動作し、ユーザーサイドのショップページに即時反映される
- [ ] **ユーザー一覧**: 50件/ページでページネーション、メール検索、プランフィルタが動作する
- [ ] **コイン付与**: 任意のユーザーにコインを付与でき、CoinTransactionに `ADMIN_ADJUST` タイプで記録される
- [ ] **モーメンツ作成**: キャラクター選択・タイプ・コンテンツ・可視性を設定して投稿作成できる
- [ ] **モーメンツ削除**: 不適切コンテンツを削除できる

### 推奨（Priority 2）

- [ ] **キャラクターAI生成**: SOUL/VOICE/BOUNDARIES のAI自動生成が動作する
- [ ] **初期Moments AI生成**: キャラクター作成後に5件のMomentsをAIで自動生成できる
- [ ] **多言語設定**: キャラクターの EN/KO/ZH 言語設定を保存できる
- [ ] **自動翻訳**: 「🤖 自動翻訳」でシステムプロンプトをEN/KO/ZHに翻訳できる
- [ ] **7日間DAUチャート**: ダッシュボードに棒グラフが表示される
- [ ] **プレゼンス設定**: キャラクターの手動プレゼンス（ステータス・絵文字）を設定できる
- [ ] **秘密コンテンツ管理**: キャラクターごとの SecretContent を追加・編集・削除できる

### 将来課題（Priority 3）

- [ ] **BANシステム**: ユーザーのBANフラグ設定（`User.bannedAt` フィールド追加が必要）
- [ ] **通報管理**: Report モデルの追加と管理画面
- [ ] **コメントモデレーション**: Momentのコメント一覧・削除
- [ ] **分析グラフ**: リテンション・コンバージョン率のビジュアライゼーション
- [ ] **通知スケジューリング**: プッシュ通知の予約配信

---

## 9. 実装優先度

```
Phase 1（完了済み・本番稼働中）
├── ダッシュボード基本KPI
├── キャラクター管理（全機能）
├── コインパッケージCRUD
├── ユーザー管理・コイン付与
├── モーメンツ管理
└── ガチャ・ショップ管理

Phase 2（追加実装推奨）
├── BANシステム（User.bannedAt追加）
├── モーメンツコメントモデレーション
├── 分析グラフ拡充
└── 通知配信機能

Phase 3（将来）
├── 通報管理システム
├── A/Bテスト管理
└── 収益レポート自動生成・CSVエクスポート
```

---

## 10. 未実装・将来課題

### 機能的ギャップ

| 項目 | 詳細 | 工数見積 |
|------|------|---------|
| BANシステム | `User` に `bannedAt`, `banReason` フィールド追加 + ログイン時チェック | 1日 |
| コメントモデレーション | `MomentComment` の一覧・削除UI + API | 0.5日 |
| 通報管理 | `Report` モデル追加 + 管理画面 | 2日 |
| CSVエクスポート | ユーザー一覧・トランザクション履歴のエクスポート | 1日 |

### DBスキーマ追加提案

```prisma
// BANシステム用
model User {
  // ... existing fields
  bannedAt      DateTime?  // BANされた日時（nullは正常）
  banReason     String?    // BAN理由
  banAdminEmail String?    // BAN実施した管理者メール
}

// 通報システム用（将来）
model Report {
  id          String   @id @default(uuid())
  reporterId  String
  targetType  String   // 'moment' | 'comment' | 'user'
  targetId    String
  reason      String
  status      String   @default("pending") // pending | resolved | dismissed
  resolvedBy  String?
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  reporter    User     @relation(fields: [reporterId], references: [id])
}
```

### セキュリティ考慮事項

1. **SQLインジェクション**: Prisma ORM使用のため基本的に安全。`$queryRaw` 使用箇所はテンプレートリテラル（`$queryRaw\`...\``）を使用してパラメータをサニタイズ
2. **CSRF**: NextAuth.js が管理するセッショントークンで保護
3. **レート制限**: 管理APIへの過剰なリクエストを制限（現状未実装）
4. **監査ログ**: 管理者操作（コイン付与・削除等）を `CoinTransaction` や将来のAuditLogに記録

---

*設計書作成: ANIVA開発チーム / 2026-03-07*
