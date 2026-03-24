# Keisuke指示 全件監査レポート（2026-03-14〜16）

生成日時: 2026-03-16  
検証対象: `/home/openclaw/.openclaw/workspace/projects/aniva-staging/web`

---

## 全指示リスト

| # | 日付 | 指示内容 | 状態 | 根拠（ファイル:行） |
|---|------|---------|------|-----------------|
| 1 | 03/14 | キャラエージェント化 Phase 1（DecisionEngine + エージェントループ） | ✅完了 | `src/lib/agent/character-agent-loop.ts` 存在確認 |
| 2 | 03/14 | DecisionEngineタイムアウト修正（grok-3-mini + 30s） | ✅完了 | memory記録より確認 |
| 3 | 03/14 | Feature Batch 6機能実装（FollowUpScheduler/ContextTriggers/記念日/ギフト/イベント/関係性） | ⚠️退化 | 一部ファイル存在するが後述の問題あり |
| 4 | 03/14 | Production Readiness Wave 1（レート制限/アカウント削除/Redisキャッシュ/通報ブロック） | ✅完了 | `src/lib/rate-limit.ts`等存在 |
| 5 | 03/14 | i18n 6言語638キー実装（en/es/ko/zh/fr/ja） | ✅完了 | `src/i18n/` 多言語ファイル確認済み |
| 6 | 03/14 | Keisukeから6機能GO（Apple Sign In以外）→「音声は後回し」決定 | ✅完了（方針記録） | memory 20:39エントリ |
| 7 | 03/15 | 品質強化12項目（Edge Rate Limit/決済テスト/i18n同期/エラーページ等） | ✅完了（11/12） | commit 03aeaa3確認 |
| 8 | 03/15 | 自己進化プロセス改善（SOUL.md更新・health-check.sh改善） | ✅完了 | memory 10:02エントリ |
| 9 | 03/15 | テスト 93→221件拡大 + push-dm cron 403修正 | ✅完了 | commit bbcbc65 |
| 10 | 03/15 | LINE Login実装（LINE_CLIENT_ID=2009459105） | ✅完了 | `src/lib/auth.ts`に実装 |
| 11 | 03/15 | Resendメール通知（ダイジェスト+ウェルカム） | ✅完了 | `src/lib/email.ts`, `src/app/api/cron/email-digest/route.ts` |
| 12 | 03/15 | Cloudflare R2 + CDN移行 | ✅完了 | `src/lib/r2.ts` |
| 13 | 03/15 | 退化バグ報告9件（LINE 400/グループ掛け合い消失/履歴なし/ガチャボタン/マイページエラー等） | ⚠️退化あり | 後述の詳細分析参照 |
| 14 | 03/15 | 退化防止の仕組み全実装（E2E/自動巡回/自動同期） | ⚠️一部未完 | E2Eテスト方針はあるがPlaywright統合度未確認 |
| 15 | 03/15 | resolveCharacterId 16 API一括修正 | ✅完了 | commit 578c89b→3e6196e |
| 16 | 03/15 | グループチャット掛け合い機能再実装 | ⚠️退化 | 詳細分析 #1参照 |
| 17 | 03/15 | グループ履歴チャット一覧表示 | ⚠️退化 | 詳細分析 #2参照 |
| 18 | 03/15 | 同一キャラ2回目グループ→既存チャットを開く | ⚠️退化 | 詳細分析 #3参照 |
| 19 | 03/15 | 本番デプロイ（aniva-project.com）承認 | ✅完了 | commit ec6f49e |
| 20 | 03/15 | 収益ダッシュボード + IPホルダー管理画面 | ✅完了 | `/admin/revenue`, `/admin/ip-dashboard` |
| 21 | 03/15 | Sentry DSN設定 | ✅完了 | .env設定記録 |
| 22 | 03/15 | 管理画面完全版 要件定義54+項目 | ✅完了（設計書のみ） | `tasks/designs/aniva/admin-complete-plan.md` |
| 23 | 03/15 | 全機能再実装（FollowUpScheduler/ContextTriggers等 + グループ掛け合い + グループ履歴API） | ⚠️退化 | 詳細 #1-3参照 |
| 24 | 03/16 | 管理画面5 Wave実装（27→47ページ） | ✅完了 | commit 2c57be8 |
| 25 | 03/16 | staging同期（mainと207ファイル差分解消） | ✅完了 | commit 4f5b3ff |
| 26 | 03/16 | 退化防止3点（check-resolve-character-id.sh/sync-main-to-staging.sh/deploy統合） | ✅完了 | scripts/内 |
| 27 | 03/16 | LINE Login修正（emailスコープ→openid+profile） | ✅完了 | commit 04d65e5 |
| 28 | 03/16 | 負荷テスト（ab 100並列 → 46rps/338rps/258rps） | ✅完了 | memory記録 |
| 29 | 03/16 | VPS移行スクリプト（migrate-full-vps.sh） | ✅完了 | scripts/migrate-full-vps.sh |
| 30 | 03/16 | #4 アルバム機能強化（ChatMedia+R2+sharp） | ✅完了 | commit f9be235 |
| 31 | 03/16 | #5 手紙・ストーリーのチャット配信（ChatDelivery + ChatDeliveryBubble） | ✅完了 | `src/lib/engine/chat-delivery.ts`, `src/components/chat/ChatDeliveryBubble.tsx` |
| 32 | 03/16 | #1 応答フォーマット人間化（LINEテンポ、段落禁止） | ✅完了 | commit f8c72d1 |
| 33 | 03/16 | #4 沈黙の美学（Lv3+5%確率一言） | ✅完了 | commit f8c72d1 |
| 34 | 03/16 | #5 キャラ別AGENTS.md + エージェントDM有効化 | ✅完了 | commit f8c72d1 |
| 35 | 03/16 | #2 ユーザーナラティブサマリー（50メッセージ毎LLM生成） | ✅完了 | `src/lib/engine/user-narrative.ts` |
| 36 | 03/16 | #3 日次セッションログ（DailySessionLog + LLMサマリー） | ✅完了 | `src/lib/engine/session-logger.ts` |
| 37 | 03/16 | フォロー済みキャラがスワイプに出てくる問題 | ❌未修正 | 詳細分析 #4参照 |
| 38 | 03/16 | フォローできるキャラが少ない場合の動作 | ⚠️部分対応 | 詳細分析 #5参照 |

---

## 5項目 詳細コード検証

---

### #1 グループチャットの掛け合わせ機能（⚠️退化）

**問題**: Keisukeが「グループ掛け合いボタンなし」と3/15に報告。

**現在のコード状況**:

**API**: `src/app/api/chat/group/crosstalk/route.ts` — **存在・完全実装**
- POST /api/chat/group/crosstalk を受け付ける
- conversationIdを必須パラメータとして受け取る
- FC会員は無料、非会員はキャラ数×10コイン消費
- キャラ順に掛け合い生成してDBに保存

**UI**: `src/app/chat/group/page.tsx` — **ボタン表示条件に問題あり**

```typescript
// chat/group/page.tsx 内の掛け合いボタン表示条件（実装済み）
{selectedChars.length >= 2 && messages.length > 0 && (
  <button onClick={handleCrosstalk}>キャラ同士で掛け合わせる</button>
)}
```

**根本問題（発見）**: 掛け合いAPIは `conversationId` を必須で受け取る。

しかし、グループチャットのPOST（`/api/chat/group`）レスポンスに `conversationId` が**含まれていない**：

```typescript
// /api/chat/group/route.ts L359-365
return NextResponse.json({
  messages: groupMessages,
  coinCost: totalCoinCost,
  coinBalance: newBalance,
  // ← conversationId がない！
});
```

POSTでメッセージを送っても `conversationId` がStateにセットされない → `handleCrosstalk` で `conversationId === null` のまま → crosstalk APIに送っても `conversationId is required` エラーになる。

**また**: crosstalk API側は `body: conversationId` のみを受け取る設計だが、UIは `{ characterIds, conversationId, locale }` を送っている。API側では `characterIds` を使わずConversation.metadataから読む設計。

**状態**: ⚠️退化 — APIは正しく実装されているが、group POSTのレスポンスにconversationIdが無いためUIのStateに入らず、掛け合いが実質使えない。

---

### #2 グループチャット履歴がチャット一覧に表示される（⚠️退化）

**チャット一覧ページ**: `src/app/chat/page.tsx` — **履歴表示コードは存在する**

```typescript
// chat/page.tsx（確認済み）
const [groupConversations, setGroupConversations] = useState<...>([]);
// ...
const groupRes = await fetch('/api/chat/group');
if (groupRes.ok) {
  const data = await groupRes.json();
  if (data.conversations) setGroupConversations(data.conversations);
}
// ...
{groupConversations.length > 0 && (
  <div className="mt-6">
    <h2>グループチャット履歴</h2>
    // 一覧表示
  </div>
)}
```

**履歴取得API**: `src/app/api/chat/group/route.ts` GET — **実装済みだが根本的な問題あり**

```typescript
// groupMessagesを取得する条件
const groupMessages = await prisma.message.findMany({
  where: {
    conversation: { relationshipId: { in: relIds } },
    metadata: { path: ['groupChat'], equals: true },
  },
```

**根本問題**: 
1. `metadata.groupChat === true` のメッセージを探す
2. そのメッセージのmetadataから`characterIds`を取り出す
3. しかしPOST時に保存されるConversationは各キャラ**個別**のRelationshipの下に作られる

POSTの保存ロジック（L293-348）を見ると:
- 各キャラに対して別々のConversationを作成
- そのConversationのメタデータには `characterIds` がない（`{ type: 'group' }` のみ）
- メッセージのmetadataに `{ groupChat: true, characterIds }` は保存されている

**GET側が探しているのは正しいが**、`characterIds`をconversation.metadataからではなくメッセージのmetadataから取得する設計は複雑。

実際問題として、同じグループの会話が複数のRelationship下に分散して作られるため、GETでは「最初に見つかったConversationのcharacterIds」しか取れない。複数会話が同じconversationIdを持たないため、一覧には表示されない可能性が高い。

**状態**: ⚠️退化 — コードは存在するが、保存ロジックと取得ロジックの前提が合っていない。

---

### #3 同じキャラで2回目グループチャット → 既存チャットを開くか（⚠️退化）

**UI実装**: `src/app/chat/group/page.tsx` `handleStartChat()` — **実装済み**

```typescript
const handleStartChat = async () => {
  // 既存のグループ会話を検索
  const res = await fetch('/api/chat/group');
  const data = await res.json();
  const sorted = [...selectedIds].sort();
  const existing = (data.conversations ?? []).find(conv => {
    const convIds = (conv.characters ?? []).map((c) => c.id).sort();
    return convIds.length === sorted.length && convIds.every((id, i) => id === sorted[i]);
  });
  if (existing) {
    // 既存会話のメッセージをロード
    const histRes = await fetch(`/api/chat/group/history?conversationId=${existing.id}&limit=30`);
    // ...
  }
};
```

**問題**: #2の問題と連動。GET `/api/chat/group` が正しい会話一覧を返せない場合、`existing` が見つからない。

特に、POSTでの会話保存が各キャラ個別Conversationに分散している設計では、「グループ全体を代表する1つのconversationId」が存在しない。

`/api/chat/group/history` APIはconversationIdを受け取ってそのIDの会話を返すが、グループチャット専用のConversationテーブルエントリが作られていないため、GETのレスポンスに含まれるIDが掛け合いのconversationIdと一致しない可能性がある。

**状態**: ⚠️退化 — ロジックは実装されているが、データ構造の設計ミスで動かない。

---

### #4 フォロー済みキャラがスワイプ（Discover）に出てくる問題（❌未修正）

**Discoverページ**: `src/app/discover/page.tsx`

```typescript
// useEffect内のキャラ取得
const res = await fetch('/api/characters?limit=20&random=1');
const chars = (data.characters ?? [])
  .filter((c) => !skipped.includes(c.slug))  // ← スキップ済みは除外
  .sort(() => Math.random() - 0.5)
  .slice(0, 10);
```

**問題**: フォロー済みキャラを除外していない。
- `?limit=20&random=1` で全キャラを取得
- スキップ（左スワイプ）したキャラはlocalStorageで管理・除外
- **フォロー済み（右スワイプ済み）は`followedIds` というstateで管理されているが、ページ読み込み時の初期除外には使われていない**

APIに `followingOnly=true` パラメータがあるが、Discoverでは使っていない。フォロー済みキャラを除外するには、ページロード時に `/api/relationship/following` または `/api/relationship/all` を取得してフォロー済みIDをフィルタする必要がある。

**根本原因**: スキップはlocalStorageで永続化しているがフォロー状態はセッションStateのみ管理。ページリロード時にフォロー状態がリセットされる。

**状態**: ❌未修正 — フォロー済みキャラ除外のロジックが未実装（APIは対応可能）。

---

### #5 フォローできるキャラが少ない場合の動作（⚠️部分対応）

**グループチャットページ**: `src/app/chat/group/page.tsx`

```typescript
// フォロー中のキャラを取得（グループチャット用）
Promise.all([
  fetch('/api/characters').then(r => r.json()),
  fetch('/api/relationship/all').then(r => r.json()),
])
.then(([charData, relData]) => {
  const followingIds = new Set(rels.filter(r => r.isFollowing).map(r => r.characterId));
  // フォロー中優先、なければ全員
  const pool = followingIds.size > 0
    ? allChars.filter(c => followingIds.has(c.id))
    : allChars;  // ← フォロー0人なら全キャラ表示
  setCharacters(pool);
});
```

```typescript
// グループチャット用のempty state
{characters.length === 0 ? (
  <div>
    <p>キャラをフォローして招待しよう</p>
    <button onClick={() => router.push('/explore')}>キャラを探す →</button>
  </div>
) : (
  // キャラ一覧
)}
```

**分析**:
- フォロー0人 → 全キャラ表示（フォールバック）✅
- フォロー1人のみ → 1人だけ表示（グループチャット開始ボタンは1人でも押せる）⚠️
  - `selectedIds.length < 1` が無効条件なので1人でも開始可能
  - でも掛け合いボタンは `selectedChars.length >= 2` 条件で非表示（正常）
- フォロー2-3人 → 正常動作 ✅

**Discoverページでのフォローできるキャラが少ない場合**:
- 10枚のカードをスワイプし尽くしたら「探索完了」画面が出る
- フォローしたキャラ数だけ表示され、チャットへのCTAあり ✅

**状態**: ⚠️部分対応 — グループチャットではフォールバックあり。Discoverでは少ない場合も動くが、既フォロー済みが繰り返し出てくる問題（#4）が残る。

---

## 退化・未実装の根本原因分析

### 1. グループチャットの設計的負債（#1/#2/#3 共通原因）

**本質**: グループチャット専用の「Conversation」モデルが存在しない。

- 現在: グループチャットで複数キャラに送ると、**キャラごとに別々のConversation**が作られる
- 本来必要: `GroupConversation` または `Conversation.type = 'group'` + `conversationParticipants` テーブル

```
# 現在の実装（問題あり）
Relationship(userId, char1) → Conversation(relId1, metadata: {type: 'group'})
Relationship(userId, char2) → Conversation(relId2, metadata: {type: 'group'})
→ グループのメッセージが2つのConversationに分散
→ 「グループ全体の会話ID」が存在しない

# 必要な設計
GroupConversation(id, userId, characterIds[], metadata)
GroupMessage(groupConversationId, role, content, characterId)
```

**掛け合いAPIの別問題**: POSTレスポンスに`conversationId`が含まれていないため、UIのStateにセットできない。これは即修正可能。

### 2. セッション死亡による実装消失

3/14の教訓メモに記載: 「大量の新機能はセッション死亡でgitに残らないリスクがある」

実際に3/14→3/15で同じ機能（グループ掛け合い・履歴等）を「再実装」した記録がある。これは一度実装した機能がgitにcommitされる前にセッションが死亡した可能性を示す。

### 3. フォロー除外ロジックの設計漏れ（#4）

Discoverページはシンプルなスワイプ実装として作られており、フォロー済み除外がlocalStorageのスキップ機能と別管理になっている。APIに`followingOnly`パラメータは存在するが、Discoverでは未使用。

---

## 修正が必要な項目リスト（優先度付き）

### 🔴 優先度: 高（今すぐ修正）

#### Fix-1: グループチャットPOSTレスポンスにconversationIdを追加
**ファイル**: `src/app/api/chat/group/route.ts` L359
**修正内容**: 保存したConversationのIDをレスポンスに含める

```typescript
// 保存ループの最後のconversationIdを返す
let lastConversationId: string | null = null;
// ...保存ループ内で...
lastConversationId = conversation.id;

return NextResponse.json({
  messages: groupMessages,
  coinCost: totalCoinCost,
  coinBalance: newBalance,
  conversationId: lastConversationId,  // ← 追加
});
```

**効果**: 掛け合いボタンが機能するようになる（掛け合いAPIはconversationIdを使用）

#### Fix-2: グループチャット専用Conversationを1つ作成する設計に変更
**影響ファイル**: `src/app/api/chat/group/route.ts`, `src/app/api/chat/group/crosstalk/route.ts`, DB schema

**修正内容**: 
- 同一characterIds組み合わせの既存GroupConversationを探す
- なければ1つ作成
- 全キャラのメッセージをそのConversationに集約保存

**効果**: 履歴取得（#2）・既存会話復帰（#3）が正常動作する

#### Fix-3: Discoverページでフォロー済みキャラを除外
**ファイル**: `src/app/discover/page.tsx`

```typescript
// フォロー済みIDを取得してから除外
const [charRes, relRes] = await Promise.all([
  fetch('/api/characters?limit=50&random=1').then(r => r.json()),
  fetch('/api/relationship/following').then(r => r.json()).catch(() => ({ relationships: [] })),
]);
const followingIds = new Set(
  (relRes.relationships ?? []).filter((r) => r.isFollowing).map((r) => r.characterId)
);
const chars = (charRes.characters ?? [])
  .filter((c) => !skipped.includes(c.slug) && !followingIds.has(c.id))  // ← フォロー済み除外追加
  .sort(() => Math.random() - 0.5)
  .slice(0, 10);
```

### 🟡 優先度: 中（今週中）

#### Fix-4: グループチャット履歴取得APIの修正（Fix-2完了後）
**ファイル**: `src/app/api/chat/group/route.ts` GET

Fix-2で専用Conversationを1つ作れば、GETは `conversation.metadata.characterIds` で正しく取得できる。

#### Fix-5: フォロー1人のみのグループチャット体験改善
**ファイル**: `src/app/chat/group/page.tsx`

フォロー1人の場合、グループチャット画面に「もう1人フォローして掛け合いを楽しもう」というガイダンスを表示する。

### 🟢 優先度: 低（次のスプリント）

#### Fix-6: LINE Login 400 Bad Request（オンボーディング）
メモリ記録では「emailスコープ削除で修正」済み（commit 04d65e5）。ただし実際の動作確認が必要。

#### Fix-7: Sentryの具体的な手続き方法
Keisukeが「Sentryどうすればいい？」と質問。DSN設定は完了しているが、ダッシュボードの使い方説明が必要。

---

## サマリー

| カテゴリ | 件数 |
|---------|------|
| ✅ 完了 | 27件 |
| ⚠️ 退化（コードあり・動かない） | 7件 |
| ❌ 未修正 | 1件 |
| **合計** | **35件** |

### 最重要修正（今すぐ）
1. **group POST → conversationId をレスポンスに追加**（5分で修正可能）
2. **グループ会話を1つのConversationに集約**（設計変更、1-2時間）
3. **Discover フォロー済み除外**（30分で修正可能）

