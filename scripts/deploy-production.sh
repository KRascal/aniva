#!/bin/bash
# Deploy to production (aniva-project.com)
# REQUIRES: Keisuke's approval before running
# Only deploys from production branch
set -e

cd /home/openclaw/.openclaw/workspace/projects/aniva

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "production" ]; then
  echo "⚠️ Not on production branch (current: $CURRENT_BRANCH)"
  echo "  Run: git checkout production && git merge main"
  exit 1
fi

echo "🔄 Pulling latest production branch..."
git pull origin production

echo "📦 Installing dependencies..."
cd web
pnpm install --frozen-lockfile

echo "🔨 Running prisma generate..."
npx prisma generate

echo "🗄️ Pushing schema to production DB..."
npx prisma db push

echo "🏗️ Building..."
pnpm build

echo "🔄 Restarting production..."
pm2 restart aniva

echo "⏳ Waiting for startup..."
sleep 3

echo "🔍 Health check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3050/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Production deployed successfully! https://aniva-project.com"
else
  echo "⚠️ Health check returned $HTTP_CODE - check logs: pm2 logs aniva"
fi
