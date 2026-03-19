# ANIVA 開発ルール（プロジェクトルート配置 — 全セッション必読）

## このファイルの役割
セッション切れで文脈が消えても、このファイルを読めばANIVAの全ルールが復元される。

## 作業ディレクトリ
`/home/openclaw/.openclaw/workspace/projects/aniva/`
webディレクトリ: `/home/openclaw/.openclaw/workspace/projects/aniva/web/`

## デプロイ
```bash
# ステージング
bash /home/openclaw/.openclaw/workspace/scripts/deploy-staging.sh

# 本番（Keisuke承認後のみ）
bash /home/openclaw/.openclaw/workspace/scripts/deploy-production.sh
```
手動 `pm2 restart` は禁止。必ずスクリプト経由。

## ブランチ戦略
| ブランチ | 用途 | デプロイ先 | DB |
|----------|------|-----------|-----|
| `main` | 開発・ステージング | demo.aniva-project.com (port 3061) | aniva_staging |
| `production` | 本番 | aniva-project.com (port 3050) | aniva |

## DB
- 本番DB(aniva)が空なのは**正常・仕様**。「消失」「異常」と絶対に報告しない
- 本番DBへの直接反映禁止（永久ルール）
- データ投入はステージングのみ

## PM2
- `aniva` (本番, port 3050, cluster x2)
- `aniva-staging` (ステージング, port 3061)
- ecosystem.config.cjs / ecosystem.staging.config.cjs から起動

## 指示管理
- バックログ: `tasks/aniva-backlog.md`（正規。他のbacklogは統合予定）
- 設計書: `tasks/designs/aniva/`
- spec: `tasks/specs/aniva/{task}.md`

## デザイン原則
- ダークテーマベース
- Apple/Instagram級のクリーンさ
- 絵文字は最小限

## ビジネスルール
- 最重要: キャラが実在していること
- 口調はキャラ設定通り固定（関係性レベルで変えない。温度感のみ変化）
- FC会員特典: チャット無制限 + 音声（モデル差ではなく量の差）
- 通常チャット: Gemini 2.5 Flash、深い会話: Gemini 2.5 Pro

## 技術的注意
- resolveCharacterId: [characterId]ルートには必須（slug/UUID両対応）
- ビルドは3-4分。mainセッションが直接実行（subagentにビルドさせない）
- Prisma新カラム追加: selectでP2022の場合Raw SQL回避
- 大規模一括変更後は直近5コミットの変更ファイルと整合性確認

## 重要cron
- character-comments: 3時間おき
- autonomous-post: 3時間おき
- stories-post: 2時間おき
- community-posts: 6時間おき
- deep-reply: 毎分（ステージング）
- email-digest: AM9:00 JST
- DBバックアップ: AM3:00
