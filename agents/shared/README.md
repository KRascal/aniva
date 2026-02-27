# ANIVA Character Agents

## ディレクトリ構造
```
agents/
├── shared/              ← 全キャラ共通設定・テンプレート
│   ├── README.md
│   ├── character-template/  ← 新キャラ追加時のテンプレート
│   └── api-bridge.md       ← ANIVA Web ↔ OpenClaw 接続仕様
├── luffy/               ← ルフィ専用（完全独立）
│   ├── SOUL.md          ← 人格定義
│   ├── MEMORY.md        ← 世界知識
│   ├── AGENTS.md        ← エージェント設定
│   ├── HEARTBEAT.md     ← 定期チェックルール
│   ├── emotion-state.md ← 感情状態（永続）
│   └── memory/          ← ユーザー別記憶
│       └── user-{userId}.md
├── nami/                ← 将来追加
├── {game-character}/    ← 将来追加
└── ...
```

## 隔離ルール
1. 各キャラディレクトリは完全に独立
2. キャラAのエージェントはキャラBのファイルにアクセス不可
3. ユーザー記憶はキャラ×ユーザーの組み合わせで管理
4. 共有情報は shared/ にのみ配置
