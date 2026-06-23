#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Web Logs Demo Scenario
# Creates demo-logs-parse + demo-logs-final ingest pipelines,
# attaches them to a demo-web-logs index, and bulk-indexes 15 sample log lines.
#
# Usage:
#   ./web-logs-scenario.sh                        # localhost, default creds
#   ./web-logs-scenario.sh https://my-host:9200   # custom host
#
# Credentials:  set OS_USER / OS_PASS env vars or edit defaults below.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HOST="${1:-https://localhost:9200}"
USER="${OS_USER:-admin}"
PASS="${OS_PASS:-0p3nPipes!Viz#7}"
CURL="curl -sk -u ${USER}:${PASS}"

echo ""
echo "=== Web Logs Demo Scenario ==="
echo "Target: $HOST"
echo ""

# ── 1. Create finalization pipeline (created first so chain resolves) ─────────
echo "Creating demo-logs-final pipeline..."
$CURL -X PUT "$HOST/_ingest/pipeline/demo-logs-final" \
  -H 'Content-Type: application/json' -d '{
  "description": "Finalization step chained from demo-logs-parse: adds ingest metadata",
  "processors": [
    { "set": { "field": "ingest.pipeline", "value": "demo-logs-parse" } },
    { "set": { "field": "ingest.version",  "value": "1.0" } },
    { "set": { "field": "data_stream.type","value": "logs" } }
  ]
}' | python3 -m json.tool --no-ensure-ascii 2>/dev/null || true
echo ""

# ── 2. Create main parse pipeline ────────────────────────────────────────────
echo "Creating demo-logs-parse pipeline..."
$CURL -X PUT "$HOST/_ingest/pipeline/demo-logs-parse" \
  -H 'Content-Type: application/json' -d '{
  "description": "Parse Apache access logs: Grok → convert → conditional severity → chain",
  "processors": [
    {
      "grok": {
        "field": "message",
        "patterns": ["%{IPORHOST:client_ip} %{USER:ident} %{USER:auth} \\[%{HTTPDATE:request_ts}\\] \"%{WORD:method} %{NOTSPACE:path} HTTP/%{NUMBER:http_version}\" %{NUMBER:status} (?:%{NUMBER:bytes}|-)"],
        "ignore_failure": true
      }
    },
    {
      "date": {
        "field": "request_ts",
        "formats": ["dd/MMM/yyyy:HH:mm:ss Z"],
        "target_field": "@timestamp",
        "ignore_missing": true,
        "ignore_failure": true
      }
    },
    { "convert": { "field": "status", "type": "integer", "ignore_missing": true } },
    { "convert": { "field": "bytes",  "type": "long",    "ignore_missing": true } },
    {
      "set": {
        "field": "event.outcome", "value": "success",
        "if": "ctx.status != null && ctx.status < 400"
      }
    },
    {
      "set": {
        "field": "event.outcome", "value": "failure",
        "if": "ctx.status != null && ctx.status >= 400"
      }
    },
    {
      "set": {
        "field": "event.severity", "value": "critical",
        "if": "ctx.status != null && ctx.status >= 500"
      }
    },
    { "remove": { "field": ["request_ts","ident","auth"], "ignore_missing": true } },
    { "pipeline": { "name": "demo-logs-final" } }
  ],
  "on_failure": [
    { "set": { "field": "_ingest_error", "value": "{{_ingest.on_failure_message}}" } }
  ]
}' | python3 -m json.tool --no-ensure-ascii 2>/dev/null || true
echo ""

# ── 3. Create index ───────────────────────────────────────────────────────────
echo "Creating demo-web-logs index..."
$CURL -X DELETE "$HOST/demo-web-logs" > /dev/null 2>&1 || true
$CURL -X PUT "$HOST/demo-web-logs" \
  -H 'Content-Type: application/json' -d '{
  "settings": { "index.default_pipeline": "demo-logs-parse" },
  "mappings": {
    "properties": {
      "message":         { "type": "text" },
      "client_ip":       { "type": "ip" },
      "method":          { "type": "keyword" },
      "path":            { "type": "keyword" },
      "status":          { "type": "integer" },
      "bytes":           { "type": "long" },
      "@timestamp":      { "type": "date" },
      "event.outcome":   { "type": "keyword" },
      "event.severity":  { "type": "keyword" },
      "ingest.pipeline": { "type": "keyword" }
    }
  }
}' | python3 -m json.tool --no-ensure-ascii 2>/dev/null || true
echo ""

# ── 4. Bulk index sample logs (run through the pipeline) ──────────────────────
echo "Indexing 15 sample Apache log lines through demo-logs-parse..."
$CURL -X POST "$HOST/_bulk" -H 'Content-Type: application/x-ndjson' -d \
'{"index":{"_index":"demo-web-logs"}}
{"message":"151.36.95.42 - frank [10/Oct/2024:13:55:36 -0700] \"GET /home HTTP/1.1\" 200 4521"}
{"index":{"_index":"demo-web-logs"}}
{"message":"89.201.128.5 - - [10/Oct/2024:13:56:01 -0700] \"POST /api/login HTTP/1.1\" 401 312"}
{"index":{"_index":"demo-web-logs"}}
{"message":"203.15.64.128 - - [10/Oct/2024:13:56:15 -0700] \"GET /static/app.js HTTP/1.1\" 200 89432"}
{"index":{"_index":"demo-web-logs"}}
{"message":"151.36.95.42 - frank [10/Oct/2024:13:56:30 -0700] \"GET /api/users HTTP/1.1\" 200 1523"}
{"index":{"_index":"demo-web-logs"}}
{"message":"10.0.0.5 - admin [10/Oct/2024:13:57:00 -0700] \"DELETE /api/users/42 HTTP/1.1\" 403 256"}
{"index":{"_index":"demo-web-logs"}}
{"message":"89.201.128.5 - - [10/Oct/2024:13:57:15 -0700] \"GET /api/orders HTTP/1.1\" 500 89"}
{"index":{"_index":"demo-web-logs"}}
{"message":"45.33.22.11 - - [10/Oct/2024:13:57:30 -0700] \"GET /favicon.ico HTTP/1.1\" 304 0"}
{"index":{"_index":"demo-web-logs"}}
{"message":"203.15.64.128 - - [10/Oct/2024:13:57:45 -0700] \"POST /api/checkout HTTP/1.1\" 200 2341"}
{"index":{"_index":"demo-web-logs"}}
{"message":"151.36.95.42 - frank [10/Oct/2024:13:58:00 -0700] \"GET /api/products HTTP/1.1\" 200 18432"}
{"index":{"_index":"demo-web-logs"}}
{"message":"89.201.128.5 - - [10/Oct/2024:13:58:15 -0700] \"GET /api/search?q=laptop HTTP/1.1\" 200 4521"}
{"index":{"_index":"demo-web-logs"}}
{"message":"66.249.66.1 - - [10/Oct/2024:13:58:30 -0700] \"GET /robots.txt HTTP/1.0\" 200 68"}
{"index":{"_index":"demo-web-logs"}}
{"message":"151.36.95.42 - frank [10/Oct/2024:13:59:00 -0700] \"PUT /api/profile HTTP/1.1\" 200 987"}
{"index":{"_index":"demo-web-logs"}}
{"message":"203.15.64.128 - - [10/Oct/2024:13:59:15 -0700] \"GET /api/dashboard HTTP/1.1\" 500 120"}
{"index":{"_index":"demo-web-logs"}}
{"message":"10.0.0.5 - admin [10/Oct/2024:13:59:30 -0700] \"POST /api/admin/users HTTP/1.1\" 201 445"}
{"index":{"_index":"demo-web-logs"}}
{"message":"89.201.128.5 - - [10/Oct/2024:14:00:00 -0700] \"GET /api/stats HTTP/1.1\" 200 3201"}
' | python3 -m json.tool --no-ensure-ascii 2>/dev/null || true
echo ""

# ── 5. Verify ─────────────────────────────────────────────────────────────────
echo "Verifying — showing 1 indexed document:"
sleep 1
$CURL "$HOST/demo-web-logs/_search?size=1&pretty"
echo ""
echo "=== Done! ==="
echo ""
echo "Next steps:"
echo "  • Open Pipeline Visualizer → Ecosystem Map to see the pipeline-index connection"
echo "  • Open demo-logs-parse → Simulate tab to test with your own log lines"
echo "  • Simulate with:  {\"message\": \"1.2.3.4 - - [10/Oct/2024:13:55:36 -0700] \\\"GET /test HTTP/1.1\\\" 200 512\"}"
echo ""
echo "To tear down:"
echo "  curl -sk -u $USER:$PASS -X DELETE $HOST/_ingest/pipeline/demo-logs-parse"
echo "  curl -sk -u $USER:$PASS -X DELETE $HOST/_ingest/pipeline/demo-logs-final"
echo "  curl -sk -u $USER:$PASS -X DELETE $HOST/demo-web-logs"
