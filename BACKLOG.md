# ANIVA Development Backlog

## Sprint 1: Week 1 (Foundation)

### 1.1 Database & ORM [P0] [依存なし]
- [ ] Prisma セットアップ (web/prisma/schema.prisma)
- [ ] 全データモデル定義 (User, Character, Relationship, Conversation, Message, Moment, Subscription, Transaction)
- [ ] PostgreSQL接続設定
- [ ] マイグレーション実行
- [ ] Seed: ルフィのキャラクターデータ投入
- **担当:** coder
- **見積:** 2-3時間

### 1.2 Auth [P0] [依存: 1.1]
- [ ] NextAuth.js セットアップ
- [ ] メール認証 (Magic Link)
- [ ] Google OAuth
- [ ] セッション管理 (JWT)
- [ ] Auth middleware
- **担当:** coder
- **見積:** 2-3時間

### 1.3 Character Engine Core [P0] [依存: 1.1]
- [ ] Character Sheet定義 (ルフィ): System Prompt + 口調ルール + 決め台詞
- [ ] Claude API統合 (Anthropic SDK)
- [ ] メッセージ処理パイプライン (入力→LLM→出力)
- [ ] 会話履歴管理 (直近20メッセージをコンテキストに)
- [ ] パーソナライズメモリ (名前、好み記憶)
- [ ] NGガード (AIメタ表現ブロック)
- **担当:** coder
- **見積:** 4-5時間

### 1.4 Chat API [P0] [依存: 1.2, 1.3]
- [ ] POST /api/chat/send
- [ ] GET /api/chat/history/:relationshipId
- [ ] WebSocket チャットストリーム
- [ ] レート制限 (Free: 3msg/日, Standard: 無制限)
- [ ] 関係性レベル更新ロジック
- **担当:** coder
- **見積:** 3-4時間

### 1.5 Chat UI (Web) [P0] [依存: 1.4]
- [✅] チャット画面レイアウト (モバイルファースト)
- [✅] メッセージ入力 & 送信
- [✅] メッセージ一覧表示 (リアルタイム更新)
- [✅] キャラクター選択画面
- [✅] タイピングインジケーター
- [✅] 関係性レベル表示
- **担当:** coder
- **見積:** 4-5時間

### 1.6 Chat UI (Mobile) [P1] [依存: 1.4]
- [ ] React Native チャット画面
- [ ] プッシュ通知基盤 (Expo Notifications)
- [ ] ナビゲーション (Expo Router)
- **担当:** coder
- **見積:** 4-5時間

## Sprint 2: Week 2 (Voice & Visual)

### 2.1 Voice Engine [P0] [✅]
- [✅] ElevenLabs API統合 (MVP) — fetchベース、SDKなし
- [✅] ボイスメッセージ生成 API (`/api/voice/generate`)
- [✅] 音声ファイル保存 (ローカル `public/audio/`) 
- [✅] チャットUIに音声再生プレーヤー統合
- **見積:** 3-4時間

### 2.2 Live2D Integration [P0]
- [ ] Live2D Cubism SDK Web統合
- [ ] ルフィのLive2Dモデル (基本表情セット)
- [ ] リップシンク (音声連動)
- [ ] 表情変化 (会話内容に連動)
- [ ] チャット画面にLive2D表示
- **見積:** 6-8時間

### 2.3 AI Image Generation [P1]
- [ ] Flux API統合 or セルフホスト
- [ ] ルフィのLoRAモデル準備
- [ ] 自撮り生成プロンプト設計
- [ ] 画像生成 API
- [ ] チャットUIに画像表示
- **見積:** 4-5時間

### 2.4 Moments (Timeline) [P1] ✅
- [✅] Moments API (CRUD)
- [✅] Moments UI (フィード形式)
- [✅] いいね (toggle like)
- [✅] ロックコンテンツ (blur + badge)
- [✅] 開発用シーディングAPI
- **見積:** 3-4時間

## Sprint 3: Week 3-4 (Payment & Polish)

### 3.1 Stripe Integration [P0] ✅
- [✅] Stripe セットアップ
- [✅] サブスクリプション (Free/Standard/Premium)
- [✅] チップ機能
- [✅] Webhook処理
- **完了:** 2026-02-21 — commit cb14027 (+ e71dcfc, 757a111, e47d56e, a8d507b)
- ⚠️ Stripe本番キー (sk_live/pk_live) + Price IDs → Keisuke提供待ち

### 3.2 Push Notifications [P0] ✅
- [✅] キャラからの自発的メッセージ生成
- [✅] Web Push (PWA / VAPID)
- [ ] Mobile Push (Expo) — 将来対応
- [ ] 通知スケジューラ (朝・昼・夜) — 将来対応
- **完了:** 2026-02-21 — commit 9d81834

### 3.3 Relationship System [✅]
- [x] レベルアップロジック完成（leveledUp検知 + API返却）
- [x] レベルアップモーダル（LevelUpModal）
- [x] マイルストーン演出 (仲間宣言等) — LUFFY_MILESTONES + /api/relationship/[characterId]/milestones
- [x] 関係性プロフィール画面 (/profile/[characterId])
- [ ] レベル別キャラ態度変化（将来対応）
- [ ] 記念日トラッキング（将来対応）
- **見積:** 3-4時間
- **完了:** 2026-02-21 — commit 52c8dc3

### 3.4 First Experience (Onboarding) [P0]
- [✅] 初回体験フロー (キャラが名前を聞く)
- [✅] 音声付き自己紹介
- [ ] Live2D演出（将来対応）
- **見積:** 2-3時間
- **完了:** 2026-02-21 — OnboardingOverlay + /api/chat/greet + ルフィ自動挨拶

### 3.5 UI Polish & Responsive [P1] ✅
- [✅] ローディング/エラー状態 (loading skeletons, error.tsx, not-found.tsx)
- [✅] アニメーション (CSS fadeIn等)
- [✅] UX改善 (文字数カウンター, Enter送信, 送信中UI)
- [ ] ダークモード — 将来対応
- **完了:** 2026-02-21 — commit e59eac0

## Sprint 4: Week 5-6 (Testing & Launch)

### 4.1 Testing [🔄 進行中]
- [🔄] E2Eテスト (Playwright) — coder subagent実行中 (22:30〜)
- [🔄] API テスト
- [ ] 人格再現テスト (ルフィらしさの定性評価)
- **見積:** 3-4時間

### 4.2 Deploy ✅
- [✅] VPS デプロイ — PM2 `aniva` online (port 3050)
- [✅] Nginx reverse proxy — http://aniva.162.43.90.97.nip.io
- [✅] Dockerfile + docker-compose + CI/CD config — commit 9c551d5
- [ ] 本番ドメイン設定 — 将来対応
- **完了:** 2026-02-21

### 4.3 SEO & Marketing準備 ✅
- [✅] OGP / メタタグ — layout.tsx更新
- [✅] LP (ランディングページ) — src/app/page.tsx
- [✅] manifest.json + PWA設定
- **完了:** 2026-02-21 — commit d37cdff

---

## タスクステータス凡例
- [ ] 未着手
- [🔄] 進行中
- [✅] 完了
- [❌] ブロック

## 自律開発ルール
1. 上から順に依存関係を確認して着手
2. 1タスク完了 → git commit → push
3. 完了したら BACKLOG.md を更新
4. ブロックがあれば Keisuke に報告
