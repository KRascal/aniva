# 管理画面仕上げ設計書 — キャラ立ち上げロードマップ + 差分補完

作成: 2026-03-17
担当: coder subagent

## 背景
ANIVAは本番ローンチ時にキャラ0からスタートする。
IPホルダーと契約後→キャラ登録→コンテンツ生成→テスト→本番公開まで
一本のフローで管理画面から全て完結させる必要がある。

## 現状の管理画面で足りないもの（差分分析）

### ★★★ P0: キャラ立ち上げロードマップページ（新規）
- パス: `/admin/characters/[id]/launch`
- 内容: キャラが本番公開できる状態かを一覧でチェックする「ローンチチェックリスト」
  1. ✅ 基本情報（name/slug/systemPrompt/avatarUrl/coverUrl）
  2. ✅ CharacterSoul登録済み
  3. ✅ CharacterVoice登録済み  
  4. ✅ CharacterBoundary（禁止事項）登録済み
  5. ✅ CharacterQuote（口調サンプル）3件以上
  6. ✅ GachaBanner 1つ以上（isActive=true）
  7. ✅ GachaCard 5枚以上（N/R/SR/SSR/UR各1）
  8. ✅ StoryChapter 3章以上
  9. ✅ Moments 5件以上
  10. ✅ テストチャット実施済み（test-chat）
  11. ✅ isActive=true
  12. ✅ Stripe商品ID設定済み（stripeProductId）
- 各チェック項目に「設定する →」リンク
- 全項目クリアで「🚀 本番公開する」ボタン → isActive=trueに変更
- APIパス: `GET /api/admin/characters/[id]/launch-status`

### ★★ P1: グループチャット設定ページ（新規）
- パス: `/admin/characters/[id]/group-config`
- 内容: このキャラがグループチャットに参加した時の挙動設定
  - キャラの発言頻度（高い/普通/低い）
  - 掛け合いする相手キャラのホワイトリスト（他のcharacterを選択）
  - グループでの特別な口調設定（グループ専用systemPromptの追加命令）
  - グループチャット用コイン消費設定（現在はchatCoinPerMessage×N）
- DBへの保存: Character.settings JSONに追加（`groupChatConfig: {...}`）

### ★★ P1: キャラクターReadinessダッシュボード（既存topページに統合）
- `/admin` のトップページに「キャラ別ローンチ状態」テーブルを追加
- 各キャラの完成度スコア（0-100%）を表示
- 完成度が低いキャラには「⚠️ 未完成」バッジ

### ★ P2: SOUL.mdファイル管理（既存bible/pageの拡張）
- `/admin/characters/[id]/bible` に「SOUL.mdプレビュー」タブ追加
- 現在のSOUL.mdファイル内容を表示（読み取り専用）
- 「DBのsystemPromptをSOUL.mdに書き出す」ボタン（既存APIを呼ぶだけ）

## 実装対象: P0 キャラ立ち上げロードマップ

### ファイル1: `/api/admin/characters/[id]/launch-status/route.ts`
GET APIで以下を返す:
```ts
interface LaunchStatus {
  characterId: string;
  characterName: string;
  slug: string;
  score: number; // 0-100
  checks: {
    id: string;
    label: string;
    passed: boolean;
    count?: number;      // 件数
    required?: number;   // 必要件数
    editPath: string;    // 管理画面のURL
    critical: boolean;   // これがfalseだと公開不可
  }[];
  canLaunch: boolean;    // 全criticalがtrueかどうか
  isActive: boolean;
}
```

チェック実装:
- basicInfo: name && slug && systemPrompt && avatarUrl && coverUrl（全部ある）
- characterSoul: CharacterSoul.count({ where: { characterId } }) > 0
- characterVoice: CharacterVoice.count == 1
- characterBoundary: CharacterBoundary.count >= 1
- characterQuote: CharacterQuote.count >= 3
- gachaBanner: GachaBanner.count({ where: { characterId, isActive: true } }) >= 1
- gachaCards: GachaCard.count({ where: { characterId } }) >= 5
- storyChapters: StoryChapter.count({ where: { characterId } }) >= 3
- moments: Moment.count({ where: { characterId } }) >= 5
- stripeProduct: character.stripeProductId !== null
- isActive: character.isActive === true

### ファイル2: `/admin/characters/[id]/launch/page.tsx`
UIコンポーネント:
- ヘッダー: キャラ名 + アバター + 完成度スコア（円グラフ）
- チェックリスト: 各項目を
  - ✅ 緑（passed） / ⚠️ 黄（not required not passed） / ❌ 赤（critical not passed）
  - 「設定する」リンク
- フッター: 「🚀 本番公開する」ボタン（canLaunch && !isActiveの時のみ表示）
  - クリックで PATCH /api/admin/characters/[id] { isActive: true }

### ファイル3: 既存 `/admin/characters/page.tsx` の CharacterTable に「ローンチ」リンク追加
- 各行に「📋 ローンチ確認」ボタン → `/admin/characters/[id]/launch` に遷移

## 完了条件
1. GET /api/admin/characters/[id]/launch-status が正しいJSONを返す
2. /admin/characters/[id]/launch でページが表示される
3. TSC noEmit エラーなし
4. pnpm build 成功
5. 既存ページ（/admin/characters）が壊れていない

## 注意事項
- 既存コードを絶対に壊さない
- requireRole('editor') 認証必須
- CharacterTable.tsxに「ローンチ」列を追加する（最小限の変更）
- 新規ファイルは2つのみ（route.ts + page.tsx）+ CharacterTable.tsxの1箇所修正
