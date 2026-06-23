# Demo Scenarios

Pre-built scenarios that load real pipelines, indices, and sample documents into your OpenSearch cluster so you can immediately explore the Pipeline Visualizer plugin.

## Option A — In-Plugin (Recommended)

Open the plugin at **http://localhost:5601**, click **"Load Demo Data"** on the Start Here page, and choose a scenario. Everything is created with one click.

After loading, the plugin automatically:
- Shows what was created
- Links to the Ecosystem Map to see the pipeline–index connections
- Opens the correct pipeline with the Simulate tab pre-populated with a matching sample document

---

## Option B — Terminal (curl)

If you prefer the command line, run the scenario scripts directly against your OpenSearch cluster.

**Prerequisites:** `curl`, `python3` (for JSON formatting)

### Quick start

```bash
# Clone the repo if you haven't already
git clone https://github.com/TheBrianGraf/opensearch-pipeline-visualization-plugin.git
cd opensearch-pipeline-visualization-plugin/demo

# Make scripts executable
chmod +x *.sh

# Default: hits https://localhost:9200 with admin / 0p3nPipes!Viz#7
./web-logs-scenario.sh

# Custom host or credentials
OS_USER=admin OS_PASS=MyPassword ./web-logs-scenario.sh https://my-opensearch:9200
```

---

## Scenarios

### 1. Web Server Logs (`web-logs-scenario.sh`)

**What it creates:**
- Ingest pipeline `demo-logs-parse` — Grok extracts Apache log fields, converts types, adds `event.outcome` and `event.severity` conditionally, chains to `demo-logs-final`
- Ingest pipeline `demo-logs-final` — adds ingest metadata (chained from `demo-logs-parse`)
- Index `demo-web-logs` with `default_pipeline: demo-logs-parse`
- 15 raw Apache access log documents indexed **through** the pipeline

**What it demonstrates in the plugin:**
- Pipeline chaining (edge from `demo-logs-parse` → `demo-logs-final`)
- Conditional processors (diamond nodes for `event.outcome` and `event.severity` `if` conditions)
- `on_failure` handler (red dashed edge)
- Index → pipeline association in Ecosystem Map

**Simulate tab pre-populated with:**
```json
{
  "message": "151.36.95.42 - frank [10/Oct/2024:13:55:36 -0700] \"GET /api/users HTTP/1.1\" 200 1523"
}
```

**Expected output after simulation:**
```json
{
  "client_ip": "151.36.95.42",
  "method": "GET",
  "path": "/api/users",
  "http_version": "1.0",
  "status": 200,
  "bytes": 1523,
  "@timestamp": "2024-10-10T20:55:36.000Z",
  "event": { "outcome": "success" },
  "ingest": { "pipeline": "demo-logs-parse", "version": "1.0" },
  "data_stream": { "type": "logs" }
}
```

---

### 2. E-Commerce Products (`ecommerce-scenario.sh`)

**What it creates:**
- Ingest pipeline `demo-products-normalize` — trims whitespace, lowercases `category`, derives `price_range` (budget / mid-range / premium) and `in_stock` flag conditionally, adds `indexed_at` timestamp
- Search pipeline `demo-products-search` — placeholder for hybrid search extension
- Index `demo-products` with both `default_pipeline` and `search.pipeline` attached
- 15 product documents with intentional extra whitespace and uppercase categories

**What it demonstrates in the plugin:**
- Multiple conditional `set` processors showing diamond nodes
- Both ingest AND search pipeline attached to one index (Ecosystem Map shows two edges from the same index node)
- `on_failure` handler

**Simulate tab pre-populated with:**
```json
{
  "name": "  Wireless Noise-Cancelling Headphones  ",
  "category": "ELECTRONICS",
  "price": 89.99,
  "quantity": 42,
  "sku": "AT-WH-001"
}
```

**Expected output after simulation:**
```json
{
  "name": "Wireless Noise-Cancelling Headphones",
  "category": "electronics",
  "price": 89.99,
  "quantity": 42,
  "sku": "AT-WH-001",
  "in_stock": true,
  "price_range": "mid-range",
  "indexed_at": "2024-..."
}
```

---

### 3. ML / Semantic Search Ready (in-plugin only)

Available only through the in-plugin Demo page. Creates:
- Ingest pipeline `demo-ml-embeddings` with a `text_embedding` processor (requires a deployed ML model)
- Search pipeline `demo-neural-search`
- Index `demo-semantic-docs` with `knn_vector` mapping for 768-dimension embeddings

**The indexing step intentionally fails** (no model is deployed). This demonstrates the **Prerequisites tab** — it shows a red "No ML models deployed" error with instructions for deploying a model.

Simulate tab is pre-populated with a document containing `title` and `body` fields matching the `field_map` in the `text_embedding` processor.

---

## Verifying the Pipeline Ran

After loading any scenario, verify in OpenSearch Dev Tools:

```
# Web Logs — confirm parsing worked
GET /demo-web-logs/_search
{
  "size": 3,
  "_source": ["client_ip", "method", "status", "event.outcome", "ingest.pipeline"]
}

# E-Commerce — confirm normalization worked
GET /demo-products/_search
{
  "size": 3,
  "_source": ["name", "category", "price_range", "in_stock", "indexed_at"]
}
```

You should see the raw log `message` field is gone and replaced with parsed fields. Product names should be trimmed, categories lowercase, and `price_range` / `in_stock` populated.

---

## Tear Down

**In-plugin:** each scenario card has a "Tear Down" button that removes all created resources.

**Terminal:**
```bash
# Web Logs
curl -sk -u admin:0p3nPipes!Viz#7 -X DELETE https://localhost:9200/_ingest/pipeline/demo-logs-parse
curl -sk -u admin:0p3nPipes!Viz#7 -X DELETE https://localhost:9200/_ingest/pipeline/demo-logs-final
curl -sk -u admin:0p3nPipes!Viz#7 -X DELETE https://localhost:9200/demo-web-logs

# E-Commerce
curl -sk -u admin:0p3nPipes!Viz#7 -X DELETE https://localhost:9200/_ingest/pipeline/demo-products-normalize
curl -sk -u admin:0p3nPipes!Viz#7 -X DELETE https://localhost:9200/_search/pipeline/demo-products-search
curl -sk -u admin:0p3nPipes!Viz#7 -X DELETE https://localhost:9200/demo-products
```
