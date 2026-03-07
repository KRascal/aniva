# ANIVA 運用手順書

## 環境一覧

| 環境 | URL | Port | DB | PM2プロセス |
|------|-----|------|----|----|
| 本番 | aniva-project.com | 3050 | aniva | aniva |
| ステージング | demo.aniva-project.com | 3061 | aniva_staging | aniva-staging |

## デプロイ手順

### ステージングデプロイ
```bash
cd /home/openclaw/.openclaw/workspace/projects/aniva
bash scripts/deploy-staging.sh
```

### 本番デプロイ（Keisuke承認必須）
```bash
# 1. main → production マージ
git checkout production
git merge main
git push origin production

# 2. デプロイ実行
bash scripts/deploy-production.sh

# 3. ヘルスチェック
bash scripts/post-deploy-verify.sh aniva https://aniva-project.com
```

## ロールバック手順

### 即時ロールバック（前のビルドに戻す）
```bash
# 1. 前のコミットを特定
git log --oneline -5

# 2. リバート
git revert HEAD
git push origin main  # or production

# 3. 再ビルド＆デプロイ
cd web && pnpm build && cd ..
pm2 restart aniva-staging  # or aniva
```

### DBロールバック（バックアップから復元）
```bash
# バックアップ一覧
ls -la /home/openclaw/.openclaw/workspace/backups/aniva/

# 復元（本番DB → 要Keisuke承認）
PGPASSWORD=repeai_prod_2026 psql -h localhost -U repeai -d aniva < /path/to/backup.sql
```

## 障害対応

### 1. サービスダウン
```bash
# PM2ステータス確認
pm2 status

# プロセス再起動
pm2 restart aniva-staging  # ステージング
pm2 restart aniva          # 本番

# ログ確認
pm2 logs aniva --lines 50
pm2 logs aniva-staging --lines 50
```

### 2. DB接続エラー
```bash
# PostgreSQL確認
systemctl status postgresql
sudo systemctl restart postgresql

# 接続テスト
PGPASSWORD=repeai_prod_2026 psql -h localhost -U repeai -d aniva_staging -c "SELECT 1;"
```

### 3. Redis接続エラー
```bash
systemctl status redis
sudo systemctl restart redis
redis-cli ping
```
※ Redisダウン時もレート制限はスキップされ、サービスは継続する（graceful degradation）

### 4. Nginx問題
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 5. ディスク容量不足
```bash
df -h /
# ログローテーション手動実行
pm2 flush
# 古いバックアップ削除（30日以上）
find /home/openclaw/.openclaw/workspace/backups/ -mtime +30 -delete
```

## 定期タスク（cron）

### 自動実行中
- **DB バックアップ**: 毎日 3:00 AM JST（30日ローテーション）
- **自律投稿**: 3時間ごと
- **キャラデイリーステート更新**: 毎日
- **プッシュ通知**: 朝/昼/夜
- **ミッションリマインダー**: 定期
- **コイン有効期限チェック**: 毎日

### cron管理
```bash
# cron一覧確認
curl http://localhost:3061/api/cron/status  # staging
curl http://localhost:3050/api/cron/status  # production
```

## Stripe管理

### テストカード
- カード番号: `4242 4242 4242 4242`
- 有効期限: 任意の未来日
- CVC: 任意の3桁

### Webhook確認
```bash
bash scripts/test-stripe-e2e.sh staging
```

### Stripe Dashboard
- テスト: https://dashboard.stripe.com/test
- 本番: https://dashboard.stripe.com

## 負荷テスト
```bash
bash scripts/load-test.sh staging
```

## 監査ログ
```bash
# 直近のログ確認
tail -50 /home/openclaw/.openclaw/workspace/logs/aniva-audit.jsonl

# 特定イベント検索
grep "WEBHOOK" /home/openclaw/.openclaw/workspace/logs/aniva-audit.jsonl | tail -10
```

## 環境変数（必須）

| 変数 | 用途 | 設定場所 |
|------|------|----------|
| DATABASE_URL | PostgreSQL接続 | .env / .env.staging |
| NEXTAUTH_SECRET | 認証シークレット | .env / .env.staging |
| STRIPE_SECRET_KEY | Stripe API | .env / .env.staging |
| STRIPE_WEBHOOK_SECRET | Webhook検証 | .env / .env.staging |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe公開キー | .env / .env.staging |
| CRON_SECRET | cron認証 | .env / .env.staging |
| ADMIN_EMAILS | 管理者メール | .env / .env.staging |
| EMBEDDING_SERVER_URL | ベクトル埋め込み | .env / .env.staging |

### オプション
| 変数 | 用途 |
|------|------|
| NEXT_PUBLIC_POSTHOG_KEY | PostHog計測 |
| SENTRY_DSN | Sentryエラー監視 |
| VOYAGE_API_KEY | Voyage埋め込みAPI |
| ELEVENLABS_API_KEY | 音声生成 |

## Basic Auth（ステージング）
- ユーザー名: `aniva`
- パスワード: `aniva2026demo`
- 設定ファイル: `/etc/nginx/.htpasswd_demo`
- **絶対に削除しないこと**（Keisuke明示指示）
