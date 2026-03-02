#!/bin/bash
# Deploy to staging (demo.aniva-project.com)
set -e

cd /home/openclaw/.openclaw/workspace/projects/aniva

echo "🔄 Pulling latest main branch..."
git checkout main
git pull origin main

echo "📦 Installing dependencies..."
cd web
pnpm install --frozen-lockfile

echo "🔨 Running prisma generate..."
npx prisma generate

echo "🗄️ Pushing schema to staging DB..."
DATABASE_URL="postgresql://repeai:repeai_prod_2026@localhost:5432/aniva_staging" npx prisma db push

echo "🏗️ Building..."
pnpm build

echo "🔄 Restarting staging..."
pm2 restart aniva-staging

echo "⏳ Waiting for startup..."
sleep 3

echo "🔍 Health check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3061/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Staging deployed successfully! https://demo.aniva-project.com"
else
  echo "⚠️ Health check returned $HTTP_CODE - check logs: pm2 logs aniva-staging"
fi
