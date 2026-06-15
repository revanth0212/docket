#!/bin/bash
# scripts/verify-hello-world.sh
# Verify the Docket hello-world flow: ingest text -> query.
# Note: Photo OCR is deferred; this uses a text fixture to exercise the
# ingestion, embedding, and query pipeline end-to-end.

set -e

BASE_URL="${DOCKET_URL:-http://localhost:3000}"
FIXTURE="tests/fixtures/bicycle.txt"

echo "🧠 Docket Hello World Verification"

# 1. Health check
curl -sf "${BASE_URL}/health" > /dev/null || (echo "❌ Health check failed"; exit 1)
echo "✅ Health check passed"

# 2. Ingest text
echo "📝 Ingesting bicycle text fixture..."
INGEST_RESPONSE=$(curl -s -X POST "${BASE_URL}/ingest" \
  -F "file=@${FIXTURE}" \
  -F "async=false")

MEMORY_ID=$(echo "$INGEST_RESPONSE" | node -e "const data=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(data); console.log(j.id || '');")
if [ -z "$MEMORY_ID" ]; then
  echo "❌ Ingestion failed: $INGEST_RESPONSE"
  exit 1
fi
echo "✅ Ingestion passed: $MEMORY_ID"

# 3. Query
echo "🔍 Querying for bicycles..."
QUERY_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "What photos did I take with bicycles?"}')

if echo "$QUERY_RESPONSE" | node -e "const data=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(data); process.exit(j.answer.toLowerCase().includes('bicycle') ? 0 : 1);"; then
  echo "✅ Query passed"
else
  echo "❌ Query failed: $QUERY_RESPONSE"
  exit 1
fi

echo "🎉 Hello World complete!"
