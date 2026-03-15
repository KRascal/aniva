# 非同期Deep Chat設計書 — 「数時間後に深い返答が来る」体験

**作成日:** 2026-03-15  
**背景:** 3/11 Keisukeの友人フィードバック「人とチャットしてるイメージなら、必ずしもリアルタイムで返さなくても良い」  
**コンセプト:** Dear U Bubble（BTS公式）的な「待つ喜び」体験。非同期にすることで、裏でキャラ履歴/性格/原作/関係性の深い分析が可能。

---

## 現状確認（コード調査結果）

### 既に対応済みの部分 ✅

`DeepReplyQueue` スキーマ（`prisma/schema.prisma`）には **既に `scheduledAt` カラムが存在する**：

```prisma
model DeepReplyQueue {
  // ...
  scheduledAt    DateTime        @default(now())  // ← 既にある！
  // ...
  @@index([status, scheduledAt])
}
```

`/api/cron/deep-reply/route.ts` も **既に `scheduledAt <= now()` フィルタが実装済み**：

```ts
const job = await prisma.deepReplyQueue.findFirst({
  where: {
    status: 'QUEUED',
    scheduledAt: { lte: new Date() },  // ← 既にある！
  },
  // ...
});
```

### 未対応の部分 ❌（実装が必要）

1. `scheduledAt` が常に `now()` で作成されている → 数時間後に設定するロジックが存在しない
2. 「考え中」メッセージに「○時頃に返事するね」テキストが含まれていない
3. Push通知はDeep Reply完了後に送信されているが、通知文言が「数時間後に届いた」感が出ていない
4. UIで `scheduledAt` を表示する仕組みがない

---

## 設計

### 1. 遅延時間の決定ロジック

#### 1-1. `calculateDelayHours()` 関数を新規作成

**ファイル:** `src/lib/message-weight.ts`（既存ファイルに追記）

メッセージのweightスコアを流用して、遅延時間を決定する：

```typescript
/**
 * Deep Mode発動時の遅延時間（ミリ秒）を返す
 * メッセージの重さに応じて2〜8時間の範囲でスケジュール
 */
export function calculateDelayMs(message: string): number {
  const weight = calculateMessageWeight(message);

  // 感情的な悩み相談（weight >= 5）→ 4〜8時間
  if (weight >= 5) {
    const hours = 4 + Math.random() * 4; // 4h〜8h
    return Math.round(hours * 60 * 60 * 1000);
  }

  // 仕事/試験/人生相談（weight >= 3）→ 2〜4時間
  if (weight >= 3) {
    const hours = 2 + Math.random() * 2; // 2h〜4h
    return Math.round(hours * 60 * 60 * 1000);
  }

  // 軽い質問（weight < 3）→ 30分〜1時間
  const minutes = 30 + Math.random() * 30; // 30min〜60min
  return Math.round(minutes * 60 * 1000);
}

/**
 * 遅延時間を人間が読みやすい形式に変換
 * 例: "3時間後くらい", "30分後くらい"
 */
export function formatDelayText(scheduledAt: Date): string {
  const now = new Date();
  const diffMs = scheduledAt.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);

  if (diffHours >= 1) {
    return `${diffHours}時間後くらい`;
  }
  return `${diffMinutes}分後くらい`;
}
```

#### 1-2. 遅延時間の分類表

| メッセージ種別 | 判定条件 | 遅延時間 |
|---|---|---|
| 感情的な悩み相談 | weight >= 5（感情キーワード+人生相談） | 4〜8時間 |
| 仕事/試験/人生相談 | weight >= 3（Deep Mode閾値） | 2〜4時間 |
| 軽い質問（Deep Mode境界） | weight < 3 | 30分〜1時間 |

---

### 2. `thinking-reactions.ts` の修正

**ファイル:** `src/lib/thinking-reactions.ts`

`getThinkingReaction()` の戻り値に `scheduledAt` を含める形に変更（または新関数を追加）：

```typescript
/**
 * 「考え中」メッセージと予定返信時刻を返す
 */
export function getThinkingReactionWithSchedule(
  slug: string,
  scheduledAt: Date,
): { thinkingText: string; fullText: string } {
  const baseText = getThinkingReaction(slug); // 既存関数をそのまま使う
  const delayText = formatDelayText(scheduledAt); // message-weightから import
  
  // 「うーん…ちゃんと考えてから返事するね。{遅延時間}には返事できると思う！」
  const fullText = `${baseText}\n\n…${delayText}には返事できると思う！`;
  
  return { thinkingText: baseText, fullText };
}
```

---

### 3. `stream/route.ts` の修正

**ファイル:** `src/app/api/chat/stream/route.ts`

Deep Mode発動時に `scheduledAt` を計算してQueueに設定する：

```typescript
// ── Deep Mode判定 ──（既存コードから変更箇所のみ記載）

if (shouldUseDeepMode(message, recentDeepCount)) {
  // ▼▼▼ 変更点 ▼▼▼
  
  // 1. 遅延時間を計算
  const delayMs = calculateDelayMs(message);  // 新規import
  const scheduledAt = new Date(Date.now() + delayMs);
  
  // 2. thinking textに「○時頃に返事するね」を含める
  const { fullText: thinkingText } = getThinkingReactionWithSchedule(
    cachedCharacter.slug,
    scheduledAt,
  );
  
  const thinkingMsg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'CHARACTER',
      content: thinkingText,  // 「…3時間後くらいには返事できると思う！」含む
      metadata: { 
        isThinking: true,
        scheduledAt: scheduledAt.toISOString(),  // UIで表示用
      },
    },
  });
  
  // 3. DeepReplyQueueにscheduledAtを明示的に設定
  await prisma.deepReplyQueue.create({
    data: {
      userId,
      characterId,
      relationshipId: relationship.id,
      conversationId: conversation.id,
      userMessageId: userMsg.id,
      thinkingMsgId: thinkingMsg.id,
      scheduledAt,  // ← ここが変更点（@default(now())を上書き）
    },
  });
  
  // ...（以降は既存と同じ）
  
  // SSEイベントにscheduledAtを追加
  const deepEvent = encoder2.encode(
    `data: ${JSON.stringify({
      type: 'deep_mode',
      userMessageId: userMsg.id,
      characterMessageId: thinkingMsg.id,
      thinkingText,
      emotion: 'thinking',
      isDeepProcessing: true,
      scheduledAt: scheduledAt.toISOString(),  // ← フロントエンドに渡す
      consumed,
    })}\n\n`,
  );
  
  // ▲▲▲ 変更点ここまで ▲▲▲
}
```

**既存コードへの影響:** `getThinkingReaction()` を `getThinkingReactionWithSchedule()` に差し替えるだけ。後方互換あり（`getThinkingReaction()` は削除しない）。

---

### 4. Push通知の変更

**ファイル:** `src/lib/deep-reply-processor.ts`

`processDeepReply()` 末尾のPush通知送信部分を変更：

```typescript
// 変更前
await sendPushNotification(
  job.userId,
  `${character.name}からメッセージ`,
  guardedResponse.slice(0, 100),
  `/chat/${character.slug}`,
);

// 変更後
await sendPushNotification(
  job.userId,
  `${character.name}から返事が届きました 💌`,  // ← 「返事が届いた」感のある文言
  guardedResponse.slice(0, 100),
  `/chat/${character.slug}`,
);
```

**既存コードへの影響:** 通知文言の変更のみ。`sendPushNotification()` のシグネチャは変わらない。

---

### 5. DBスキーマ（変更不要）

現在のスキーマ：
```prisma
model DeepReplyQueue {
  scheduledAt    DateTime        @default(now())
}
```

**`scheduledAt` カラムは既に存在する。`@default(now())` により：**
- 既存のジョブ（`scheduledAt` を明示しなかった場合）は `now()` が設定される → 即時処理される（後方互換あり）
- 新しいジョブは `scheduledAt` を明示的に数時間後に設定する

**Migrationは不要。** スキーマ変更ゼロ。

---

### 6. UIの変更

**ファイル:** `src/components/chat/ChatMessageList.tsx`

現在の `isThinking` メッセージの描画を修正する。  
まず既存のisThinking描画箇所を確認：

```tsx
// 現在: metadata.isThinking === true の場合、TypingIndicator等を表示

// 変更後: metadata.scheduledAt がある場合、「○時頃に返事するね」テキストも表示
{msg.metadata?.isThinking && (
  <div className="thinking-indicator">
    <TypingIndicator />
    {msg.metadata?.scheduledAt && (
      <p className="text-xs text-gray-400 mt-1">
        {/* "3時間後くらいに返事できると思う！" 的なテキストはthinkingTextに含まれているので、
            ここでは追加の視覚的演出のみ */}
        ⏰ {formatScheduledAtText(new Date(msg.metadata.scheduledAt))}
      </p>
    )}
  </div>
)}
```

`formatScheduledAtText()` は `message-weight.ts` の `formatDelayText()` をUIから呼べる形にしたもの：

```typescript
// src/lib/message-weight.ts に追記（またはUIユーティリティとして）
export function formatScheduledAtText(scheduledAt: Date): string {
  const now = new Date();
  if (scheduledAt <= now) return 'もうすぐ返事がくるかも...';
  
  const diffMs = scheduledAt.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMinutes = Math.floor((diffMs % 3600000) / 60000);
  
  if (diffHours >= 1) {
    return `${diffHours}時間後くらいに届くよ`;
  }
  return `あと${diffMinutes}分くらいで届くよ`;
}
```

---

## 実装ステップ（推奨順序）

### Step 1: `message-weight.ts` に遅延計算関数を追加
**ファイル:** `src/lib/message-weight.ts`  
**変更内容:** `calculateDelayMs()`, `formatDelayText()`, `formatScheduledAtText()` を追加  
**工数:** 30分  
**リスク:** なし（既存関数に触れない、純粋な追加）

---

### Step 2: `thinking-reactions.ts` に `getThinkingReactionWithSchedule()` を追加
**ファイル:** `src/lib/thinking-reactions.ts`  
**変更内容:** 既存 `getThinkingReaction()` を維持したまま、新関数を追加  
**工数:** 15分  
**リスク:** なし（既存関数は変更しない）

---

### Step 3: `stream/route.ts` の Deep Mode分岐を修正
**ファイル:** `src/app/api/chat/stream/route.ts`  
**変更内容:**
1. `import { calculateDelayMs } from '@/lib/message-weight'` を追加
2. `import { getThinkingReactionWithSchedule } from '@/lib/thinking-reactions'` を追加
3. Deep Mode分岐内で `scheduledAt` を計算してQueueに設定

**工数:** 30分  
**リスク:** 低（既存のDeep Mode分岐内のみ変更、他フローに影響なし）

---

### Step 4: `deep-reply-processor.ts` のPush通知文言を変更
**ファイル:** `src/lib/deep-reply-processor.ts`  
**変更内容:** Push通知タイトルを `「{キャラ名}から返事が届きました 💌」` に変更  
**工数:** 5分  
**リスク:** なし

---

### Step 5: `ChatMessageList.tsx` のisThinking表示を強化
**ファイル:** `src/components/chat/ChatMessageList.tsx`  
**変更内容:** `metadata.scheduledAt` がある場合に `formatScheduledAtText()` で残り時間を表示  
**工数:** 45分（UIの確認含む）  
**リスク:** 低（表示の追加のみ、既存ロジックに触れない）

---

## 全体のデータフロー（変更後）

```
ユーザーがメッセージ送信
  ↓
shouldUseDeepMode() → true
  ↓
calculateDelayMs(message) → delayMs（例: 3時間）
scheduledAt = now + delayMs
  ↓
thinkingMsg作成（「うーん…3時間後くらいには返事できると思う！」）
DeepReplyQueue作成（scheduledAt = now + 3h）
  ↓
SSE: type="deep_mode" + scheduledAt を返す
  ↓
（3時間後）
  ↓
cron: scheduledAt <= now() のジョブを取得
processDeepReply() 実行
  ↓
Deep Replyメッセージ保存
Push通知送信: 「{キャラ名}から返事が届きました 💌」
  ↓
ユーザーがアプリを開く → チャットに深い返答が表示されている
```

---

## 後方互換性の保証

| 変更箇所 | 後方互換 | 理由 |
|---|---|---|
| `scheduledAt` カラム | ✅ | `@default(now())` があるので既存ジョブは即時処理 |
| `getThinkingReaction()` | ✅ | 削除せず、新関数を追加 |
| `DeepReplyQueueJob` 型 | ✅ | `processDeepReply()` の引数型に `scheduledAt` を追加しない（使わないので不要） |
| Cronエンドポイント | ✅ | `scheduledAt: { lte: new Date() }` は既に実装済み |

---

## 将来拡張（MVP後）

- **ユーザーが遅延時間を設定できる**: 「今すぐ返事」「あとで返事」ボタン
- **キャラ固有の遅延パターン**: ゾロは「寝てから考える」→ 夜間のみ処理
- **通知時刻のカスタマイズ**: 深夜には通知しない（おやすみモード）
- **「返事待ち」インボックス**: 複数キャラからの未読返事をまとめて通知

---

## 参考：既存コードのインターフェース

### `DeepReplyQueueJob` 型（`deep-reply-processor.ts`）
```typescript
export interface DeepReplyQueueJob {
  id: string;
  userId: string;
  characterId: string;
  relationshipId: string;
  conversationId: string;
  userMessageId: string;
  thinkingMsgId: string;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  // scheduledAt は processDeepReply() 内では不要（cronが判断済み）
}
```

### `calculateMessageWeight()` の既存スコア表
| 条件 | スコア |
|---|---|
| メッセージ長 > 80文字 | +2 |
| 疑問文（？含む） | +1 |
| 感情キーワード | +2 |
| 人生相談キーワード | +3 |
| **Deep Mode閾値** | **3以上** |
| 連続Deep防止（直近2回以上） | -3 |
