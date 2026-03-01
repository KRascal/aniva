#!/bin/bash
# ANIVA smart-dm cron setup
# Run 3 times daily: 08:00, 14:00, 01:00 JST
#
# Add to crontab (crontab -e):
#   0 8  * * * /path/to/aniva-cron-smart-dm.sh >> /var/log/aniva-smart-dm.log 2>&1
#   0 14 * * * /path/to/aniva-cron-smart-dm.sh >> /var/log/aniva-smart-dm.log 2>&1
#   0 1  * * * /path/to/aniva-cron-smart-dm.sh >> /var/log/aniva-smart-dm.log 2>&1

BASE_URL="${ANIVA_BASE_URL:-http://localhost:3050}"

if [ -z "$CRON_SECRET" ]; then
  echo "[$(date)] ERROR: CRON_SECRET not set"
  exit 1
fi

echo "[$(date)] Triggering smart-dm..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/api/cron/smart-dm")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

echo "[$(date)] HTTP $HTTP_CODE: $BODY"

if [ "$HTTP_CODE" != "200" ]; then
  exit 1
fi
