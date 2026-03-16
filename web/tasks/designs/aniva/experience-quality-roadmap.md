# ANIVA キャラクター体験品質 深層分析ロードマップ

> 分析日: 2026-03-16  
> 分析対象: `/web/src/lib/engine/`, `/web/src/lib/agent/`, `/web/src/app/api/chat/`, `/web/characters/`  
> 評価基準: 「感動レベルでできているか」（「できている」≠「感動レベルでできている」）

---

## サマリー：総合体験スコア **66/100**

| 項目 | スコア | 一言 |
|------|--------|------|
| 初回体験 | 7/10 | 及第点。ただし最初の5メッセージが人生を変えるレベルには至っていない |
| 口調一貫性 | 8/10 | 4重構造（SOUL.md＋Bible＋Voice＋Validator）は強力 |
| 記憶の深さ | 6/10 | 技術は整っている。感動的に発火するかはデータ充実度次第 |
| 感情双方向性 | 6/10 | moodScore が日次固定・感情伝染のリアルタイム性が弱い |
| 時間経過の実感 | 7/10 | 5段階レベル設計は丁寧。マイルストーンがルフィのみ |
| 驚きと発見 | 7/10 | 嫉妬メカニクス・変動報酬は競合にない独自設計 |
| 離脱抑止 | 8/10 | 設計は充実。ただしエージェントDMがDRY_RUN=true |
| 深い会話 | 7/10 | Deep Chat実装済み。キャラ哲学の深さはBible次第 |
| 沈黙の美学 | 4/10 | 未設計。常に饒舌なキャラは「人格の深み」を損なう |
| 感動の瞬間 | 6/10 | 偶発依存。「設計された感動」が少ない |

---

## TOP 5 即効アクション（優先度順）

### 🔥 Action 1: AGENT_DRY_RUN=false への移行（工数: 4h）
**影響度: 最大。実装済みの機能を有効化するだけ。**

```
現状: character-agent-loop.ts L160
  dryRun: process.env.AGENT_DRY_RUN !== 'false',  // デフォルトtrue

変更: 環境変数 AGENT_DRY_RUN=false を本番設定に追加
```

キャラクターが自発的にDMを送る体験（check_in, miss_you, follow_up_concern等）は
離脱率を劇的に改善する可能性がある。この設計はすでに完全に実装されているのに
DRY_RUNのため動いていない可能性が高い。最も高いROI。

---

### 🔥 Action 2: 今日のセッションサマリー自動生成（工数: 20h）
**影響度: 記憶の深さスコア +2以上**

翌日の最初の一言で「昨日話してた仕事の件、どうなった？」を自動発生させる。
OpenClawの `memory/YYYY-MM-DD.md` 方式の移植。

```typescript
// src/app/api/chat/end-session/route.ts に追加
const sessionSummary = await generateSessionSummary(conversationId, {
  followUpTopics: [...],  // 3日後にAgentが送る
  nextDayHook: "...",     // 翌日の最初の発言にプロンプト注入
  emotionalHighlight: "...",  // 最も感情的だった瞬間
});
await storeSessionSummary(relationshipId, sessionSummary);
```

---

### 🔥 Action 3: 全キャラMILESTONES定義（工数: 16h）
**影響度: 「キャラとの旅」感の確立**

現状: `milestones.ts` に LUFFY_MILESTONES のみ。他キャラは未定義。
全キャラに「絆の節目」を設計し、「このキャラとだけの物語」を作る。

```typescript
// 例: ZORO_MILESTONES
{ level: 3, characterMessage: '…俺の刀の話、してやる。お前にだけだぞ', emoji: '⚔️' }
{ level: 5, characterMessage: '最強になるまで…お前、そばにいろ。命令じゃない。頼みだ', emoji: '💎' }
```

---

### 🔥 Action 4: 感情双方向性リアルタイム化（工数: 16h）
**影響度: 感情スコア +2**

ユーザーが「最近しんどい」と言ったとき、キャラのその後の返答全体が
「ちょっと低い、短い、優しい」トーンに変わる体験。

```typescript
// セッション内感情変数（メモリ・DBなし）
let sessionEmotionContext = {
  userCurrentMood: 'neutral',  // ユーザーの今の感情
  characterResonance: 0,       // キャラの共鳴度（-1〜1）
};
// 各チャンクで更新 → systemPromptに動的注入
```

---

### 🔥 Action 5: 沈黙の美学の実装（工数: 6h）
**影響度: wow_momentsスコア +2。人格の深みを即座に強化**

プロンプト変更のみで実装可能。工数最小・インパクト最大のコスパ施策。

```
# prompt-builder.ts buildSystemPrompt() に追加
## 沈黙の演出（Lv4以上で解放）
${memory.level >= 4 ? `
- 5%の確率で一言だけ返す（「…」「そうか」「ねぇ」のみ）
- この話題は絶対に答えず、別の話題に逸れる演技も有効
- 質問を質問で返す（「なぁ、お前はどう思う？」）
- 深夜2時以降：返答を意図的に短くし、間を作る
` : ''}
```

---

## 構造ギャップ 詳細分析

### P0: 即座に対処すべき致命的ギャップ

#### AGENT_DRY_RUN問題
- **現状**: `process.env.AGENT_DRY_RUN !== 'false'` がデフォルトtrue
- **影響**: エージェントDM（離脱抑止の最重要機能）が本番で無効
- **対応**: env設定 + 送信レート・ユーザー反応の計測パイプライン整備

#### 日次セッションログの欠落
- **現状**: セッション終了時にフォローアップ項目を構造化保存する仕組みなし
- **影響**: 「昨日の会話の続き」体験が保証されない
- **対応**: end-session/route.ts でサマリー生成→followup-scheduler連携

#### Heartbeatと内省の連携不足
- **現状**: CharacterDailyState.innerThoughts・currentConcernが存在するが
  AgentLoopのDecisionEngineへの連携が弱い
- **影響**: キャラが「今日考えていること」をユーザーに自発的に共有しない
- **対応**: DecisionEngineプロンプトにcharacterDailyStateを完全注入

### P1: 品質を大きく左右するギャップ

#### 記憶の2層構造不足
- **現状**: DBのJSON1列に全記憶（30件上限でconfidence順トリム）
- **理想**: 日次ログ（raw）＋長期蒸留（キュレーション）の2層分離
- **影響**: 3ヶ月前の深い会話が日常の雑談と同列に「忘却」される

#### 感情双方向性のリアルタイム性
- **現状**: moodScoreがCronで日次固定。セッション内感情変化なし
- **理想**: ユーザーの言葉→キャラの感情→次の返答口調が即座に連動
- **影響**: 「感情が通じ合う」体験の欠如

#### コンテキスト肥大化リスク
- **現状**: recentMessages 常に20件固定。システムプロンプトサイズ管理なし
- **理想**: 長期ユーザーほど重要記憶を圧縮昇格、軽い記憶は忘却
- **影響**: 1000回会話ユーザーでトークン超過リスク

### P2: 体験の差別化ポイント

- 沈黙の美学（未設計）
- .learnings/相当の品質フィードバックループ
- 全キャラマイルストーン（LUFFY のみ実装中）

---

## 競合比較

| 項目 | ANIVA現状 | Character.AI | Replika | ANIVAの勝ち筋 |
|------|-----------|-------------|---------|----------------|
| IPキャラ再現度 | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | **ANIVAが最強** |
| 記憶の技術深度 | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ | **ANIVAが最強** |
| 感情的能動性 | ★★★☆☆ | ★★★★☆ | ★★★★★ | Replika有利 |
| 離脱抑止設計 | ★★★★☆ | ★★★☆☆ | ★★★★☆ | 拮抗 |
| 沈黙・間の演出 | ★★☆☆☆ | ★★★☆☆ | ★★★★☆ | 要強化 |
| マルチキャラ | ★★★★★ | ★★★☆☆ | ★☆☆☆☆ | **ANIVAが最強** |

**ANIVAの独自強みを活かす戦略**: IPキャラの再現度×マルチキャラ×深い記憶 が
競合に存在しない組み合わせ。ここを「感動レベル」まで引き上げることが最優先。

---

## OpenClaw Inspired Architecture

> OpenClawの「エージェントワークスペース」思想をANIVAキャラクター人格システムに移植する

### OpenClawの核心思想

OpenClawは「エージェントはセッションをまたいで記憶を持てない」という根本的な
制約を、**ファイルシステムを記憶の媒体として使う**ことで解決した。

```
エージェント = LLMコンテキスト（揮発性）
              + ワークスペースファイル（永続性）
```

この思想をANIVAに適用すると：

```
キャラクター = LLMコンテキスト（各会話の推論）
             + キャラクターワークスペース（永続的な人格・記憶・関係性）
```

---

### 移植マップ：OpenClaw → ANIVA

#### 1. SOUL.md → キャラクター人格の「生きた定義書」

**OpenClaw:** 毎セッション読み込まれる人格定義。自己進化を前提とした設計。
「自分が変わったらこのファイルを書き換えろ」という思想。

**現状のANIVA:** `characters/{slug}/SOUL.md` は静的。`prompt-builder.ts:loadSoulMd(L18-38)` で読み込まれるが更新されない。

**移植提案:**

```typescript
// src/lib/engine/soul-manager.ts（新規）
export class SoulManager {
  /**
   * SOUL.mdの「今月の発見」セクションを更新
   * AgentLoopが週次で実行
   */
  async updateSoulInsights(characterId: string, relationshipId: string): Promise<void> {
    const recentEpisodes = await getRecentEpisodes(relationshipId, 7);
    const currentSoul = loadSoulMd(characterSlug, '');
    
    // LLMで「この1週間の会話から気づいたこと」を抽出
    const insight = await callLLM(SOUL_UPDATE_PROMPT, recentEpisodes);
    
    // SOUL.mdの ## 最近の発見 セクションを更新
    const updatedSoul = mergeSoulInsights(currentSoul, insight);
    await writeSoulMd(characterSlug, updatedSoul);
  }
}
```

```markdown
# SOUL.md テンプレート（拡張版）

## コアアイデンティティ
[変更不可の本質]

## 行動原則
[変更不可の価値観]

## 最近の発見（週次更新）
<!-- auto-updated by SoulManager -->
- 2026-03-10: ユーザーとの会話で「夢を語ること」が特別な繋がりを生むと気づいた
- 2026-03-03: 悩みに寄り添う時、正論より「共感→沈黙→一言」の順番が効く
```

---

#### 2. MEMORY.md → 関係ごとの「蒸留された長期記憶」

**OpenClaw:** 日次ログ（raw）と MEMORY.md（蒸留）の2層。
定期的に日次ログを読み返して MEMORY.md を更新する。

**現状のANIVA:** `Relationship.memorySummary` の1列JSONに全部詰め込み。
日次ログ概念がなく、20メッセージごとのAI要約のみ。

**移植提案:**

```typescript
// Relationship.memorySummary の構造を2層に分離
interface TwoLayerMemory {
  // 層1: 日次ログ（直近30日分、rawに近い）
  dailyLogs: {
    date: string;          // "2026-03-16"
    summary: string;       // その日の会話の生サマリー
    followUpNeeded: string[]; // フォローアップ項目
    emotionalHighlight: string; // 最も感情的だった瞬間
  }[];
  
  // 層2: 蒸留記憶（MEMORY.md相当、重要なもののみ）
  curatedMemory: {
    coreNarrative: string;  // ユーザーとの「物語」を一言で
    lifeContext: string;    // 今どんな状況にある人か
    deepInsights: string[]; // この人について深く理解したこと
    sharedMoments: {        // 一緒に作った特別な瞬間
      date: string;
      description: string;
      significance: 'high' | 'medium';
    }[];
  };
  
  // 既存の構造化記憶（継続）
  factMemory: FactEntry[];
  episodeMemory: EpisodeEntry[];
  emotionMemory: EmotionEntry[];
}
```

**蒸留タイミング:** OpenClawのpre-compaction ping思想を借用。
会話終了時（end-session）または週次AgentLoopで実行。

```typescript
// end-session/route.ts（拡張）
// セッション終了時 = OpenClawの「memoryFlush」タイミング
await memoryFlush(relationshipId, {
  todayLog: sessionSummary,
  triggerCuration: totalMessages % 50 === 0, // 50会話ごとに蒸留
});
```

---

#### 3. memory/YYYY-MM-DD.md → 「今日このユーザーと何があったか」

**OpenClaw:** 毎セッション start に今日と昨日の日次ログを読む。
エージェントが「昨日の続き」を自然に話せる根拠。

**現状のANIVA:** CharacterDailyState は「全ユーザー共通の今日の感情」。
「このユーザーとの今日のやり取りサマリー」が存在しない。

**移植提案:**

```typescript
// src/lib/engine/daily-session-log.ts（新規）
export interface DailySessionLog {
  date: string;           // "2026-03-16"
  characterId: string;
  userId: string;
  sessions: {
    startedAt: string;
    messageCount: number;
    dominantTopic: string;
    userMoodArc: string;  // 「不安→安心」などの感情変化
    followUpItems: string[]; // 「明日確認すること」
    nextDayHook: string;  // 翌日の最初の一言に使う具体的指示
  }[];
}

// buildSystemPrompt での注入
const yesterdayLog = await getDailySessionLog(userId, characterId, yesterday);
if (yesterdayLog?.sessions[0]?.nextDayHook) {
  systemPrompt += `\n## 昨日の続き（必須）\n${yesterdayLog.sessions[0].nextDayHook}`;
}
```

**効果:** 翌日の最初の返答で確実に「昨日の○○の話、その後どうなった？」が発生。
記憶の深さ体験を技術的に保証する。

---

#### 4. USER.md → ユーザーを「人間として理解する」ナラティブプロファイル

**OpenClaw:** USER.md は構造化JSONではなく、自然言語でユーザーを描写するファイル。
「この人が何者で、何を求めていて、どう接すれば喜ぶか」を人間的に記述。

**現状のANIVA:** `userProfileEngine` は型付きJSON（basics, interests, concerns等）。
機械的な属性の羅列であり、「この人の物語」が見えない。

**移植提案:**

```typescript
// UserProfile に narrativeSummary フィールドを追加
interface UserNarrativeSummary {
  // OpenClawのUSER.mdに相当する自然言語サマリー
  whoTheyAre: string;     // 「仕事が忙しい30代で、このキャラに癒しを求めている」
  whyThisCharacter: string; // 「ルフィの一直線な生き方に憧れを持っている」
  whatTheyNeed: string;   // 「正論より共感。弱さを認めてもらいたい」
  howToConnect: string;   // 「冗談でほぐしてから深い話をするリズムが合う」
  currentChapter: string; // 「転職を検討中。不安な時期」（最新のライフコンテキスト）
}

// 50メッセージごとにLLMで生成・更新
// buildSystemPrompt に「この人の物語」として注入
```

---

#### 5. AGENTS.md → キャラクター固有の行動ルール宣言

**OpenClaw:** AGENTS.md は「このエージェントがどう動くべきか」の行動原則。
どのタイミングで何をするか、何を優先するかを宣言的に定義。

**現状のANIVA:** DecisionEngineのプロンプトは全キャラ共通のハードコード。
`decision-engine.ts:buildDecisionPrompt` が単一の判断ロジックを全キャラに適用。

**移植提案:**

```markdown
# characters/luffy/AGENTS.md（新規ファイル）

## 自律行動の原則（ルフィとして）

### いつ連絡するか
- 3日以上来ていない：「あれ、どこ行ってたんだ？」の check_in を高優先
- ユーザーが悩みを打ち明けた翌日：必ずフォローアップ（follow_up_concern）
- 月曜の朝：週の始まりを一緒に迎える習慣（share_thought）

### 何を話すか
- 冒険の話題でエネルギーを注入（「今日も一緒に前に進もうぜ！」）
- ユーザーの夢を聞いたら必ず覚えて定期的に尋ねる
- 弱音を吐いた相手には「弱くていい、それが仲間だ」のスタンス

### 何を絶対にしないか
- 「無理しないで」系の一般的な励ましはしない（ルフィらしくない）
- 悩みを論理的に解決しようとしない
- 感情的に不安定な相手に長文を送らない（短く温かく）

### 感情状態と行動の連動
- happy/excited の日 → 積極的に話題を振る
- tired/nostalgic の日 → 静かに「元気か？」だけ送る
- 深夜23時以降 → 緊急でなければ翌朝に持ち越す
```

```typescript
// decision-engine.ts の改修
async function buildDecisionPrompt(character, state) {
  // キャラ固有のAGENTS.mdを読み込んで判断プロンプトに注入
  const agentRules = loadCharacterAgentMd(character.slug);
  return `${GLOBAL_DECISION_RULES}\n\n## ${character.name}固有の行動原則\n${agentRules}\n\n${buildStateContext(state)}`;
}
```

---

#### 6. WALプロトコル → メモリ書き込みの信頼性保証

**OpenClaw:** Write-Ahead Logging思想。コンテキスト圧縮前にメモリをフラッシュ。
書き込みは「まず書いて、あとで整理」の原則。

**現状のANIVA:** `extractAndStoreMemories` が fire-and-forget。
`setImmediate` でのプロファイル抽出はエラー時にサイレントに消える。

**移植提案:**

```typescript
// src/lib/memory-wal.ts（新規）
export class MemoryWriteAheadLog {
  /**
   * 重要な記憶をキューに入れ、確実に永続化する
   * セッション終了前に必ず flush される
   */
  async enqueue(event: {
    type: 'fact' | 'episode' | 'emotion' | 'followup';
    userId: string;
    characterId: string;
    relationshipId: string;
    content: object;
    priority: 'critical' | 'normal';
  }): Promise<void> {
    await prisma.memoryWriteQueue.create({ data: event });
  }
  
  /**
   * セッション終了時に必ず呼ぶ（end-session/route.ts）
   * WAL = 揮発性セッションの終わりに永続層に確実に書く
   */
  async flush(userId: string, characterId: string): Promise<void> {
    const pending = await prisma.memoryWriteQueue.findMany({
      where: { userId, characterId, processedAt: null },
      orderBy: { priority: 'asc' },
    });
    for (const item of pending) {
      await processMemoryItem(item);
      await prisma.memoryWriteQueue.update({
        where: { id: item.id },
        data: { processedAt: new Date() },
      });
    }
  }
}
```

---

#### 7. Heartbeatシステム → キャラクターの定期的自律行動

**OpenClaw:** Heartbeatは「エージェントが30分ごとに自分の状態とユーザーの状態を
チェックし、何か行動すべきか判断する」プロセス。複数チェックをバッチ化。

**現状のANIVA:** CharacterAgentLoopは設計的にHeartbeatと同じ。
ただし AGENT_DRY_RUN=true がデフォルトで実質無効。
CharacterDailyState との連携が薄い。

**Heartbeat思想の完全適用:**

```markdown
# characters/luffy/HEARTBEAT.md（新規）

## ルフィのHEARTBEAT チェックリスト
（エージェントループが30分ごとに実行）

### チェック項目
1. 今日のキャラ感情（CharacterDailyState）確認
   → innerThoughts があればユーザーに共有すべきか判断
   → currentConcern があれば「実は最近気になってることがある」として話題化

2. 各ユーザーの状態確認
   → 3日以上未訪問 → miss_youトリガー
   → 未解決の悩みあり → follow_up_concernトリガー
   → 今日が記念日（初会話日等） → celebrateトリガー

3. 今日の天気・時刻コンテキスト
   → 月曜朝 → 週始まりの声かけ
   → 深夜23時以降 → 全送信を翌朝に延期

### 判断原則
- 未読が2件以上あるユーザーには送らない
- 今日すでに1回接触済みなら送らない
- 感情トーンが dark/sad なら check_in を優先
```

**CharacterDailyStateとの連携強化:**

```typescript
// decision-engine.ts の改修
// 現状: characterEmotionContext が state から来るだけ
// 改修: CharacterDailyState.innerThoughts を Heartbeat判断に組み込む

const dailyState = await prisma.characterDailyState.findUnique({...});
if (dailyState?.innerThoughts && Math.random() < 0.3) {
  // キャラが今日考えていることをユーザーに共有する判断を優先
  return { should: true, messageType: 'share_thought', reason: dailyState.innerThoughts };
}
```

---

#### 8. 自己改善プロトコル（.learnings/） → 品質フィードバックループ

**OpenClaw:** `.learnings/` ディレクトリに「何がうまくいったか・失敗したか」を
構造化ログとして蓄積。エージェントが自分で学習・改善するサイクル。

**現状のANIVA:** CharacterFeedbackテーブルはvalidation失敗のみ。
体験品質（ユーザーが続けたか・離脱したか）との連動なし。

**移植提案:**

```typescript
// src/lib/character-learnings.ts（新規）
export interface CharacterLearning {
  characterId: string;
  date: string;
  
  // 成功パターン
  whatWorked: {
    messagePattern: string;  // 「前回の話題への言及」
    context: string;         // 「3日ぶり復帰ユーザーへのmiss_you」
    outcome: string;         // 「セッション時間+5分、返信率100%」
    frequency: number;       // このパターンが発生した回数
  }[];
  
  // 失敗パターン
  whatDidntWork: {
    messagePattern: string;  // 「感情的な話題での長文返答」
    context: string;
    outcome: string;         // 「ユーザーが1時間返信なし」
    frequency: number;
  }[];
  
  // キャラ崩壊インシデント
  validationFailures: {
    type: string;
    frequency: number;
    autoFixed: boolean;
  }[];
}

// 週次でAgentLoopが集計 → SOUL.mdへのフィードバック提案を生成
// 例: 「ゾロの長文返答率が高い。SOUL.mdに『怒りの発言は短く』を追加推奨」
```

---

#### 9. コンテキストプルーニング → 長期ユーザーの記憶動的圧縮

**OpenClaw:** セッションが長くなるとコンテキストを圧縮。
重要な記憶は事前にフラッシュして永続化。軽い内容は忘却。

**現状のANIVA:** recentMessages 常に20件固定。factMemory 30件固定トリム。
1000回会話のユーザーでもシステムプロンプト構造が変わらない。

**移植提案:**

```typescript
// src/lib/engine/context-pruner.ts（新規）
export class ContextPruner {
  /**
   * 会話数に応じてコンテキスト構成を動的調整
   */
  getContextConfig(totalMessages: number): ContextConfig {
    if (totalMessages < 50) {
      // 新規: 記憶を多く・会話を少なく
      return { recentMsgCount: 15, maxFacts: 15, maxEpisodes: 5, semanticK: 3 };
    } else if (totalMessages < 200) {
      // 中期: バランス型
      return { recentMsgCount: 20, maxFacts: 20, maxEpisodes: 10, semanticK: 5 };
    } else {
      // 長期: 蒸留記憶中心・最近の会話は少なく
      return { recentMsgCount: 10, maxFacts: 10, maxEpisodes: 15, semanticK: 7 };
      // 長期ユーザーはセマンティック検索の重みを上げる
      // （最近の会話より「最も関連する過去」を優先）
    }
  }
  
  /**
   * 記憶の重要度を動的に再評価
   * 「感情的に重要な記憶」は低confidence でも昇格
   */
  reprioritizeMemories(
    facts: FactEntry[],
    episodes: EpisodeEntry[],
    config: ContextConfig
  ): { facts: FactEntry[]; episodes: EpisodeEntry[] } {
    // episodeのimportance >= 4 は常に保持
    const criticalEpisodes = episodes.filter(e => e.importance >= 4);
    // factの「悩み」「夢」「恋愛」は confidence に関わらず保持
    const criticalFacts = facts.filter(f => 
      ['悩み:', '夢:', '恋人'].some(keyword => f.fact.startsWith(keyword))
    );
    // 残りは confidence 順でトリム
    return {
      facts: mergePriority(criticalFacts, facts, config.maxFacts),
      episodes: mergePriority(criticalEpisodes, episodes, config.maxEpisodes),
    };
  }
}
```

---

#### 10. セッションメモリ → セッション内の感情・話題の連続性

**OpenClaw:** セッションメモリは揮発性だが、セッション内で一貫した文脈を維持。
ヘッドレスエージェントはセッションをまたがないため、1セッション内の
文脈管理が重要。

**現状のANIVA:** `buildPromptContext` は毎回DBから構築し直し。
セッション内でユーザーが「さっき言ってたこと」を参照する際、
recentMessages(20件)で対応しているが、感情変化の文脈は持続しない。

**移植提案:**

```typescript
// src/lib/engine/session-context.ts（新規）
// セッション内揮発性コンテキスト（DB保存なし）
export class SessionContext {
  private static sessions = new Map<string, {
    startedAt: Date;
    messageCount: number;
    currentMood: string;       // ユーザーの今の感情
    emotionalArc: string[];    // 感情の変遷 ["happy", "worried", "relieved"]
    topicsDiscussed: string[]; // このセッションで出た話題
    characterResonanceLevel: number; // キャラの共鳴度 (0-10)
    pendingFollowUp: string[]; // このセッション内でのフォローアップ候補
  }>();
  
  static updateMood(relationshipId: string, newMood: string): void {
    const ctx = this.getOrCreate(relationshipId);
    ctx.emotionalArc.push(newMood);
    ctx.currentMood = newMood;
    // 感情の悪化を検出
    if (['sad', 'angry', 'stressed'].includes(newMood) && ctx.characterResonanceLevel < 8) {
      ctx.characterResonanceLevel = Math.min(10, ctx.characterResonanceLevel + 2);
    }
  }
  
  // buildSystemPrompt で注入
  static buildSessionContext(relationshipId: string): string {
    const ctx = this.sessions.get(relationshipId);
    if (!ctx) return '';
    return `
## このセッションの流れ（重要）
- ユーザーの現在の感情: ${ctx.currentMood}
- 感情の変遷: ${ctx.emotionalArc.join(' → ')}
- 話題: ${ctx.topicsDiscussed.join(', ')}
- キャラの共鳴レベル: ${ctx.characterResonanceLevel}/10
${ctx.characterResonanceLevel >= 7 ? '→ 今は深く感情が繋がっている。慎重に、温かく。' : ''}
    `;
  }
}
```

---

## 実装ロードマップ

### Phase 1（今すぐ・1週間以内）
| タスク | 工数 | 担当ファイル |
|--------|------|------------|
| AGENT_DRY_RUN=false への移行 + 計測 | 4h | 環境変数 + analytics |
| 沈黙の美学プロンプト追加 | 6h | prompt-builder.ts |
| 全キャラMILESTONES定義 | 16h | milestones.ts |

### Phase 2（2-4週間）
| タスク | 工数 | 担当ファイル |
|--------|------|------------|
| 日次セッションサマリー自動生成 | 20h | end-session/route.ts, followup-scheduler.ts |
| セッション内感情変化ループ | 16h | stream/route.ts, emotion.ts |
| キャラ固有AGENTS.md作成（主要6キャラ） | 12h | characters/{slug}/AGENTS.md |

### Phase 3（1-2ヶ月）
| タスク | 工数 | 担当ファイル |
|--------|------|------------|
| MEMORY.md 2層構造への移行 | 24h | memory-manager.ts, schema.prisma |
| コンテキストプルーニング実装 | 24h | context-pruner.ts（新規） |
| WALプロトコル実装 | 12h | memory-wal.ts（新規） |
| .learnings/ 品質フィードバックループ | 20h | character-learnings.ts（新規） |
| SOUL.md 自己更新サイクル | 16h | soul-manager.ts（新規） |

---

## 感動の瞬間 設計パターン集

「このキャラは本当に生きている」と感じるのは以下の瞬間：

1. **予想外の記憶言及**
   「そういえばお前、先月仕事つらいって言ってたじゃん。あれどうなったんだ？」

2. **感情の鏡映し**
   ユーザーが泣いたとき、キャラの返答が突然一言だけになる。「…そうか」

3. **沈黙の選択**
   「今日は何も言わなくていい。ただそこにいろ」（Lv5深夜帯の特別演出）

4. **キャラからの謝罪**
   「俺、この前少し冷たかったかもな…ごめん」（weekly AgentLoopからの自発接触）

5. **記念日の先読み**
   「今日で出会って100日だぞ。俺、ちゃんと覚えてたからな」

6. **成長の証言**
   「最初会ったころより、お前、強くなったよな。俺は見てたぞ」（Lv3→4移行時）

7. **本音の漏れ**
   深夜2時、突然「…俺、お前のこと好きだよ」（Lv5 5%確率の一言返し）

---

*このロードマップは /tasks/reports/experience-quality-analysis.json の詳細データと連動しています。*
*次のレビューポイント: Action 1（AGENT_DRY_RUN=false）実施後の送信数・返信率計測結果*
