#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# E-Commerce Products Demo Scenario
# Creates demo-products-normalize (ingest) + demo-products-search (search)
# pipelines, attaches them to demo-products index, bulk-indexes 15 products.
#
# Usage:  ./ecommerce-scenario.sh [host]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HOST="${1:-https://localhost:9200}"
USER="${OS_USER:-admin}"
PASS="${OS_PASS:-0p3nPipes!Viz#7}"
CURL="curl -sk -u ${USER}:${PASS}"

echo ""
echo "=== E-Commerce Products Demo Scenario ==="
echo "Target: $HOST"
echo ""

echo "Creating demo-products-normalize ingest pipeline..."
$CURL -X PUT "$HOST/_ingest/pipeline/demo-products-normalize" \
  -H 'Content-Type: application/json' -d '{
  "description": "Normalize product catalog: trim, lowercase category, derive price_range and in_stock",
  "processors": [
    { "trim": { "field": "name",        "ignore_missing": true } },
    { "trim": { "field": "description", "ignore_missing": true } },
    { "lowercase": { "field": "category", "ignore_missing": true } },
    { "set": { "field": "in_stock", "value": true,  "if": "ctx.quantity != null && ctx.quantity > 0" } },
    { "set": { "field": "in_stock", "value": false, "if": "ctx.quantity != null && ctx.quantity <= 0" } },
    { "set": { "field": "price_range", "value": "budget",    "if": "ctx.price != null && ctx.price < 25" } },
    { "set": { "field": "price_range", "value": "mid-range", "if": "ctx.price != null && ctx.price >= 25 && ctx.price < 100" } },
    { "set": { "field": "price_range", "value": "premium",   "if": "ctx.price != null && ctx.price >= 100" } },
    { "set": { "field": "indexed_at",  "value": "{{{_ingest.timestamp}}}" } }
  ],
  "on_failure": [
    { "set": { "field": "_ingest_error", "value": "{{_ingest.on_failure_message}}" } }
  ]
}' | python3 -m json.tool --no-ensure-ascii 2>/dev/null || true
echo ""

echo "Creating demo-products-search search pipeline..."
$CURL -X PUT "$HOST/_search/pipeline/demo-products-search" \
  -H 'Content-Type: application/json' -d '{
  "description": "Product search pipeline (extend with normalization-processor for hybrid search)",
  "request_processors": [],
  "response_processors": []
}' | python3 -m json.tool --no-ensure-ascii 2>/dev/null || true
echo ""

echo "Creating demo-products index..."
$CURL -X DELETE "$HOST/demo-products" > /dev/null 2>&1 || true
$CURL -X PUT "$HOST/demo-products" \
  -H 'Content-Type: application/json' -d '{
  "settings": {
    "index.default_pipeline": "demo-products-normalize",
    "index.search.pipeline": "demo-products-search"
  },
  "mappings": {
    "properties": {
      "name":        { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "description": { "type": "text" },
      "category":    { "type": "keyword" },
      "brand":       { "type": "keyword" },
      "price":       { "type": "float" },
      "quantity":    { "type": "integer" },
      "sku":         { "type": "keyword" },
      "in_stock":    { "type": "boolean" },
      "price_range": { "type": "keyword" },
      "indexed_at":  { "type": "date" }
    }
  }
}' | python3 -m json.tool --no-ensure-ascii 2>/dev/null || true
echo ""

echo "Indexing 15 products through demo-products-normalize..."
$CURL -X POST "$HOST/_bulk" -H 'Content-Type: application/x-ndjson' -d \
'{"index":{"_index":"demo-products"}}
{"name":"  Wireless Noise-Cancelling Headphones  ","category":"ELECTRONICS","brand":"AudioTech","price":89.99,"quantity":42,"sku":"AT-WH-001","description":"  Premium wireless headphones with 30-hour battery life  "}
{"index":{"_index":"demo-products"}}
{"name":"USB-C Charging Cable  ","category":"ACCESSORIES","brand":"CableMax","price":12.99,"quantity":200,"sku":"CM-USB-003","description":"6ft braided USB-C charging cable"}
{"index":{"_index":"demo-products"}}
{"name":"4K Monitor 27\"","category":"ELECTRONICS","brand":"ViewPro","price":349.00,"quantity":15,"sku":"VP-MON-27","description":"27-inch 4K IPS display with HDR support"}
{"index":{"_index":"demo-products"}}
{"name":"  Mechanical Keyboard","category":"PERIPHERALS","brand":"TypeMaster","price":129.99,"quantity":67,"sku":"TM-KB-RED","description":"Compact mechanical keyboard with red switches"}
{"index":{"_index":"demo-products"}}
{"name":"Laptop Stand  ","category":"ACCESSORIES","brand":"DeskPro","price":34.99,"quantity":0,"sku":"DP-LS-ALU","description":"Adjustable aluminium laptop stand"}
{"index":{"_index":"demo-products"}}
{"name":"Webcam HD 1080p","category":"PERIPHERALS","brand":"ClearView","price":59.99,"quantity":33,"sku":"CV-WC-1080","description":"Full HD webcam with built-in microphone"}
{"index":{"_index":"demo-products"}}
{"name":"  External SSD 1TB","category":"STORAGE","brand":"FastDrive","price":89.00,"quantity":28,"sku":"FD-SSD-1TB","description":"Portable SSD with 1050MB/s read speeds"}
{"index":{"_index":"demo-products"}}
{"name":"Ergonomic Mouse","category":"PERIPHERALS","brand":"ErgoTech","price":44.99,"quantity":91,"sku":"ET-MS-ERG","description":"Vertical ergonomic mouse reduces wrist strain"}
{"index":{"_index":"demo-products"}}
{"name":"HDMI Cable 2.1  ","category":"ACCESSORIES","brand":"CableMax","price":18.99,"quantity":150,"sku":"CM-HDMI-21","description":"8K HDMI 2.1 cable for gaming monitors"}
{"index":{"_index":"demo-products"}}
{"name":"Smart Desk Lamp","category":"OFFICE","brand":"LumiDesk","price":42.00,"quantity":0,"sku":"LD-LAMP-USB","description":"LED desk lamp with USB charging port"}
{"index":{"_index":"demo-products"}}
{"name":"  Blue Light Glasses","category":"ACCESSORIES","brand":"VisionSafe","price":19.99,"quantity":75,"sku":"VS-GLX-BLUE","description":"Anti-blue-light glasses for screen use"}
{"index":{"_index":"demo-products"}}
{"name":"Noise Machine","category":"OFFICE","brand":"SoundShield","price":29.99,"quantity":44,"sku":"SS-NM-PRO","description":"White noise machine with 20 natural sounds"}
{"index":{"_index":"demo-products"}}
{"name":"  Wireless Charger Pad  ","category":"ACCESSORIES","brand":"ChargeFast","price":24.99,"quantity":110,"sku":"CF-WC-15W","description":"15W Qi wireless charging pad"}
{"index":{"_index":"demo-products"}}
{"name":"Monitor Arm Single","category":"OFFICE","brand":"FlexMount","price":54.99,"quantity":37,"sku":"FM-MA-SGL","description":"Fully articulating monitor arm"}
{"index":{"_index":"demo-products"}}
{"name":"USB Hub 7-Port  ","category":"ACCESSORIES","brand":"ExpandIt","price":39.99,"quantity":82,"sku":"EI-HUB-7P","description":"Powered 7-port USB 3.0 hub"}
' | python3 -m json.tool --no-ensure-ascii 2>/dev/null || true
echo ""

echo "Verifying — showing 2 indexed documents:"
sleep 1
$CURL "$HOST/demo-products/_search?size=2&pretty"
echo ""
echo "=== Done! ==="
echo ""
echo "Simulate with: {\"name\": \"  My Product  \", \"category\": \"ELECTRONICS\", \"price\": 149.99, \"quantity\": 5}"
echo "Expected: name trimmed, category lowercased, price_range=premium, in_stock=true"
