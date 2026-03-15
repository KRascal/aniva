# ANIVA 管理画面完全版 実装計画

> 作成日: 2026-03-16  
> 対象ディレクトリ: `/home/openclaw/.openclaw/workspace/aniva/web`  
> 設計方針: 既存コードを壊さず疎結合。各Waveが独立デプロイ可能。

---

## 現状の既存コード確認結果

### AdminUserスキーマ（prisma/schema.prisma）
```prisma
model AdminUser {
  id          String    @id @default(uuid())
  email       String    @unique
  name        String
  role        String    @default("viewer") // super_admin | ip_admin | editor | viewer
  tenantId    String?
  tenant      Tenant?   @relation(fields: [tenantId], references: [id])
  isActive    Boolean   @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  approvalActions  ApprovalAction[]
  approvalRequests ApprovalRequest[]
  auditLogs        AdminAuditLog[]
}
```

### 認証ライブラリ現状
- `src/lib/admin.ts` — 旧方式。`ADMIN_EMAILS`環境変数による`requireAdmin()`
- `src/lib/rbac.ts` — 新方式（既に実装済み）。`requireRole(minRole)`が存在
- ロール定義: `super_admin(100) > ip_admin(50) > editor(30) > viewer(10)`
- `tenantScope()`, `canAccessCharacter()` も既に実装済み

### APIの認証方式の現状
- **141本のAPIルートのうち141本が`requireAdmin()`（旧方式）を使用**
- `requireRole()`を使っているのは`tenants/[id]/members` と `auth-context` のみ
- `revenue/route.ts` は認証なし（！要修正）

### 管理画面UIの現状
- `src/app/admin/layout.tsx` — クライアントコンポーネント、サイドバー構造
- `src/app/admin/characters/page.tsx` — CharacterTable + CharacterWizard + CharacterEditModal
- `src/components/admin/characters/` — 14ファイル（BasicSettingsTab, CharacterTable, CharacterWizard等）
- `src/app/admin/characters/[id]/bible/` — Soul/Quotes/Boundaries/Voice の4タブ（既実装）

### 既存AI生成エンドポイント
- `/api/admin/characters/generate-soul` — claude-opus-4-5 で Soul/Voice/Boundaries生成（requireAdminのみ）
- `/api/admin/characters/[id]/ai-enrich` — 人格深掘り（旧認証方式）
- `/api/admin/characters/generate-secrets` — シークレット生成
- `/api/admin/characters/generate-moments` — 瞬間生成
- `/api/admin/characters/generate-story` — ストーリー生成

---

## 1. 権限モデル設計

### 1.1 ロール体系（Keisuke要件→既存に対応）

| Keisuke要件 | 既存ロール | 説明 |
|---|---|---|
| SUPER_ADMIN | `super_admin` | K-Rascal運営。全データ閲覧/編集可 |
| IP_ADMIN | `ip_admin` | IPホルダー。自テナントのキャラのみ。ユーザー個人情報不可 |
| CONTENT_ADMIN | `editor` | コンテンツ担当。キャラ設定/ストーリー/ガチャ編集のみ |
| （監視専用）| `viewer` | 読み取りのみ |

**既存の`role`カラムのvaluesに`content_admin`は不要。`editor`がCONTENT_ADMINに対応する。**

### 1.2 DBスキーマ変更（なし）

既存の`AdminUser.role`は`String`型で十分。値は`super_admin | ip_admin | editor | viewer`のまま。
`content_admin`という新ロールは導入せず、`editor`に統一する。

### 1.3 アクセス制御マトリクス

| APIエンドポイント | super_admin | ip_admin | editor | viewer |
|---|---|---|---|---|
| `/api/admin/users` | ✅ 全件 | ❌ | ❌ | ❌ |
| `/api/admin/users/[id]` | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/revenue` | ✅ | ✅（テナント匿名集計のみ） | ❌ | ❌ |
| `/api/admin/analytics` | ✅ | ✅（テナントスコープ） | ❌ | ❌ |
| `/api/admin/characters` | ✅ | ✅（自テナントのみ） | ✅（自テナントのみ） | ✅（読み取り） |
| `/api/admin/stories` | ✅ | ✅（自テナント） | ✅（自テナント） | ❌ |
| `/api/admin/gacha` | ✅ | ✅（自テナント） | ✅（自テナント） | ❌ |
| `/api/admin/scenarios` | ✅ | ✅（自テナント） | ✅（自テナント） | ❌ |
| `/api/admin/coins` | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/contracts` | ✅ | ✅（自テナント） | ❌ | ❌ |
| `/api/admin/tenants` | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/guardrails` | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/emergency-stop` | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/audit-log` | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/addiction` | ✅ | ❌ | ❌ | ❌ |

### 1.4 ミドルウェア設計

`src/lib/rbac.ts`を拡張する。新規追加関数:

```typescript
// src/lib/rbac.ts に追加

/**
 * IP_ADMINがユーザー個人情報にアクセスしようとした場合にブロック
 * 呼び出しパターン: const ctx = await requireRoleAndDenyUserData('ip_admin')
 */
export function blockUserDataForNonSuperAdmin(ctx: AdminContext): boolean {
  return ctx.role !== 'super_admin';
}

/**
 * revenue APIをip_admin向けに匿名集計に変換するスコープ
 * super_adminは全テナント生データ、ip_adminはテナント匿名集計のみ
 */
export function revenueScope(ctx: AdminContext): {
  restrictToTenant: string | null;
  anonymize: boolean;
} {
  if (ctx.role === 'super_admin') return { restrictToTenant: null, anonymize: false };
  return { restrictToTenant: ctx.tenantId, anonymize: true };
}
```

### 1.5 既存APIの認証マイグレーション方針

141本の`requireAdmin()`を`requireRole()`に置き換える。**Wave 1で全部やる。**

マイグレーションパターン（コピペ可能）:

```typescript
// Before（旧方式）:
const admin = await requireAdmin();
if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

// After（新方式）:
const ctx = await requireRole('super_admin'); // または適切なロール
if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
// テナントスコープが必要な場合:
const scope = tenantScope(ctx);  // { tenantId?: string }
```

### 1.6 サイドバーのロール別表示制御

`src/app/admin/layout.tsx`を改修。`/api/admin/auth-context`から取得したroleに基づきメニュー項目を表示/非表示。

```typescript
// layout.tsx の useEffect 内で取得済みの authContext を参照
const isSuperAdmin = authContext?.role === 'super_admin';
const isIpAdmin = authContext?.role === 'ip_admin';
const isEditor = authContext?.role === 'editor';

// 非表示にするメニュー項目:
// - Users → super_admin のみ
// - Coins → super_admin のみ  
// - Guardrails → super_admin のみ
// - AuditLog → super_admin のみ
// - Tenants → super_admin のみ
```

---

## 2. AI自動化レイヤー設計

### 2.1 キャラ設定自動生成API（新規）

**エンドポイント:** `POST /api/admin/characters/ai-generate`  
**ファイル:** `src/app/api/admin/characters/ai-generate/route.ts`  
**使用モデル:** `claude-opus-4-6`（Keisuke指示: Opus級）

**入力:**
```typescript
{
  characterName: string;    // キャラ名（例: "佐倉綾音"）
  franchiseName: string;    // 作品名（例: "恋愛アドベンチャー学園"）
  brief?: string;           // 補足説明（省略可）
  saveImmediately?: boolean; // trueなら即座にDBに保存（デフォルト: false）
  characterId?: string;      // 既存キャラに紐付ける場合
}
```

**Claudeへのプロンプト設計:**
```
あなたはアニメ/ゲームキャラクターの人格設計の専門家です。
キャラクター「{characterName}」（作品: {franchiseName}）の完全な人格設定を生成してください。

以下のJSON構造で返答してください:
{
  "coreIdentity": "何者かの1行定義（例: 表向きクールだが実は寂しがり屋の生徒会長）",
  "motivation": "行動原理・動機（200文字）",
  "worldview": "世界観・価値観（200文字）",
  "systemPrompt": "LLMに渡すsystem prompt（800文字）",
  "emotionalPatterns": {
    "triggers": [
      { "stimulus": "恋愛の話題", "response": "照れて早口になる", "intensity": 8 },
      ...5件
    ],
    "avoidances": [
      { "topic": "過去の失恋", "reason": "トラウマ", "deflection": "話題を変えようとする" },
      ...3件
    ]
  },
  "voice": {
    "firstPerson": "私",
    "secondPerson": "あなた",
    "sentenceEndings": ["〜ですわ", "〜かしら", "〜ね"],
    "exclamations": ["まあ！", "いやね"],
    "toneRules": "丁寧語ベース。親しくなると語尾が崩れる。怒ると標準語になる。"
  },
  "boundaries": [
    { "rule": "実在人物を傷つける発言は絶対にしない", "category": "behavior", "severity": "hard" },
    ...3件
  ],
  "loreMemories": [
    { "title": "第1話：出会いのシーン", "content": "...", "importance": 9 },
    ...5件
  ],
  "relationships": {
    "ライバルの田中": "表向き対立しているが内心は認めている",
    ...
  },
  "famousQuotes": [
    { "quote": "「私は負けないわ、絶対に」", "context": "試合前の名シーン", "emotion": "determined" },
    ...5件
  ],
  "qualityScore": 85
}
```

**出力処理:**
1. Claudeのレスポンスをパース
2. `saveImmediately: true` の場合:
   - `CharacterSoul`をupsert（coreIdentity, motivation, worldview, emotionalPatterns, relationshipMap）
   - `CharacterVoice`をupsert（firstPerson, secondPerson, sentenceEndings等）
   - `CharacterBoundary`をcreateMany（既存は削除してから再作成）
   - `CharacterQuote`をcreateMany（famousQuotes → quotes）
   - `Character.systemPrompt`を更新
3. レスポンスにgenerated dataと保存結果を返す

**権限:** `requireRole('editor')` — editor以上ならAI生成可能

### 2.2 ストーリー自動生成強化

**既存エンドポイント:** `POST /api/admin/characters/generate-story`（既存ファイル修正）

**追加するフィールド（演出パラメータ）:**
```typescript
// 既存のストーリー生成レスポンスに追加
"stagingProposals": {
  "background": "schoolRooftop", // 背景ID候補
  "bgm": "gentle_piano",         // BGM候補
  "poses": ["thinking", "smile"], // キャラクターポーズ候補
  "effectSuggestion": "桜吹雪エフェクト"
}
```

**Claudeプロンプトへの追加指示:**
```
さらに、このシーンに最適な演出パラメータをJSON形式で提案してください:
- background: schoolRooftop | bedroom | park | cafe | fantasy などの背景ID
- bgm: gentle_piano | dramatic | upbeat | silent などのBGMタイプ
- poses: キャラクターの状態（2個まで）
- effectSuggestion: 特殊エフェクトの提案（任意）
```

### 2.3 イベント自動企画API（新規）

**エンドポイント:** `POST /api/admin/characters/ai-event-plan`  
**ファイル:** `src/app/api/admin/characters/ai-event-plan/route.ts`

**入力:**
```typescript
{
  monthName: string;      // "2026年4月"
  characterIds: string[]; // 対象キャラID（複数可）
  eventType?: string;     // "birthday" | "seasonal" | "anniversary" | null
}
```

**出力（Claude生成）:**
```typescript
{
  eventTitle: string;
  period: { start: string; end: string }; // ISO8601
  theme: string;
  limitedScenarios: Array<{
    title: string;
    description: string;
    specialReward: string;
    coinRequirement: number;
  }>;
  gachaProposal: {
    bannerTitle: string;
    featuredCharacters: string[];
    limitedCards: Array<{ rarity: string; description: string }>;
  };
  marketingCopy: string; // SNS告知文
}
```

**権限:** `requireRole('ip_admin')` — ip_admin以上

### 2.4 口調品質スコアリングAPI（新規）

**エンドポイント:** `POST /api/admin/characters/[id]/tone-score`  
**ファイル:** `src/app/api/admin/characters/[id]/tone-score/route.ts`

**処理フロー:**
1. `CharacterSoul`, `CharacterVoice`, `CharacterBoundary`を取得
2. Claude（opus-4-6）にSOULデータを渡し、テストメッセージ10件を生成させる
3. 生成した10件を別の推論で評価させ、整合性スコア（0-100）を算出
4. スコアの内訳（口調一致度/感情表現/境界線遵守）とフィードバックを返す

**権限:** `requireRole('editor')` — editor以上

---

## 3. 全54項目の実装順序

### Wave 1: 権限モデル + AI自動生成 + 感情/回避/Lore GUI
> **前提:** なし。Wave 1は独立して着手可能。  
> **目的:** 基盤を固める。全APIを安全にし、AI自動化を実用化する。  
> **推定工数:** 約60ファイル変更/新規、3-5日

#### 1-A: 全API認証マイグレーション（141本 → requireRole）

**変更するファイル（41本のrequireAdminを置換）:**
```
src/app/api/admin/stories/route.ts
src/app/api/admin/tenants/route.ts
src/app/api/admin/tenants/[id]/route.ts
src/app/api/admin/tenants/[id]/characters/route.ts
src/app/api/admin/scenarios/route.ts
src/app/api/admin/scenarios/[id]/route.ts
src/app/api/admin/reports/route.ts
src/app/api/admin/reports/[id]/route.ts
src/app/api/admin/gacha/cards/route.ts
src/app/api/admin/gacha/banners/route.ts
src/app/api/admin/gacha/banners/[id]/route.ts
src/app/api/admin/shop/route.ts
src/app/api/admin/letters/route.ts
src/app/api/admin/coins/route.ts
src/app/api/admin/notifications/route.ts
src/app/api/admin/moments/route.ts
src/app/api/admin/analytics/route.ts
src/app/api/admin/revenue/route.ts  ← 認証なしも修正
src/app/api/admin/approvals/route.ts
src/app/api/admin/approvals/[id]/route.ts
src/app/api/admin/onboarding/ip/route.ts
src/app/api/admin/audit-log/route.ts
src/app/api/admin/downloadable-content/route.ts
src/app/api/admin/upload/route.ts
src/app/api/admin/voice-test/route.ts
src/app/api/admin/users/route.ts
src/app/api/admin/users/[id]/plan/route.ts
src/app/api/admin/users/[id]/coins/route.ts
src/app/api/admin/users/[id]/grant/route.ts
src/app/api/admin/characters/route.ts
src/app/api/admin/characters/bulk-import/route.ts
src/app/api/admin/characters/generate-soul/route.ts
src/app/api/admin/characters/generate-secrets/route.ts
src/app/api/admin/characters/generate-moments/route.ts
src/app/api/admin/characters/generate-story/route.ts
src/app/api/admin/characters/bootstrap/route.ts
src/app/api/admin/characters/secrets/route.ts
src/app/api/admin/characters/presence/route.ts
src/app/api/admin/characters/[id]/soul/route.ts
src/app/api/admin/characters/[id]/ai-enrich/route.ts
src/app/api/admin/characters/[id]/quotes/route.ts
src/app/api/admin/characters/[id]/test-chat/route.ts
src/app/api/admin/characters/[id]/boundaries/route.ts
src/app/api/admin/characters/[id]/voice/route.ts
src/app/api/admin/feedback/route.ts
src/app/api/admin/feedback/[id]/route.ts
src/app/api/admin/contracts/route.ts
src/app/api/admin/contracts/[id]/route.ts
src/app/api/admin/guardrails/route.ts
src/app/api/admin/guardrails/[id]/route.ts
src/app/api/admin/guardrails/logs/route.ts
src/app/api/admin/lore/route.ts
src/app/api/admin/lore/[id]/route.ts
src/app/api/admin/emergency-stop/route.ts
src/app/api/admin/translate/route.ts
src/app/api/admin/stats/route.ts
src/app/api/admin/dashboard/route.ts
src/app/api/admin/addiction/stats/route.ts
```

**変更するファイル（既存ライブラリ）:**
```
src/lib/rbac.ts  ← blockUserDataForNonSuperAdmin(), revenueScope() 追加
src/lib/admin.ts ← 変更なし（後方互換のため維持）
```

**DB変更:** なし（AdminUser.roleは既存のまま）

#### 1-B: サイドバーのロール別表示制御

**変更するファイル:**
```
src/app/admin/layout.tsx  ← authContextのroleに基づきメニュー項目を条件付き表示
```

**ロール別表示ルール（実装する）:**
- Users, Coins, Guardrails, AuditLog, Tenants, EmergencyStop → `super_admin`のみ表示
- Revenue, Analytics → `super_admin` + `ip_admin`のみ表示
- Characters, Stories, Gacha, Scenarios, Lore, Moments → `editor`以上表示

#### 1-C: AI自動生成API（新規）

**新規作成するファイル:**
```
src/app/api/admin/characters/ai-generate/route.ts
src/app/api/admin/characters/ai-event-plan/route.ts
src/app/api/admin/characters/[id]/tone-score/route.ts
```

**既存ファイル変更:**
```
src/app/api/admin/characters/generate-story/route.ts  ← 演出パラメータ追加
```

**モデル:** `claude-opus-4-6`（全AI生成エンドポイント統一）  
既存の`generate-soul`で使われていた`claude-opus-4-5`も`claude-opus-4-6`に更新。

#### 1-D: 感情トリガー/回避パターン GUI

**現状:** `CharacterSoul.emotionalPatterns` はJSON型で存在するがGUIなし。Bibleページの`BibleSoulTab`で文字列表示のみ。

**変更するファイル:**
```
src/components/admin/bible/BibleSoulTab.tsx  ← emotionalPatternsのJSON編集UIを追加
src/app/api/admin/characters/[id]/soul/route.ts  ← PATCH: emotionalPatterns更新対応
```

**新規作成するファイル:**
```
src/components/admin/bible/EmotionPatternsEditor.tsx  ← トリガー/回避パターンのCRUD UI
```

**EmotionPatternsEditorのUI仕様:**
- トリガーリスト（刺激→反応→強度のフォーム）
- 回避パターンリスト（トピック→理由→回避行動のフォーム）
- 「AIで自動生成」ボタン（ai-generateを呼ぶ）

#### 1-E: Lore管理GUI強化

**現状:** `src/app/admin/lore/page.tsx`が存在。`src/app/admin/lore/[id]/page.tsx`も存在。

**変更するファイル:**
```
src/app/admin/lore/page.tsx  ← テナントスコープ対応（ip_adminは自テナントのみ）
src/app/api/admin/lore/route.ts  ← requireRole('editor') + tenantScope追加
src/app/api/admin/lore/[id]/route.ts  ← requireRole('editor') + tenantScope追加
```

**新規作成するファイル:**
```
src/components/admin/lore/LoreAiImportButton.tsx  ← キャラ名入力→Lore一括AI生成
src/app/api/admin/lore/ai-import/route.ts  ← Lore一括生成エンドポイント
```

---

### Wave 2: 演出エディタ + 限定イベント + コイン経済GUI
> **前提:** Wave 1の権限モデルが完了していること。  
> **目的:** コンテンツクリエイターの制作効率向上。  
> **推定工数:** 約35ファイル新規/変更、3-4日

#### 2-A: ストーリー演出エディタ

**新規作成するファイル:**
```
src/components/admin/stories/StagingEditor.tsx  ← 背景/BGM/ポーズ選択UI
src/components/admin/stories/StoryChapterEditor.tsx  ← チャプター単位エディタ
src/app/api/admin/stories/[id]/staging/route.ts  ← 演出パラメータ保存
```

**変更するファイル:**
```
src/app/admin/stories/page.tsx  ← StagingEditorを組み込み
src/app/api/admin/stories/route.ts  ← requireRole('editor') + tenantScope追加
```

**DB変更:** `StoryChapter`テーブルにカラム追加
```sql
ALTER TABLE "StoryChapter" ADD COLUMN "backgroundId" TEXT;
ALTER TABLE "StoryChapter" ADD COLUMN "bgmType" TEXT;
ALTER TABLE "StoryChapter" ADD COLUMN "characterPoses" JSONB DEFAULT '[]';
ALTER TABLE "StoryChapter" ADD COLUMN "visualEffects" JSONB DEFAULT '[]';
```
```prisma
// schema.prismaのStoryChapterモデルに追加
backgroundId   String?
bgmType        String?  // gentle_piano|dramatic|upbeat|silent
characterPoses Json     @default("[]")
visualEffects  Json     @default("[]")
```
マイグレーション: `prisma/migrations/YYYYMMDD_story_staging/migration.sql`

#### 2-B: 限定イベント管理

**新規作成するファイル:**
```
src/app/admin/events/page.tsx  ← イベント一覧/作成
src/app/admin/events/[id]/page.tsx  ← イベント詳細編集
src/components/admin/events/EventWizard.tsx  ← 月名入力→AIイベント提案→確定フロー
src/components/admin/events/EventCalendar.tsx  ← カレンダービュー
src/app/api/admin/events/route.ts  ← GET/POST
src/app/api/admin/events/[id]/route.ts  ← GET/PATCH/DELETE
```

**変更するファイル:**
```
src/app/admin/layout.tsx  ← Eventsメニュー項目追加
```

**DB変更:** `AdminEvent`テーブル新規作成
```prisma
model AdminEvent {
  id            String   @id @default(uuid())
  title         String
  tenantId      String?
  tenant        Tenant?  @relation(fields: [tenantId], references: [id])
  startAt       DateTime
  endAt         DateTime
  theme         String?
  status        String   @default("draft") // draft|active|ended
  eventData     Json     @default("{}") // AIが生成した詳細データ
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```
マイグレーション: `prisma/migrations/YYYYMMDD_admin_event/migration.sql`

#### 2-C: コイン経済GUI

**現状:** `src/app/admin/coins/page.tsx`が存在。

**変更するファイル:**
```
src/app/admin/coins/page.tsx  ← パッケージ設定UI + コイン付与フォーム整備
src/app/api/admin/coins/route.ts  ← requireRole('super_admin')に昇格
```

**新規作成するファイル:**
```
src/components/admin/coins/CoinPackageEditor.tsx  ← パッケージ価格設定UI
src/components/admin/coins/CoinGrantForm.tsx  ← 個別ユーザーへのコイン付与（super_adminのみ）
src/components/admin/coins/CoinEconomyDashboard.tsx  ← 流通量グラフ（super_adminのみ）
src/app/api/admin/coins/packages/route.ts  ← コインパッケージCRUD
src/app/api/admin/coins/economy/route.ts  ← 流通量統計
```

---

### Wave 3: IPオンボーディングウィザード + コンテンツカレンダー + ヘルス監視
> **前提:** Wave 1完了。Wave 2のイベント機能があると連携可能だが必須ではない。  
> **目的:** IPホルダーが自分でオンボードできる環境を整える。  
> **推定工数:** 約30ファイル新規/変更、3日

#### 3-A: IPオンボーディングウィザード

**現状:** `src/app/api/admin/onboarding/ip/route.ts`が存在（部分実装）。

**変更するファイル:**
```
src/app/api/admin/onboarding/ip/route.ts  ← requireRole('super_admin') + フロー完成
```

**新規作成するファイル:**
```
src/app/admin/onboarding/page.tsx  ← ウィザード画面
src/components/admin/onboarding/IPOnboardingWizard.tsx  ← 5ステップウィザード
src/components/admin/onboarding/TenantSetupStep.tsx  ← テナント作成
src/components/admin/onboarding/AdminUserInviteStep.tsx  ← ip_admin招待（メール送信）
src/components/admin/onboarding/CharacterBulkImportStep.tsx  ← キャラ一括登録
src/components/admin/onboarding/AIGenerateAllStep.tsx  ← 全キャラAI設定一括生成
src/components/admin/onboarding/GoLiveStep.tsx  ← 最終確認 + 公開
src/app/api/admin/onboarding/invite/route.ts  ← ip_admin招待メール送信
```

**DB変更:** なし（既存Tenant + AdminUserで対応可能）

#### 3-B: コンテンツカレンダー

**新規作成するファイル:**
```
src/app/admin/calendar/page.tsx  ← カレンダーUI（ip_admin以上）
src/components/admin/calendar/ContentCalendar.tsx  ← 月次カレンダービュー
src/components/admin/calendar/CalendarEventCard.tsx  ← イベントカード
src/app/api/admin/calendar/route.ts  ← イベント/ストーリー公開日の集計
```

**変更するファイル:**
```
src/app/admin/layout.tsx  ← Calendarメニュー追加
```

#### 3-C: ヘルス監視ダッシュボード

**新規作成するファイル:**
```
src/app/admin/health/page.tsx  ← システムヘルス画面（super_adminのみ）
src/components/admin/health/HealthDashboard.tsx  ← API応答時間/エラー率/DB接続
src/components/admin/health/AIHealthPanel.tsx  ← Claude API使用量/エラー率
src/app/api/admin/health/route.ts  ← ヘルスチェック集計API
```

**変更するファイル:**
```
src/app/admin/layout.tsx  ← Healthメニュー追加（super_adminのみ）
```

---

### Wave 4: チャットモニター + ユーザーライフサイクル + データエクスポート
> **前提:** Wave 1完了（ユーザーデータアクセス制御が必須）。  
> **目的:** super_adminのオペレーション能力を完成させる。  
> **推定工数:** 約25ファイル新規/変更、2-3日

#### 4-A: チャットモニター（super_adminのみ）

**新規作成するファイル:**
```
src/app/admin/chat-monitor/page.tsx  ← リアルタイムチャット監視（super_adminのみ）
src/components/admin/monitor/ChatMonitorList.tsx  ← 会話一覧（ユーザー名/キャラ/最終メッセージ）
src/components/admin/monitor/ConversationViewer.tsx  ← 会話詳細（メッセージ全文）
src/app/api/admin/monitor/conversations/route.ts  ← requireRole('super_admin') 会話一覧
src/app/api/admin/monitor/conversations/[id]/route.ts  ← 会話詳細
```

**変更するファイル:**
```
src/app/admin/layout.tsx  ← ChatMonitorメニュー追加（super_adminのみ）
```

#### 4-B: ユーザーライフサイクル管理

**現状:** `src/app/admin/users/page.tsx`が存在。`src/app/api/admin/users/route.ts`は`requireAdmin()`（旧方式）。

**変更するファイル:**
```
src/app/admin/users/page.tsx  ← 解約フロー/プラン変更/コイン残高編集UI追加
src/app/api/admin/users/route.ts  ← requireRole('super_admin')
src/app/api/admin/users/[id]/plan/route.ts  ← requireRole('super_admin')
src/app/api/admin/users/[id]/coins/route.ts  ← requireRole('super_admin')
src/app/api/admin/users/[id]/grant/route.ts  ← requireRole('super_admin')
```

**新規作成するファイル:**
```
src/components/admin/users/UserLifecyclePanel.tsx  ← プラン変更/解約/コイン操作
src/app/api/admin/users/[id]/deactivate/route.ts  ← アカウント無効化
src/app/api/admin/users/[id]/export/route.ts  ← 個人情報エクスポート（GDPR）
```

#### 4-C: データエクスポート

**新規作成するファイル:**
```
src/app/admin/export/page.tsx  ← エクスポート画面（super_adminのみ）
src/components/admin/export/ExportPanel.tsx  ← CSVエクスポートUI
src/app/api/admin/export/users/route.ts  ← ユーザーデータCSV
src/app/api/admin/export/revenue/route.ts  ← 収益データCSV
src/app/api/admin/export/analytics/route.ts  ← 行動データCSV（匿名化済み）
```

**変更するファイル:**
```
src/app/admin/layout.tsx  ← Exportメニュー追加（super_adminのみ）
```

---

### Wave 5: A/Bテスト + Webhook + 月次レポート
> **前提:** Wave 1-4が完了していること。  
> **目的:** 高度な分析・自動化機能。  
> **推定工数:** 約20ファイル新規/変更、2-3日

#### 5-A: A/Bテスト（キャラ人格/口調）

**新規作成するファイル:**
```
src/app/admin/ab-test/page.tsx  ← A/Bテスト管理（super_adminのみ）
src/components/admin/ab-test/ABTestWizard.tsx  ← テスト設定ウィザード
src/components/admin/ab-test/ABTestResults.tsx  ← 結果表示
src/app/api/admin/ab-test/route.ts  ← テスト作成/一覧
src/app/api/admin/ab-test/[id]/route.ts  ← テスト詳細/終了
src/app/api/admin/ab-test/[id]/results/route.ts  ← 結果集計
```

**DB変更:** `ABTest`テーブル新規作成
```prisma
model ABTest {
  id          String   @id @default(uuid())
  name        String
  characterId String
  variantA    Json     // systemPrompt等
  variantB    Json
  metric      String   @default("engagement") // engagement|retention|satisfaction
  startAt     DateTime
  endAt       DateTime?
  status      String   @default("running") // running|ended|cancelled
  results     Json     @default("{}")
  createdAt   DateTime @default(now())
}
```
マイグレーション: `prisma/migrations/YYYYMMDD_ab_test/migration.sql`

#### 5-B: Webhook通知

**新規作成するファイル:**
```
src/app/admin/webhooks/page.tsx  ← Webhook設定画面（super_adminのみ）
src/components/admin/webhooks/WebhookForm.tsx  ← URL + イベント選択
src/app/api/admin/webhooks/route.ts  ← CRUD
src/app/api/admin/webhooks/[id]/test/route.ts  ← テスト送信
src/lib/webhook.ts  ← Webhook送信ユーティリティ
```

**DB変更:** `AdminWebhook`テーブル新規作成
```prisma
model AdminWebhook {
  id        String   @id @default(uuid())
  url       String
  events    String[] // user_signup|coin_purchase|error等
  secret    String   // HMAC署名用
  isActive  Boolean  @default(true)
  tenantId  String?
  createdAt DateTime @default(now())
}
```

#### 5-C: 月次レポート自動生成

**新規作成するファイル:**
```
src/app/admin/reports/page.tsx  ← レポート一覧（既存reports/route.tsを活用）
src/components/admin/reports/MonthlyReportViewer.tsx  ← レポート表示
src/app/api/admin/reports/generate/route.ts  ← 月次レポート生成（Claude opus-4-6）
src/lib/monthly-report.ts  ← レポート生成ロジック
```

---

## 4. 実装上の重要注意事項

### 4.1 既存コードを壊さない方法

1. **`requireAdmin()`は削除しない。** `src/lib/admin.ts`は維持。移行後も後方互換のために残す。
2. **各APIファイルを個別に書き換える。** 一括置換スクリプトは使わない（バグリスクが高い）。
3. **新しいDBテーブルはマイグレーションで追加。** 既存テーブルのカラム追加は`ALTER TABLE`（削除なし）。
4. **新規UIコンポーネントは`src/components/admin/`配下に独立したフォルダで作成。**

### 4.2 Claude モデルの統一方針

| 用途 | モデル |
|---|---|
| 人格設定・SOUL生成・感情トリガー/回避パターン | `claude-opus-4-6` |
| 口調品質スコアリング | `claude-opus-4-6` |
| イベント自動企画 | `claude-opus-4-6` |
| ストーリー生成（演出パラメータ含む） | `claude-opus-4-6` |
| 名台詞・Lore生成 | `claude-opus-4-6` |
| 月次レポート生成 | `claude-opus-4-6` |
| 翻訳（`/api/admin/translate`） | 現状維持（変更しない） |

既存の`claude-opus-4-5`を使っていたエンドポイント（`generate-soul`等）も`claude-opus-4-6`に更新する。

### 4.3 ip_adminユーザーデータ保護

`/api/admin/users/*`全エンドポイントの先頭に必ず以下を追加:
```typescript
const ctx = await requireRole('super_admin');
if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
// ip_adminはここに到達しない
```

`/api/admin/revenue/*`では:
```typescript
const ctx = await requireRole('ip_admin');
if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const scope = revenueScope(ctx);
// scope.anonymize === true の場合、個人識別情報を除外して集計データのみ返す
```

### 4.4 疎結合の保証

- 各Waveは独立したPRとしてデプロイ可能
- Wave N+1はWave Nのコードを**importしない**（共有はlibとprismaのみ）
- 新規UIページは`/admin/[新機能]`として独立したroute
- 新規APIは`/api/admin/[新機能]`として独立したroute
- DBマイグレーションはWave単位でatomicに実行

---

## 5. Wave別ファイル数サマリー

| Wave | 新規作成 | 変更 | DB変更 | 推定工数 |
|---|---|---|---|---|
| Wave 1 | 5 | ~58 | なし | 3-5日 |
| Wave 2 | 15 | 8 | 2テーブル変更+1新規 | 3-4日 |
| Wave 3 | 12 | 3 | なし | 3日 |
| Wave 4 | 10 | 5 | なし | 2-3日 |
| Wave 5 | 10 | 2 | 2テーブル新規 | 2-3日 |
| **合計** | **52** | **76** | **テーブル変更×2, 新規×3** | **13-18日** |

---

## 6. Wave 1 即時着手チェックリスト

Wave 1を開始するには以下の順序で作業する:

1. `src/lib/rbac.ts` に `blockUserDataForNonSuperAdmin()`, `revenueScope()` を追加
2. `src/app/api/admin/revenue/route.ts` に認証を追加（現状認証なし！）
3. `src/app/api/admin/users/route.ts` を `requireRole('super_admin')` に変更
4. 残りの58本のAPIを `requireRole()` に変更（機能ロールに従い）
5. `src/app/admin/layout.tsx` にロール別メニュー表示制御を追加
6. `src/app/api/admin/characters/ai-generate/route.ts` を新規作成
7. `src/components/admin/bible/EmotionPatternsEditor.tsx` を新規作成

**Wave 1完了条件:** ip_adminユーザーが`/api/admin/users`にアクセスしたとき403が返ること。
