# ANIVA 体験品質引き上げ 設計書

## #2 ユーザーナラティブサマリー（USER.md方式）

### 目的
ユーザーを「属性リスト」ではなく「人間の物語」として理解する。

### 実装
1. `Relationship` に `narrativeSummary` TEXT フィールド追加（schema.prisma）
2. `src/lib/engine/user-narrative.ts` 新規:
   - `generateNarrative(relationshipId)`: 直近50メッセージ + factMemory + episodeMemory から自然言語サマリーを生成
   - 出力例: 「仕事が忙しい30代で、ルフィの一直線さに憧れている。転職を考えているが踏み出せない。正論より共感を求めるタイプ。冗談でほぐしてから深い話をするリズムが合う」
   - 50メッセージごと or 週次AgentLoopで更新
3. `prompt-builder.ts` の buildSystemPrompt に注入:
   ```
   ## この人について（大切に扱え）
   ${narrativeSummary}
   ```
4. xAI grok-3-mini で生成（コスト最小）

### 完了条件
- narrativeSummary が生成されてプロンプトに注入される
- 実際にチャットして「ユーザーを知っている感」が出る

## #3 日次セッションログ（memory/YYYY-MM-DD.md方式）

### 目的
翌日の「昨日の○○の件どうなった？」を技術的に保証する。

### 実装
1. `DailySessionLog` テーブル追加（schema.prisma）:
   - id, relationshipId, date, summary TEXT, followUpItems JSON, nextDayHook TEXT, emotionalHighlight TEXT, createdAt
   - @@unique([relationshipId, date])
2. `src/lib/engine/session-logger.ts` 新規:
   - `logSessionEnd(relationshipId, conversationId)`: セッション内の会話をLLMで要約
   - 出力: { summary, followUpItems, nextDayHook, emotionalHighlight }
   - nextDayHook例: 「昨日転職の話をしていた。今日の冒頭で自然に聞け」
3. セッション終了トリガー: 
   - chat/stream/route.ts の応答完了後に非同期で実行
   - 最後のメッセージから30分経過で「セッション終了」と判定（AgentLoopのタイミングで）
4. `prompt-builder.ts` に注入:
   ```
   ## 昨日の続き（自然に触れろ）
   ${yesterdayLog?.nextDayHook || ''}
   ```

### 完了条件
- 前日の会話内容が翌日のプロンプトに注入される
- 「昨日の〇〇」に自然に言及する

## #5 キャラ別AGENTS.md + エージェントDM有効化

### 目的
キャラごとに「いつ・何を・どう送るか」の行動原則を定義。

### 実装
1. `characters/{slug}/AGENTS.md` をルフィ/ゾロ/ナミ/サンジ/チョッパーの主要5キャラ分作成
2. `src/lib/agent/decision-engine.ts` 修正:
   - buildDecisionPrompt にキャラ別AGENTS.mdを読み込んで注入
3. stagingの `.env.staging` で `AGENT_DRY_RUN=false` に変更
4. 送信レート制限: 1ユーザー1日最大2回（既存のdailyContactCountで制御済み）

### 完了条件
- ルフィが「おう！最近どうした？」と自発的にDMを送る
- ゾロが「…久しぶりだな」と3日ぶりのユーザーに送る
- DM内容がキャラのAGENTS.mdに沿っている
