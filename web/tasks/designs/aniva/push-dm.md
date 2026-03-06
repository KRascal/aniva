# プッシュDM機能 設計書

**作成日**: 2026-03-06  
**ブランチ**: main  
**ステータス**: 設計完了・実装待ち

---

## 1. 背景 / 目的

キャラからユーザーへの自発的DM送信（プッシュDM）は、中毒性・リテンションの核心機能。  
ユーザーがアプリを開いていない状態でも、フォロー済みキャラが定期的に「先にメッセージを送ってくる」体験を実現する。

### 現状分析（コード調査結果）

| ファイル | 役割 | 課題 |
|---|---|---|
| `src/app/api/cron/push-dm/route.ts` | cron → `push/character-notify` を叩くラッパー | AI生成なし。固定テンプレート通知のみ |
| `src/app/api/push/character-notify/route.ts` | Web Push送信（ハードコードテンプレート） | キャラ6体分の固定文言のみ。会話履歴・パーソナライズなし |
| `src/app/api/cron/proactive-messages/route.ts` | AI生成のプロアクティブメッセージ生成 | DB保存のみ。**Web Push送信なし** |
| `src/app/api/cron/generate-proactive-messages/route.ts` | テンプレートでDB保存（旧版） | AIなし。1日1通のみ |
| `CharacterProactiveMessage` テーブル | AI生成メッセージの蓄積 | 存在するが通知と連携していない |

**結論**: AIで生成 → DB保存 → Web Push送信、の3ステップが分断されている。統合が必要。

---

## 2. 設計方針

### アーキテクチャ

```
[cron: 1日3回] 
  → POST /api/cron/push-dm-ai
      ├─ フォロー中ユーザー×キャラ ペア取得
      ├─ 1日3通上限チェック (CharacterProactiveMessage.createdAt)
      ├─ AI生成 (character.systemPrompt + 直近会話履歴10件)
      ├─ CharacterProactiveMessage に保存 (trigger="scheduled")
      └─ Web Push 送信 (PushSubscription経由)
```

### 設計要件への対応

| 要件 | 対応方法 |
|---|---|
| cron駆動 (1日2-3回) | JST 8時/13時/20時の3回 (既存push-dmと同スケジュール) |
| フォロー済みユーザーのみ | `Relationship.isFollowing = true` でフィルタ |
| AI生成 (personality + 履歴考慮) | `character.systemPrompt` + `Conversation > Message` 直近10件 |
| Web Push | 既存 `PushSubscription` テーブル + `web-push` ライブラリ |
| 既存テーブル活用 | `CharacterProactiveMessage` + `Message` + `Conversation` をそのまま使用 |
| 1日最大3通 | `createdAt >= 本日0時` の `CharacterProactiveMessage` 件数チェック |

---

## 3. DB変更

**なし。** 既存テーブルで完結する。

- `CharacterProactiveMessage`: AI生成メッセージを保存（既存）
- `PushSubscription`: Web Push送信先（既存）
- `Relationship`: フォロー判定・memorySummary・会話履歴取得に使用（既存）
- `Conversation` / `Message`: 直近会話履歴取得（既存）

---

## 4. API設計

### POST /api/cron/push-dm-ai

**認証**: `x-cron-secret` ヘッダー（`CRON_SECRET` 環境変数と一致）

**リクエスト**: ヘッダーのみ（ボディなし）

**処理フロー**:

```typescript
1. フォロー中の Relationship を取得
   - where: { isFollowing: true }
   - include: character(systemPrompt), user(displayName, nickname), conversations(messages直近10件)

2. ペアごとに処理:
   a. 1日3通チェック
      - CharacterProactiveMessage.count where {
          userId, characterId,
          createdAt: { gte: 本日0時JST }
        } >= 3 → スキップ
   b. 8hクールダウンチェック (既存proactive-messagesと競合回避)
   c. AI生成
      - systemPrompt = character.systemPrompt
      - userContext = 直近10件の Message (role/content)
      - memorySummary = relationship.memorySummary
      - max_tokens: 150, temperature: 0.92
   d. CharacterProactiveMessage 保存
      - trigger: "scheduled"
      - expiresAt: +8h (FOMO強化)
      - metadata: { generatedBy: "push-dm-ai", timeSlot: "morning|afternoon|evening" }
   e. Web Push 送信
      - PushSubscription.findMany({ where: { userId } })
      - payload: { title: "{charName}からメッセージ", body: content, url: "/chat/{characterId}" }
      - 失敗したエンドポイントはDBから削除（既存ロジックと同様）

3. 結果返却
   { ok: true, totalSent, skipped, errors }
```

**レスポンス例**:
```json
{
  "ok": true,
  "totalSent": 42,
  "skipped": { "dailyLimit": 5, "cooldown": 12, "noPushSub": 8 },
  "errors": 0
}
```

### AIプロンプト設計

```
[system]
{character.systemPrompt}

あなたは今、フォロワーの{userName}へ自発的にメッセージを送ります。
状況:
- 関係レベル: {level} ({levelHint})
- ユーザーとの最近の会話（参考）: {recentMessages}
- ユーザーの記憶サマリー: {memorySummary}
- 現在の時間帯: {morning|afternoon|evening}

[ルール]
- 1〜2文。キャラの口調を完全に守る
- 返信を誘う余白を残す（質問形式か、気になる一言で終わる）
- 「消えてしまう」「期限」などメタ発言禁止
- 本文のみ返す

[user]
{userName}へのメッセージを書いてください
```

---

## 5. 変更内容（ファイル + 具体的修正）

### 新規作成

#### `src/app/api/cron/push-dm-ai/route.ts`
- 役割: 既存 `push-dm` + `proactive-messages` の統合・強化版
- 既存の `/api/cron/push-dm` は**残す**（固定テンプレートのフォールバックとして）
- 新しいcronジョブとして独立させる

**実装内容**:
```typescript
// 認証 (CRON_SECRET)
// Relationship取得 (isFollowing=true, include: character, user)
// ループ処理:
//   - 1日3通チェック
//   - 8hクールダウンチェック
//   - 直近会話履歴取得 (Conversation → Message 直近10件)
//   - AI生成 (xAI or Anthropic, max_tokens: 150)
//   - CharacterProactiveMessage 保存
//   - Web Push 送信
//   - 失敗エンドポイント削除
```

### 修正ファイル

#### `src/app/api/push/character-notify/route.ts`（オプション）
- 現状: ハードコードテンプレートのみ
- 対応: `ai_generated=true` クエリパラメータ時にAI生成を使う分岐を追加（後で統合する際の橋渡し）
- **優先度低**: 新エンドポイント作成で代替できるため、初期実装では変更不要

#### crontab / PM2 設定（ドキュメント更新のみ）
```bash
# 既存 push-dm (固定テンプレート)
0 8,13,20 * * * curl http://localhost:3050/api/cron/push-dm -H "x-cron-secret: $CRON_SECRET"

# 新規 push-dm-ai (AI生成、より少ない頻度で高品質)
30 8,20 * * * curl -X POST http://localhost:3050/api/cron/push-dm-ai -H "x-cron-secret: $CRON_SECRET"
```

---

## 6. 完了条件

- [ ] `/api/cron/push-dm-ai` エンドポイントが実装済み
- [ ] `x-cron-secret` 認証が通る
- [ ] フォロー中ユーザーにのみ送信される（`isFollowing=true` 確認）
- [ ] 1日3通上限が守られる（4回目はスキップ）
- [ ] AI生成メッセージが `CharacterProactiveMessage` に保存される
- [ ] `PushSubscription` を持つユーザーにWeb Push通知が届く
- [ ] 失敗したエンドポイントが自動削除される
- [ ] crontab/PM2でスケジュール登録済み（1日2-3回）

---

## 7. コスト試算

| 条件 | 計算 |
|---|---|
| フォロー関係数 | 100ペア（初期）|
| 1日3回cron | 300回AIコール/日 |
| grok-3-mini (max_tokens=150) | ~$0.0001/call |
| 1日コスト | ~$0.03/日 |
| スケール時 (10,000ペア) | ~$3/日 → 許容範囲 |

**コスト最適化**:
1. `grok-3-mini` 優先使用（Anthropic比で安価）
2. `memorySummary` を活用し会話履歴取得を最小化（直近10件のみ）
3. `MAX_PER_RUN` で1回のcronで処理する上限を設定（初期: 50ペア）

---

## 8. 実装タスク分割

### Task 1: push-dm-ai cron エンドポイント
**ファイル (3以内)**:
1. `src/app/api/cron/push-dm-ai/route.ts` — メイン実装
2. `src/lib/push-dm-generator.ts` — AI生成ロジック（generateProactiveMessage の再利用）
3. `docs/cron-schedule.md` — cronスケジュール更新ドキュメント

**スコープ**: 認証 → フォロワー取得 → 1日上限チェック → AI生成 → DB保存 → Web Push

### Task 2: 既存 push-dm / character-notify の整理（オプション）
**ファイル (2以内)**:
1. `src/app/api/push/character-notify/route.ts` — 非推奨化 or 削除
2. `src/app/api/cron/push-dm/route.ts` — push-dm-ai へのリダイレクト

**スコープ**: 旧エンドポイントを新エンドポイントに統合

---

## 9. リスク

| リスク | 対策 |
|---|---|
| AIコスト急増（フォロワー急増時） | `MAX_PER_RUN` でバッチ上限制御、段階的スケールアップ |
| Push通知の迷惑化（多すぎる） | 1日3通厳守、ユーザーがアプリ内でON/OFF設定できるようにする（将来） |
| LLM APIダウン | try-catch でスキップ、固定テンプレートの `push-dm` をフォールバックとして維持 |
| 既存 proactive-messages との競合 | 8hクールダウンチェックで重複防止 |
| grok-3-mini の品質問題 | 日本語キャラに対してテストし、問題あれば `claude-haiku` に切り替え |
