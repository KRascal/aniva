# API Bridge — ANIVA Web ↔ OpenClaw Gateway

## 接続方式
ANIVA Web (Next.js) → HTTP POST → OpenClaw Gateway API → キャラエージェント → レスポンス

## エンドポイント設計

### チャットメッセージ送信
```
POST /api/chat/send (ANIVA Web内)
Body: { characterId, message, userId }

内部処理:
1. characterIdからキャラエージェント名を解決 (luffy, nami, etc.)
2. userIdからユーザー記憶ファイルパスを生成
3. OpenClaw Gateway APIにsessions_send
   - agentId: {character-name}
   - task: ユーザーメッセージ + ユーザーコンテキスト
4. レスポンスを受け取り、DBに保存してフロントに返却
```

### プロアクティブ通知
```
OpenClaw cron → キャラエージェントのHEARTBEAT
→ 通知候補を生成
→ ANIVA Web API /api/push/character-message にPOST
→ プッシュ通知送信
```

### 感情状態取得
```
GET /api/character/{characterId}/emotion
→ emotion-state.md を読み取って返却
→ フロントのLive2D/UI表示に使用
```

## 認証
- ANIVA Web → OpenClaw: 内部API key (環境変数)
- ユーザー認証: ANIVA Web側のNextAuth で処理済み
- OpenClawエージェントはユーザー認証を意識しない（userIdだけ受け取る）

## メッセージフォーマット
```json
{
  "role": "user",
  "content": "{ユーザーメッセージ}",
  "metadata": {
    "userId": "abc123",
    "userName": "ケイスケ",
    "userLevel": 5,
    "timeOfDay": "evening",
    "weather": "sunny",
    "isAnniversary": false,
    "daysSinceLastChat": 0
  }
}
```
