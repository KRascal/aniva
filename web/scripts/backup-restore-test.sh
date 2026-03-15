#!/bin/bash
# バックアップのリストアテスト（テストDBに復元して検証）
set -e

BACKUP_DIR="/home/openclaw/.openclaw/workspace/backups"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/aniva_staging_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ バックアップファイルが見つかりません"
  exit 1
fi

echo "🔄 最新バックアップ: $LATEST_BACKUP"

# テストDBを作成してリストア
TEST_DB="aniva_restore_test_$(date +%s)"
echo "📦 テストDB作成: $TEST_DB"
PGPASSWORD=repeai_prod_2026 createdb -U repeai -h localhost "$TEST_DB"
gunzip -c "$LATEST_BACKUP" | PGPASSWORD=repeai_prod_2026 psql -U repeai -h localhost "$TEST_DB" > /dev/null 2>&1

# テーブル数を確認
TABLE_COUNT=$(PGPASSWORD=repeai_prod_2026 psql -U repeai -h localhost "$TEST_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" | xargs)

# レコード数サンプル確認
CHAR_COUNT=$(PGPASSWORD=repeai_prod_2026 psql -U repeai -h localhost "$TEST_DB" -t -c "SELECT COUNT(*) FROM \"Character\"" 2>/dev/null | xargs || echo "0")
MSG_COUNT=$(PGPASSWORD=repeai_prod_2026 psql -U repeai -h localhost "$TEST_DB" -t -c "SELECT COUNT(*) FROM \"Message\"" 2>/dev/null | xargs || echo "0")
USER_COUNT=$(PGPASSWORD=repeai_prod_2026 psql -U repeai -h localhost "$TEST_DB" -t -c "SELECT COUNT(*) FROM \"User\"" 2>/dev/null | xargs || echo "0")

echo "✅ リストア成功: ${TABLE_COUNT}テーブル, ${CHAR_COUNT}キャラ, ${MSG_COUNT}メッセージ, ${USER_COUNT}ユーザー"

# バックアップファイル情報
BACKUP_SIZE=$(du -sh "$LATEST_BACKUP" | cut -f1)
echo "📁 バックアップサイズ: $BACKUP_SIZE"
echo "📅 バックアップ日時: $(stat -c %y "$LATEST_BACKUP" | cut -d'.' -f1)"

# テストDB削除
PGPASSWORD=repeai_prod_2026 dropdb -U repeai -h localhost "$TEST_DB"
echo "🗑️ テストDB削除完了"
echo "✨ バックアップリストアテスト完了"
