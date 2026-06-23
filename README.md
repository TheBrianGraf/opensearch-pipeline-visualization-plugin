# OpenSearch Pipeline Visualization Plugin

An [OpenSearch Dashboards](https://opensearch.org/docs/latest/dashboards/) plugin that provides a fully visual, interactive interface for creating, managing, and understanding OpenSearch pipelines — ingest pipelines, search pipelines, and ML/neural pipelines — as well as their relationships to indices and ML models across your entire cluster.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Installation](#installation)
  - [Quick Start with Docker](#quick-start-with-docker)
  - [Manual Plugin Installation](#manual-plugin-installation)
  - [Building from Source](#building-from-source)
- [Usage](#usage)
  - [Start Here — Guided Onboarding](#start-here--guided-onboarding)
  - [Ecosystem Map](#ecosystem-map)
  - [Pipeline Detail View](#pipeline-detail-view)
  - [Pipeline Editor](#pipeline-editor)
  - [Prerequisites Panel](#prerequisites-panel)
- [API Reference](#api-reference)
- [Plugin Architecture](#plugin-architecture)
- [Compatibility](#compatibility)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

OpenSearch pipelines are powerful but can be difficult to reason about holistically. They span three separate API namespaces (`_ingest/pipeline`, `_search/pipeline`, `_plugins/_ml`), require manual cross-referencing with index settings, and have complex dependency chains (ingest pipelines calling other pipelines, ML processors depending on deployed models, indices attached to multiple pipeline stages).

This plugin brings all of that into a single, visual, interactive interface — making OpenSearch pipelines approachable for operators, developers, and teams new to the platform.

---

## Features

### Ecosystem Map
A full-canvas [React Flow](https://reactflow.dev/) visualization of your entire cluster's pipeline configuration at a glance:

- **Ingest pipelines** (blue) — show processor count and ML indicator
- **Search pipelines** (purple) — show processor count and ML indicator  
- **Indices** (teal) — show which pipelines are attached as `default_pipeline`, `final_pipeline`, and `search.pipeline`
- **ML models** (amber/gray) — show deployment state (`DEPLOYED`, `REGISTERED`, etc.)
- **Color-coded edges** with labels: `default`, `final`, `search` relationships between indices and pipelines
- Click any pipeline node to navigate directly to its detail page
- Auto-layout via [Dagre](https://github.com/dagrejs/dagre) (left-to-right data flow)
- MiniMap for large clusters
- Empty-state prompt with create buttons when nothing is configured

### Visual Pipeline Editor
Drag-and-drop canvas for building ingest and search pipelines:

- **Processor palette** — categorized by Common, Text, ML/Neural, and Enrichment; filterable by pipeline type
- **React Flow canvas** — drag processors from palette onto canvas, connect them with edges
- **Config panel** — click any processor node to configure its fields in a sidebar
  - **ML wizard** — when an ML processor (`ml_inference`, `text_embedding`, `sparse_encoding`, `neural_sparse`) is selected, shows dedicated fields for `model_id`, `field_map`, `input_map`/`output_map`, plus a step-by-step setup reminder
- Conditional execution (`if` field = Painless expression) renders as a diamond node in the graph
- `on_failure` branches render as red dashed animated edges
- Save directly to OpenSearch (PUT `/_ingest/pipeline/{id}` or `/_search/pipeline/{id}`)

### Pipeline Detail View
Three-tab view for every pipeline:

| Tab | What it shows |
|-----|---------------|
| **Visual Flow** | Read-only React Flow graph of the processor chain; `on_failure` branches in red, conditional processors as diamonds |
| **JSON** | Raw pipeline definition with copy button |
| **Associated Indices** | Which indices have this pipeline configured as `default_pipeline`, `final_pipeline`, or `search.pipeline` |
| **Prerequisites** | Health checklist — index attachment, ML model deployment status, chained pipeline availability — with actionable API snippets |

### Prerequisites Panel
Per-pipeline health check that answers "will this pipeline actually work?":

- ✅ / ⚠️ Index attachment — warns if no index has this pipeline configured; shows a copy-paste `PUT /_settings` snippet
- ✅ / ❌ ML model deployed — error if the pipeline uses ML processors but no models are deployed in ML Commons
- ❓ Pipeline chain — notes chained pipeline names for manual verification

### Start Here — Guided Onboarding
A guided home page helping new users understand which type of pipeline fits their use case:

- **Enrich docs on write** → ingest pipeline creator
- **Improve search results** → search pipeline creator  
- **Add AI/ML** → step-by-step ML setup with ready-to-paste `text_embedding` pipeline definition
- Data flow diagram showing the write path and search path
- Links to existing pipelines in your cluster

### Pipeline List
Tabbed list of all ingest, search, and ML/neural pipelines with View / Edit / Delete actions per pipeline.

---

## Architecture

```
opensearch-pipeline-visualization-plugin/
├── pipeline-visualizer/                  # OSD plugin root
│   ├── opensearch_dashboards.json        # Plugin manifest
│   ├── package.json                      # Dependencies (reactflow, dagre, @reduxjs/toolkit)
│   ├── tsconfig.json
│   │
│   ├── common/                           # Shared between server and public
│   │   ├── types.ts                      # All TypeScript interfaces
│   │   └── constants.ts                  # API paths, ML processor type list
│   │
│   ├── server/                           # Node.js server-side plugin
│   │   ├── plugin.ts                     # ServerPlugin — registers router
│   │   └── routes/
│   │       ├── ingest_routes.ts          # Proxy: GET/PUT/DELETE /_ingest/pipeline
│   │       ├── search_routes.ts          # Proxy: GET/PUT/DELETE /_search/pipeline
│   │       ├── index_assoc_routes.ts     # Proxy: GET /*/_settings (pipeline associations)
│   │       ├── ml_routes.ts              # Proxy: GET /_plugins/_ml/models/_search
│   │       └── index_routes.ts           # Proxy: GET /*/_settings (pipeline-bearing indices)
│   │
│   └── public/                           # Browser-side React app
│       ├── plugin.ts                     # PublicPlugin — registers app in OSD nav
│       ├── render_app.tsx                # Root render: Redux Provider + React Router
│       ├── app.tsx                       # React Router routes
│       ├── route_service.ts              # HTTP client methods to server routes
│       ├── services.ts                   # CoreStart singleton accessors
│       │
│       ├── store/
│       │   ├── store.ts                  # Redux store + typed hooks
│       │   └── reducers/
│       │       ├── ingest_pipeline_reducer.ts
│       │       ├── search_pipeline_reducer.ts
│       │       ├── index_assoc_reducer.ts
│       │       ├── ml_model_reducer.ts
│       │       └── index_settings_reducer.ts
│       │
│       ├── models/
│       │   └── pipeline_to_flow.ts       # Pipeline JSON ↔ React Flow nodes/edges
│       │
│       ├── components/
│       │   ├── nodes/                    # Custom React Flow node types
│       │   ├── edges/                    # Custom React Flow edge types
│       │   ├── shared/                   # PipelineHeader, LoadingErrorState
│       │   └── prerequisites_panel.tsx   # Health checklist component
│       │
│       └── pages/
│           ├── start_here/               # Guided home / onboarding
│           ├── ecosystem_map/            # Full-cluster canvas view
│           ├── pipeline_list/            # Tabbed list (Ingest / Search / ML)
│           ├── pipeline_detail/          # Visual Flow + JSON + Indices + Prerequisites tabs
│           └── pipeline_editor/          # Drag-and-drop canvas editor
│
├── Dockerfile.osd                        # Multi-stage build: compile plugin → OSD runtime
├── docker-compose.yml                    # Single-node OpenSearch + OSD with plugin
└── osd.docker.yml                        # OSD config (hosts, auth, TLS)
```

### Data flow

```
Browser                    OSD Server Plugin              OpenSearch
───────                    ─────────────────              ──────────
RouteService.listIngestPipelines()
  → GET /api/pipeline_visualizer/ingest
                           ingest_routes.ts
                             → GET /_ingest/pipeline
                                                          returns pipeline map
                           transforms to PipelineSummary[]
  ← PipelineSummary[]

RouteService.listMlModels()
  → GET /api/pipeline_visualizer/ml/models
                           ml_routes.ts
                             → GET /_plugins/_ml/models/_search
                                                          returns hits[]
                           transforms to MlModel[]
  ← MlModel[]
```

All OpenSearch calls are proxied through the OSD server plugin using `context.core.opensearch.client.asCurrentUser`, which inherits the browser session's authentication context.

### Pipeline JSON ↔ React Flow transformation

`pipeline_to_flow.ts` contains pure functions that convert an `OsIngestPipeline` or `OsSearchPipeline` into React Flow `Node[]` + `Edge[]`, and back.

**JSON → Flow:**
1. Create bookend nodes: `__input__` (pill) and `__output__` (pill)
2. For each processor in `processors[]`:
   - If it has an `if` field → insert a `conditionalDiamond` node + orange dotted `conditionalEdge` before the processor
   - Create a `processorNode` (or `onFailureNode` for `on_failure[]` entries)
3. Connect sequential processors with normal edges
4. Connect `on_failure` processors with red animated `failureEdge`
5. Auto-layout with Dagre `rankdir: 'LR'`

**Flow → JSON:**
1. Topological sort from `__input__` via BFS
2. Skip diamond nodes — attach their condition string to the downstream processor's `config.if`
3. Collect `on_failure` edges per processor → nest as `on_failure` array
4. For search pipelines: split by node's `swimLane` tag into `request_processors`, `response_processors`, `phase_results_processors`

---

## Installation

### Quick Start with Docker

The fastest way to run a local single-node OpenSearch cluster with the plugin pre-installed:

**Prerequisites:** Docker Desktop

```bash
git clone https://github.com/TheBrianGraf/opensearch-pipeline-visualization-plugin.git
cd opensearch-pipeline-visualization-plugin

# Build and start (first run takes ~20 min to compile the plugin inside OSD)
docker compose up -d

# Watch logs
docker compose logs -f osd
```

Once OSD reports `Server running at http://0.0.0.0:5601`, open **http://localhost:5601** and log in with:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `0p3nPipes!Viz#7` |

Navigate to the **Pipeline Visualizer** entry in the left sidebar.

> **Note:** The initial Docker build downloads the full OSD source (~500 MB) and runs `yarn osd bootstrap` which installs ~1 GB of dependencies. Subsequent rebuilds use Docker layer caching and take only a few seconds.

### Manual Plugin Installation

If you already have OpenSearch Dashboards 3.7.0 running:

1. Download the latest release ZIP from the [Releases](../../releases) page.
2. Install via the OSD plugin CLI:
   ```bash
   bin/opensearch-dashboards-plugin install file:///path/to/pipeline-visualizer-3.7.0.0.zip
   ```
3. Restart OpenSearch Dashboards.

### Building from Source

**Prerequisites:**
- Node.js 20+
- Yarn 1.22.x (`corepack enable && corepack prepare yarn@1.22.22 --activate`)
- OpenSearch Dashboards 3.7.0 source checked out at `<OSD_ROOT>`

```bash
# Place this repo's plugin-visualizer/ inside OSD's plugins directory
ln -s /path/to/this-repo/pipeline-visualizer <OSD_ROOT>/plugins/pipeline-visualizer

# Bootstrap from OSD root (installs all dependencies)
cd <OSD_ROOT>
yarn osd bootstrap

# Start OSD in dev mode (plugin auto-loaded)
yarn start --no-base-path

# OR: build a distributable ZIP
cd <OSD_ROOT>/plugins/pipeline-visualizer
node ../../scripts/plugin_helpers build
# → ./build/pipeline-visualizer-3.7.0.0.zip
```

---

## Usage

### Start Here — Guided Onboarding

The plugin opens to a guided home page. Choose your journey:

**Enrich docs on write** — Creates an ingest pipeline. Documents are processed by the pipeline before being stored. Common uses:
- Lowercasing text fields
- Parsing dates and extracting structured data with Grok
- Enriching with geo data (IP → city/country)
- Generating ML embeddings (`text_embedding` processor)

**Improve search results** — Creates a search pipeline. Queries are modified or results re-ranked before returning to the client. Common uses:
- Hybrid BM25 + neural search with `normalization-processor`
- Re-ranking with `rerank` processor
- Query term boosting

**Add AI/ML** — Step-by-step guide to register and deploy an ML model, then use it in an ingest or search pipeline. Includes a ready-to-paste `text_embedding` pipeline definition.

### Ecosystem Map

Navigate to **Ecosystem Map** from the top-right button on the Start Here page or pipeline list.

The map shows all your configured pipelines, indices, and ML models in one React Flow canvas:

- **Blue nodes** = ingest pipelines (click to view detail)
- **Purple nodes** = search pipelines (click to view detail)
- **Teal nodes** = indices that have pipeline settings configured
- **Amber nodes** = ML models (deployed); **gray nodes** = ML models (not deployed)
- **Solid animated blue edge** = `index.default_pipeline` setting
- **Dashed blue edge** = `index.final_pipeline` setting
- **Solid animated purple edge** = `index.search.pipeline` setting

Zoom, pan, and drag nodes to rearrange. The layout auto-positions left-to-right based on data flow direction.

### Pipeline Detail View

Click any pipeline in the list or Ecosystem Map to open its detail view.

**Visual Flow tab** — The full processor graph rendered left-to-right:
- Rectangular nodes = processors
- Diamond nodes = conditional branches (`if` expression)
- Red dashed animated edges = `on_failure` paths
- Purple "ML" badge on ML processor nodes

**JSON tab** — Raw pipeline JSON with copy button.

**Associated Indices tab** — Lists every index that references this pipeline in its settings, with the association type (default, final, or search).

**Prerequisites tab** — Health checklist with actionable guidance:
- Index not attached? Shows `PUT /my-index/_settings` snippet.
- ML processors but no deployed model? Shows `POST /_plugins/_ml/models/<id>/_deploy` guidance.
- Pipeline chain reference? Notes the referenced pipeline name for verification.

### Pipeline Editor

Create or edit pipelines with a drag-and-drop canvas.

1. Drag a processor from the left palette onto the canvas.
2. Click a node to configure it in the right panel.
3. Connect nodes by dragging from one node's handle to another.
4. For ML processors (`ml_inference`, `text_embedding`), the config panel shows dedicated ML fields including model ID picker and field mapping.
5. Click **Save** to write the pipeline to OpenSearch via `PUT /_ingest/pipeline/{id}`.

**Processor categories:**

| Category | Processors |
|----------|-----------|
| Common | set, remove, rename, convert, date, trim, uppercase, lowercase |
| Text | grok, gsub, split, join, html_strip, bytes, dissect |
| ML / Neural | ml_inference, text_embedding, sparse_encoding, text_chunking, neural_sparse, text_similarity_scoring |
| Enrichment | enrich, pipeline, geo_ip, user_agent, foreach, script |

### Prerequisites Panel

Found in the **Prerequisites** tab of any pipeline detail page. Automatically evaluates:

| Check | Status logic |
|-------|-------------|
| Index attachment | ✅ if ≥1 index uses this pipeline; ⚠️ if none |
| ML model deployed | ✅ if ≥1 DEPLOYED model exists; ❌ if ML processors present but no deployed models |
| Pipeline chain | ❓ if a `pipeline` processor references another pipeline (manual verification needed) |

Each warning or error includes a collapsible API snippet you can copy directly into Dev Tools.

---

## API Reference

All routes are prefixed with `/api/pipeline_visualizer` and proxied to OpenSearch using the current user's session credentials.

### Ingest Pipelines

| Method | Path | OpenSearch Target | Description |
|--------|------|-------------------|-------------|
| GET | `/ingest` | `GET /_ingest/pipeline` | List all ingest pipelines as `PipelineSummary[]` |
| GET | `/ingest/{id}` | `GET /_ingest/pipeline/{id}` | Get a single ingest pipeline definition |
| PUT | `/ingest/{id}` | `PUT /_ingest/pipeline/{id}` | Create or update an ingest pipeline |
| DELETE | `/ingest/{id}` | `DELETE /_ingest/pipeline/{id}` | Delete an ingest pipeline |

### Search Pipelines

| Method | Path | OpenSearch Target | Description |
|--------|------|-------------------|-------------|
| GET | `/search` | `GET /_search/pipeline` | List all search pipelines as `PipelineSummary[]` |
| GET | `/search/{id}` | `GET /_search/pipeline/{id}` | Get a single search pipeline definition |
| PUT | `/search/{id}` | `PUT /_search/pipeline/{id}` | Create or update a search pipeline |
| DELETE | `/search/{id}` | `DELETE /_search/pipeline/{id}` | Delete a search pipeline |

### Index Associations

| Method | Path | OpenSearch Target | Description |
|--------|------|-------------------|-------------|
| GET | `/indices/associations` | `GET /*/_settings` (parallel) | Map of pipeline ID → `IndexAssociation[]` |
| GET | `/indices` | `GET /*/_settings` (filtered) | Indices with pipeline settings as `IndexPipelineSettings[]` |

### ML Models

| Method | Path | OpenSearch Target | Description |
|--------|------|-------------------|-------------|
| GET | `/ml/models` | `POST /_plugins/_ml/models/_search` | List all ML Commons models as `MlModel[]` |

> **Note:** All routes handle OpenSearch 404 responses (returned when no pipelines exist) gracefully — they return an empty array rather than propagating the error to the browser.

---

## Plugin Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Platform | OpenSearch Dashboards | 3.7.0 |
| UI framework | OpenSearch / Elastic UI (EUI) | bundled with OSD |
| React | React | 17.x |
| Routing | React Router | v5 |
| State management | Redux Toolkit | 1.6.x |
| Canvas / visualization | React Flow | 11.x |
| Graph layout | Dagre | 0.8.x |
| Build system | Rspack (via OSD `@osd/optimizer`) | bundled with OSD |
| Language | TypeScript | 4.x |

### Why These Choices

**React Flow v11** — Provides production-quality graph rendering with handles, node types, edge types, selection, zoom/pan, mini-map, and background grid. The v11 API (separate `useNodesState`/`useEdgesState` hooks) is stable and well-supported.

**Dagre for layout** — Produces clean left-to-right directed acyclic graph layouts which match the natural data-flow direction of pipelines. Dagre handles both simple linear chains and complex branching (`on_failure`) topologies.

**Redux Toolkit 1.x** — OSD 3.7 ships RTK 1.x in its bundle. Using the same version avoids `single_version_dependencies` conflicts during the OSD build. RTK's `createSlice` + `createAsyncThunk` pattern cleanly handles the loading/error/data state for each API endpoint.

**Server-side proxy routes** — Rather than calling OpenSearch directly from the browser (which would require CORS configuration and expose credentials), all OpenSearch API calls go through the OSD server plugin. This uses `context.core.opensearch.client.asCurrentUser` which inherits the browser session's authentication and respects OpenSearch security roles.

**EUI components** — Using EUI (the same component library as OSD itself) ensures the plugin integrates visually with the OSD shell — navigation, toasts, modals, tables, and page layouts all look native.

### State Shape

```typescript
{
  ingestPipeline: {
    summaries: PipelineSummary[];
    pipelines: Record<string, OsIngestPipeline>; // keyed by pipeline ID
    loading: boolean;
    error: string | null;
  };
  searchPipeline: { /* same shape */ };
  indexAssoc: {
    byPipeline: Record<string, IndexAssociation[]>;
    loading: boolean;
    error: string | null;
  };
  mlModel: {
    models: MlModel[];
    loading: boolean;
    error: string | null;
  };
  indexSettings: {
    indices: IndexPipelineSettings[];
    loading: boolean;
    error: string | null;
  };
}
```

---

## Compatibility

| Plugin Version | OpenSearch Dashboards | OpenSearch |
|---------------|-----------------------|------------|
| 3.7.0.0 | 3.7.0 | 3.7.0 |

> Plugin versioning follows `{OSD_MAJOR}.{OSD_MINOR}.{OSD_PATCH}.{PLUGIN_PATCH}` as required by the OSD plugin manifest schema.

### OpenSearch Feature Requirements

| Feature | Requires |
|---------|---------|
| Ingest pipelines | Core OpenSearch (all versions) |
| Search pipelines | OpenSearch 2.9+ |
| ML model listing | ML Commons plugin (bundled with OpenSearch 2.x+) |
| Text embedding / neural search | ML Commons + a deployed embedding model |

---

## Contributing

### Development Setup

1. Clone this repo alongside an OpenSearch Dashboards 3.7.0 source checkout:
   ```
   <workspace>/
   ├── OpenSearch-Dashboards/          # OSD source (3.7.0 tag)
   └── opensearch-pipeline-visualization-plugin/
   ```

2. Symlink the plugin:
   ```bash
   ln -s $(pwd)/pipeline-visualizer ../OpenSearch-Dashboards/plugins/pipeline-visualizer
   ```

3. Bootstrap and start:
   ```bash
   cd ../OpenSearch-Dashboards
   yarn osd bootstrap
   yarn start --no-base-path
   ```

4. The plugin hot-reloads on TypeScript changes.

### Running Against a Local OpenSearch

Use the included Docker Compose to get a local single-node OpenSearch cluster without OSD:

```bash
docker compose up opensearch -d
```

Then set `opensearch.hosts: ["https://localhost:9200"]` in your local OSD config.

### Pull Request Guidelines

- Keep PR scope focused — one feature or fix per PR
- Add types for any new API response shapes to `common/types.ts`
- New server routes should handle 404 (empty list) gracefully
- Test new pages against an empty cluster (no pipelines) and a populated cluster

---

## Roadmap

- [ ] Pipeline simulator — run a sample document through a pipeline and show field-by-field transformations
- [ ] Index mapping view — show kNN vector fields alongside the pipeline that generates them
- [ ] ML model registration wizard — register a model from a Hugging Face URL or S3 path from within the plugin
- [ ] Pipeline templates — pre-built starter pipelines for common use cases (semantic search, geo enrichment, PII redaction)
- [ ] Diff view — visual diff when editing an existing pipeline
- [ ] Multi-cluster support — visualize pipelines across multiple data sources

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).

This plugin is not an official OpenSearch project product. It is an independent community plugin built to complement the OpenSearch ecosystem.
