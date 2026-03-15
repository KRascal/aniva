#!/bin/bash
# Deploy to staging (demo.aniva-project.com)
# Fix: build in aniva-staging/ (where PM2 serves from), not aniva/
set -e

ANIVA_DIR="/home/openclaw/.openclaw/workspace/projects/aniva"
STAGING_DIR="/home/openclaw/.openclaw/workspace/projects/aniva-staging"

echo "🔄 Pulling latest main branch (aniva)..."
cd "$ANIVA_DIR"
git checkout main
git pull origin main

echo "📂 Syncing source files to aniva-staging/..."
# Exclude: .next (build artifacts), node_modules (reinstall), .env* (staging has its own)
rsync -a --delete \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.env.local' \
  --exclude='.env.staging' \
  --exclude='.env.staging.local' \
  --exclude='.env.production' \
  --exclude='.env.production.local' \
  --exclude='ecosystem.staging.config.cjs' \
  "$ANIVA_DIR/web/" "$STAGING_DIR/web/"

echo "📦 Installing dependencies in staging..."
cd "$STAGING_DIR/web"
pnpm install --no-frozen-lockfile

echo "🔨 Running prisma generate..."
npx prisma generate

echo "🗄️ Pushing schema to staging DB..."
DATABASE_URL="postgresql://repeai:repeai_prod_2026@localhost:5432/aniva_staging" npx prisma db push

echo "🏗️ Building in staging..."
pnpm build

echo "🔄 Restarting staging..."
pm2 delete aniva-staging 2>/dev/null || true
pm2 delete aniva-embeddings 2>/dev/null || true
cd "$STAGING_DIR/web"
if [ -f ecosystem.staging.config.cjs ]; then
  pm2 start ecosystem.staging.config.cjs
else
  echo "⚠️ ecosystem.staging.config.cjs not found, using npm start"
  pm2 start npm --name aniva-staging -- start -- -p 3061
fi
pm2 save

echo "⏳ Waiting for startup..."
sleep 5

echo "🔍 Health check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3061/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Health check OK"
else
  echo "⚠️ Health check returned $HTTP_CODE - check logs: pm2 logs aniva-staging"
  exit 1
fi

echo ""
echo "🔍 全ページ巡回チェック..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FULL_CHECK="$SCRIPT_DIR/../web/scripts/post-deploy-full-check.sh"
if [ -f "$FULL_CHECK" ]; then
  bash "$FULL_CHECK" http://localhost:3061
  if [ $? -ne 0 ]; then
    echo "❌ 全ページ巡回チェック FAIL — デプロイを確認してください"
    exit 1
  fi
else
  echo "⚠️ post-deploy-full-check.sh not found, skipping full check"
fi

echo ""
echo "✅ Staging deployed & verified! https://demo.aniva-project.com"
