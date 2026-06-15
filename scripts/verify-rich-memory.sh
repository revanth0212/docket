#!/bin/bash
# scripts/verify-rich-memory.sh
# Verify rich memory semantics: sector classification, temporal query, RBAC.

set -e

BASE_URL="${DOCKET_URL:-http://localhost:3000}"

echo "🧠 Docket Rich Memory Verification"

# 1. Health check
curl -sf "${BASE_URL}/health" > /dev/null || (echo "❌ Health check failed"; exit 1)
echo "✅ Health check passed"

# 2. Ingest with sector hint
echo "📝 Ingesting episodic memory as Alice..."
INGEST_RESPONSE=$(curl -s -X POST "${BASE_URL}/ingest" \
  -H "X-Principal: user:alice" \
  -F "file=@tests/fixtures/bicycle.txt" \
  -F "async=false" \
  -F "sectorHint=episodic")

SECTOR=$(echo "$INGEST_RESPONSE" | node -e "const data=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(data); console.log(j.sector || '');")
if [ "$SECTOR" = "episodic" ]; then
  echo "✅ Sector classification passed"
else
  echo "❌ Sector classification failed: $INGEST_RESPONSE"
  exit 1
fi

# 3. Temporal query
echo "🔍 Querying within validity window..."
QUERY_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "X-Principal: user:alice" \
  -d '{"question": "What did I photograph?", "temporal": {"atDate": "2026-06-01T00:00:00Z"}}')

SOURCE_COUNT=$(echo "$QUERY_RESPONSE" | node -e "const data=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(data); console.log(j.sources.length);")
if [ "$SOURCE_COUNT" -gt 0 ]; then
  echo "✅ Temporal query passed"
else
  echo "❌ Temporal query failed: $QUERY_RESPONSE"
  exit 1
fi

# 4. RBAC denial
echo "🔒 Checking RBAC denial for Bob..."
DENY_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "X-Principal: user:bob" \
  -d '{"question": "What did Alice photograph?"}')

DENY_COUNT=$(echo "$DENY_RESPONSE" | node -e "const data=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(data); console.log(j.sources.length);")
if [ "$DENY_COUNT" -eq 0 ]; then
  echo "✅ RBAC denial passed"
else
  echo "❌ RBAC denial failed: $DENY_RESPONSE"
  exit 1
fi

echo "🎉 Rich Memory complete!"
