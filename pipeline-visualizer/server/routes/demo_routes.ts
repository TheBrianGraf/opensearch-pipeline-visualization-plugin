import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';

// ── Scenario definitions ──────────────────────────────────────────────────────
// Each scenario defines the pipelines to create, the index to create,
// and the raw sample documents that the pipeline will process.
// The sample doc is the INPUT format the pipeline expects — shown in the Simulator.

const SCENARIOS: Record<string, ScenarioDef> = {

  // ── 1. Web Server Logs ───────────────────────────────────────────────────────
  'web-logs': {
    label: 'Web Server Logs',
    description: 'Parse Apache access logs, extract fields, add severity labels, and chain to a finalization pipeline.',
    ingestPipelines: {
      'demo-logs-parse': {
        description: 'Parse Apache access logs: Grok extraction → field conversion → conditional severity labeling → pipeline chain',
        processors: [
          {
            grok: {
              field: 'message',
              patterns: ['%{IPORHOST:client_ip} %{USER:ident} %{USER:auth} \\[%{HTTPDATE:request_ts}\\] "%{WORD:method} %{NOTSPACE:path} HTTP/%{NUMBER:http_version}" %{NUMBER:status} (?:%{NUMBER:bytes}|-)'],
              ignore_failure: true,
            },
          },
          {
            date: {
              field: 'request_ts',
              formats: ['dd/MMM/yyyy:HH:mm:ss Z'],
              target_field: '@timestamp',
              ignore_missing: true,
              ignore_failure: true,
            },
          },
          {
            convert: { field: 'status', type: 'integer', ignore_missing: true },
          },
          {
            convert: { field: 'bytes', type: 'long', ignore_missing: true },
          },
          {
            set: {
              field: 'event.outcome',
              value: 'success',
              if: "ctx.status != null && ctx.status < 400",
            },
          },
          {
            set: {
              field: 'event.outcome',
              value: 'failure',
              if: "ctx.status != null && ctx.status >= 400",
            },
          },
          {
            set: {
              field: 'event.severity',
              value: 'critical',
              if: "ctx.status != null && ctx.status >= 500",
            },
          },
          {
            remove: {
              field: ['request_ts', 'ident', 'auth'],
              ignore_missing: true,
            },
          },
          {
            pipeline: { name: 'demo-logs-final' },
          },
        ],
        on_failure: [
          { set: { field: '_ingest_error', value: '{{_ingest.on_failure_message}}' } },
        ],
      },

      'demo-logs-final': {
        description: 'Finalization step chained from demo-logs-parse: adds ingest metadata',
        processors: [
          { set: { field: 'ingest.pipeline', value: 'demo-logs-parse' } },
          { set: { field: 'ingest.version', value: '1.0' } },
          { set: { field: 'data_stream.type', value: 'logs' } },
        ],
      },
    },

    searchPipelines: {},

    index: {
      name: 'demo-web-logs',
      settings: { 'index.default_pipeline': 'demo-logs-parse' },
      mappings: {
        properties: {
          message:       { type: 'text' },
          client_ip:     { type: 'ip' },
          method:        { type: 'keyword' },
          path:          { type: 'keyword' },
          http_version:  { type: 'keyword' },
          status:        { type: 'integer' },
          bytes:         { type: 'long' },
          '@timestamp':  { type: 'date' },
          'event.outcome':  { type: 'keyword' },
          'event.severity': { type: 'keyword' },
          'ingest.pipeline': { type: 'keyword' },
        },
      },
    },

    // Raw documents indexed through the pipeline (input format)
    sampleDocs: [
      { message: '151.36.95.42 - frank [10/Oct/2024:13:55:36 -0700] "GET /home HTTP/1.1" 200 4521' },
      { message: '89.201.128.5 - - [10/Oct/2024:13:56:01 -0700] "POST /api/login HTTP/1.1" 401 312' },
      { message: '203.15.64.128 - - [10/Oct/2024:13:56:15 -0700] "GET /static/app.js HTTP/1.1" 200 89432' },
      { message: '151.36.95.42 - frank [10/Oct/2024:13:56:30 -0700] "GET /api/users HTTP/1.1" 200 1523' },
      { message: '10.0.0.5 - admin [10/Oct/2024:13:57:00 -0700] "DELETE /api/users/42 HTTP/1.1" 403 256' },
      { message: '89.201.128.5 - - [10/Oct/2024:13:57:15 -0700] "GET /api/orders HTTP/1.1" 500 89' },
      { message: '45.33.22.11 - - [10/Oct/2024:13:57:30 -0700] "GET /favicon.ico HTTP/1.1" 304 0' },
      { message: '203.15.64.128 - - [10/Oct/2024:13:57:45 -0700] "POST /api/checkout HTTP/1.1" 200 2341' },
      { message: '151.36.95.42 - frank [10/Oct/2024:13:58:00 -0700] "GET /api/products HTTP/1.1" 200 18432' },
      { message: '89.201.128.5 - - [10/Oct/2024:13:58:15 -0700] "GET /api/search?q=laptop HTTP/1.1" 200 4521' },
      { message: '66.249.66.1 - - [10/Oct/2024:13:58:30 -0700] "GET /robots.txt HTTP/1.0" 200 68' },
      { message: '151.36.95.42 - frank [10/Oct/2024:13:59:00 -0700] "PUT /api/profile HTTP/1.1" 200 987' },
      { message: '203.15.64.128 - - [10/Oct/2024:13:59:15 -0700] "GET /api/dashboard HTTP/1.1" 500 120' },
      { message: '10.0.0.5 - admin [10/Oct/2024:13:59:30 -0700] "POST /api/admin/users HTTP/1.1" 201 445' },
      { message: '89.201.128.5 - - [10/Oct/2024:14:00:00 -0700] "GET /api/stats HTTP/1.1" 200 3201' },
    ],

    // The canonical sample doc shown pre-populated in the Simulator tab
    simulatorSample: {
      pipelineId: 'demo-logs-parse',
      doc: {
        message: '151.36.95.42 - frank [10/Oct/2024:13:55:36 -0700] "GET /api/users HTTP/1.1" 200 1523',
      },
      description: 'Raw Apache access log line — the pipeline will parse this into structured fields.',
    },
  },

  // ── 2. E-Commerce Products ───────────────────────────────────────────────────
  'ecommerce': {
    label: 'E-Commerce Products',
    description: 'Normalize a product catalog: trim whitespace, derive price_range and in_stock flags, attach a search pipeline.',
    ingestPipelines: {
      'demo-products-normalize': {
        description: 'Normalize product catalog: trim fields, derive price_range, set in_stock flag, add ingest timestamp',
        processors: [
          { trim: { field: 'name', ignore_missing: true } },
          { trim: { field: 'description', ignore_missing: true } },
          { lowercase: { field: 'category', ignore_missing: true } },
          {
            set: {
              field: 'in_stock',
              value: true,
              if: 'ctx.quantity != null && ctx.quantity > 0',
            },
          },
          {
            set: {
              field: 'in_stock',
              value: false,
              if: 'ctx.quantity != null && ctx.quantity <= 0',
            },
          },
          {
            set: {
              field: 'price_range',
              value: 'budget',
              if: 'ctx.price != null && ctx.price < 25',
            },
          },
          {
            set: {
              field: 'price_range',
              value: 'mid-range',
              if: 'ctx.price != null && ctx.price >= 25 && ctx.price < 100',
            },
          },
          {
            set: {
              field: 'price_range',
              value: 'premium',
              if: 'ctx.price != null && ctx.price >= 100',
            },
          },
          { set: { field: 'indexed_at', value: '{{{_ingest.timestamp}}}' } },
        ],
        on_failure: [
          { set: { field: '_ingest_error', value: '{{_ingest.on_failure_message}}' } },
        ],
      },
    },

    searchPipelines: {
      'demo-products-search': {
        description: 'Normalize product search scores for hybrid BM25 + neural search',
        request_processors: [],
        response_processors: [],
        phase_results_processors: [],
      },
    },

    index: {
      name: 'demo-products',
      settings: {
        'index.default_pipeline': 'demo-products-normalize',
        'index.search.pipeline': 'demo-products-search',
      },
      mappings: {
        properties: {
          name:        { type: 'text', fields: { keyword: { type: 'keyword' } } },
          description: { type: 'text' },
          category:    { type: 'keyword' },
          brand:       { type: 'keyword' },
          price:       { type: 'float' },
          quantity:    { type: 'integer' },
          sku:         { type: 'keyword' },
          in_stock:    { type: 'boolean' },
          price_range: { type: 'keyword' },
          indexed_at:  { type: 'date' },
        },
      },
    },

    sampleDocs: [
      { name: '  Wireless Noise-Cancelling Headphones  ', category: 'ELECTRONICS', brand: 'AudioTech', price: 89.99, quantity: 42, sku: 'AT-WH-001', description: 'Premium wireless headphones with 30-hour battery life' },
      { name: 'USB-C Charging Cable  ', category: 'ACCESSORIES', brand: 'CableMax', price: 12.99, quantity: 200, sku: 'CM-USB-003', description: '6ft braided USB-C charging cable' },
      { name: '4K Monitor 27"', category: 'ELECTRONICS', brand: 'ViewPro', price: 349.00, quantity: 15, sku: 'VP-MON-27', description: '27-inch 4K IPS display with HDR support' },
      { name: '  Mechanical Keyboard', category: 'PERIPHERALS', brand: 'TypeMaster', price: 129.99, quantity: 67, sku: 'TM-KB-RED', description: 'Compact mechanical keyboard with red switches' },
      { name: 'Laptop Stand  ', category: 'ACCESSORIES', brand: 'DeskPro', price: 34.99, quantity: 0, sku: 'DP-LS-ALU', description: 'Adjustable aluminium laptop stand' },
      { name: 'Webcam HD 1080p', category: 'PERIPHERALS', brand: 'ClearView', price: 59.99, quantity: 33, sku: 'CV-WC-1080', description: 'Full HD webcam with built-in microphone' },
      { name: '  External SSD 1TB', category: 'STORAGE', brand: 'FastDrive', price: 89.00, quantity: 28, sku: 'FD-SSD-1TB', description: 'Portable SSD with 1050MB/s read speeds' },
      { name: 'Ergonomic Mouse', category: 'PERIPHERALS', brand: 'ErgoTech', price: 44.99, quantity: 91, sku: 'ET-MS-ERG', description: 'Vertical ergonomic mouse reduces wrist strain' },
      { name: 'HDMI Cable 2.1  ', category: 'ACCESSORIES', brand: 'CableMax', price: 18.99, quantity: 150, sku: 'CM-HDMI-21', description: '8K HDMI 2.1 cable for gaming monitors' },
      { name: 'Smart Desk Lamp', category: 'OFFICE', brand: 'LumiDesk', price: 42.00, quantity: 0, sku: 'LD-LAMP-USB', description: 'LED desk lamp with USB charging port and adjustable color temp' },
      { name: '  Blue Light Glasses', category: 'ACCESSORIES', brand: 'VisionSafe', price: 19.99, quantity: 75, sku: 'VS-GLX-BLUE', description: 'Anti-blue-light glasses for screen use' },
      { name: 'Noise Machine', category: 'OFFICE', brand: 'SoundShield', price: 29.99, quantity: 44, sku: 'SS-NM-PRO', description: 'White noise machine with 20 natural sounds' },
      { name: '  Wireless Charger Pad  ', category: 'ACCESSORIES', brand: 'ChargeFast', price: 24.99, quantity: 110, sku: 'CF-WC-15W', description: '15W Qi wireless charging pad' },
      { name: 'Monitor Arm Single', category: 'OFFICE', brand: 'FlexMount', price: 54.99, quantity: 37, sku: 'FM-MA-SGL', description: 'Fully articulating monitor arm, holds up to 17.6 lbs' },
      { name: 'USB Hub 7-Port  ', category: 'ACCESSORIES', brand: 'ExpandIt', price: 39.99, quantity: 82, sku: 'EI-HUB-7P', description: 'Powered 7-port USB 3.0 hub with surge protection' },
    ],

    simulatorSample: {
      pipelineId: 'demo-products-normalize',
      doc: {
        name: '  Wireless Noise-Cancelling Headphones  ',
        category: 'ELECTRONICS',
        brand: 'AudioTech',
        price: 89.99,
        quantity: 42,
        sku: 'AT-WH-001',
        description: '  Premium wireless headphones with active noise cancellation and 30-hour battery life  ',
      },
      description: 'A raw product record with extra whitespace and un-normalized category — the pipeline will clean and enrich it.',
    },
  },

  // ── 3. ML Embeddings Ready ───────────────────────────────────────────────────
  'ml-ready': {
    label: 'ML / Semantic Search Ready',
    description: 'Set up a text_embedding pipeline and kNN index mapping. No model is deployed — use the Prerequisites tab to see what is needed.',
    ingestPipelines: {
      'demo-ml-embeddings': {
        description: 'Generate vector embeddings for semantic search using a text_embedding ML processor',
        processors: [
          { trim: { field: 'title', ignore_missing: true } },
          { trim: { field: 'body', ignore_missing: true } },
          {
            text_embedding: {
              model_id: '<your-model-id>',
              field_map: {
                title: 'title_embedding',
                body: 'body_embedding',
              },
              ignore_failure: false,
            },
          },
          { set: { field: 'embedding_model', value: '<your-model-id>' } },
          { set: { field: 'indexed_at', value: '{{{_ingest.timestamp}}}' } },
        ],
        on_failure: [
          {
            set: {
              field: '_embedding_error',
              value: 'text_embedding failed — is your ML model deployed? Run: POST /_plugins/_ml/models/<id>/_deploy',
            },
          },
        ],
      },
    },

    searchPipelines: {
      'demo-neural-search': {
        description: 'Hybrid BM25 + neural search with score normalization',
        request_processors: [],
        response_processors: [],
        phase_results_processors: [],
      },
    },

    index: {
      name: 'demo-semantic-docs',
      settings: {
        'index.default_pipeline': 'demo-ml-embeddings',
        'index.search.pipeline': 'demo-neural-search',
        'index.knn': true,
      },
      mappings: {
        properties: {
          title:           { type: 'text' },
          body:            { type: 'text' },
          category:        { type: 'keyword' },
          author:          { type: 'keyword' },
          indexed_at:      { type: 'date' },
          title_embedding: { type: 'knn_vector', dimension: 768, method: { name: 'hnsw', space_type: 'cosinesimil', engine: 'nmslib' } },
          body_embedding:  { type: 'knn_vector', dimension: 768, method: { name: 'hnsw', space_type: 'cosinesimil', engine: 'nmslib' } },
        },
      },
    },

    // These docs will FAIL to index unless a model is deployed — that's intentional.
    // It demonstrates the Prerequisites error state in the plugin.
    sampleDocs: [
      { title: 'Introduction to Vector Search', body: 'Vector search enables semantic similarity matching by comparing high-dimensional embeddings rather than exact keyword matches. This approach understands meaning, not just words.', category: 'search', author: 'OpenSearch Team' },
      { title: 'Getting Started with ML Commons', body: 'ML Commons is a plugin for OpenSearch that provides a set of machine learning algorithms and tools. It enables you to train models and perform inference within OpenSearch.', category: 'ml', author: 'OpenSearch Team' },
      { title: 'Hybrid Search with BM25 and Neural', body: 'Hybrid search combines the precision of BM25 keyword search with the semantic understanding of neural search to deliver more relevant results across diverse query types.', category: 'search', author: 'OpenSearch Team' },
    ],

    simulatorSample: {
      pipelineId: 'demo-ml-embeddings',
      doc: {
        title: 'Introduction to Vector Search',
        body: 'Vector search enables semantic similarity matching by comparing high-dimensional embeddings rather than exact keyword matches. This approach understands meaning, not just words.',
        category: 'search',
        author: 'OpenSearch Team',
      },
      description: 'Document to embed. The pipeline will call text_embedding with your deployed model — check the Prerequisites tab to set up your model first.',
    },
  },
};

interface ScenarioDef {
  label: string;
  description: string;
  ingestPipelines: Record<string, any>;
  searchPipelines: Record<string, any>;
  index: { name: string; settings: Record<string, any>; mappings: Record<string, any> };
  sampleDocs: object[];
  simulatorSample: { pipelineId: string; doc: object; description: string };
}

// ── Route handlers ────────────────────────────────────────────────────────────

export function registerDemoRoutes(router: IRouter): void {

  // GET /api/pipeline_visualizer/demo/scenarios — list available scenarios
  router.get(
    { path: '/api/pipeline_visualizer/demo/scenarios', validate: false },
    async (_context, _req, response) => {
      const list = Object.entries(SCENARIOS).map(([id, s]) => ({
        id,
        label: s.label,
        description: s.description,
        creates: {
          ingestPipelines: Object.keys(s.ingestPipelines),
          searchPipelines: Object.keys(s.searchPipelines),
          index: s.index.name,
          docCount: s.sampleDocs.length,
        },
      }));
      return response.ok({ body: list });
    }
  );

  // GET /api/pipeline_visualizer/demo/sample/:pipelineId — get pre-populated simulator doc
  router.get(
    {
      path: '/api/pipeline_visualizer/demo/sample/{pipelineId}',
      validate: { params: schema.object({ pipelineId: schema.string() }) },
    },
    async (_context, req, response) => {
      for (const scenario of Object.values(SCENARIOS)) {
        if (scenario.simulatorSample.pipelineId === req.params.pipelineId) {
          return response.ok({ body: scenario.simulatorSample });
        }
      }
      return response.notFound({ body: { message: 'No demo sample for this pipeline' } });
    }
  );

  // POST /api/pipeline_visualizer/demo/setup/:scenario — create all demo resources
  router.post(
    {
      path: '/api/pipeline_visualizer/demo/setup/{scenario}',
      validate: { params: schema.object({ scenario: schema.string() }) },
    },
    async (context, req, response) => {
      const scenario = SCENARIOS[req.params.scenario];
      if (!scenario) {
        return response.badRequest({ body: { message: `Unknown scenario: ${req.params.scenario}` } });
      }

      const client = context.core.opensearch.client.asCurrentUser;
      const created: string[] = [];
      const errors: string[] = [];

      // 1. Create ingest pipelines
      for (const [id, def] of Object.entries(scenario.ingestPipelines)) {
        try {
          await client.transport.request({ method: 'PUT', path: `/_ingest/pipeline/${id}`, body: def });
          created.push(`ingest pipeline: ${id}`);
        } catch (err: any) {
          errors.push(`ingest pipeline ${id}: ${err.message}`);
        }
      }

      // 2. Create search pipelines
      for (const [id, def] of Object.entries(scenario.searchPipelines)) {
        try {
          await client.transport.request({ method: 'PUT', path: `/_search/pipeline/${id}`, body: def });
          created.push(`search pipeline: ${id}`);
        } catch (err: any) {
          errors.push(`search pipeline ${id}: ${err.message}`);
        }
      }

      // 3. Create index with mappings (delete first if already exists)
      const { name: indexName, settings, mappings } = scenario.index;
      try {
        await client.transport.request({ method: 'DELETE', path: `/${indexName}` });
      } catch { /* ignore — index may not exist */ }
      try {
        await client.transport.request({
          method: 'PUT',
          path: `/${indexName}`,
          body: { settings, mappings },
        });
        created.push(`index: ${indexName}`);
      } catch (err: any) {
        errors.push(`index ${indexName}: ${err.message}`);
      }

      // 4. Bulk index sample docs (routed through the default_pipeline)
      if (scenario.sampleDocs.length > 0 && !errors.some(e => e.startsWith(`index ${indexName}`))) {
        try {
          const bulkBody = scenario.sampleDocs.flatMap(doc => [
            { index: { _index: indexName } },
            doc,
          ]);
          await client.transport.request({
            method: 'POST',
            path: '/_bulk',
            body: bulkBody.map(line => JSON.stringify(line)).join('\n') + '\n',
          });
          created.push(`${scenario.sampleDocs.length} sample documents indexed through pipeline`);
        } catch (err: any) {
          errors.push(`bulk index: ${err.message}`);
        }
      }

      return response.ok({
        body: {
          scenario: req.params.scenario,
          created,
          errors,
          simulatorPipeline: scenario.simulatorSample.pipelineId,
          index: indexName,
        },
      });
    }
  );

  // DELETE /api/pipeline_visualizer/demo/teardown/:scenario — remove all demo resources
  router.delete(
    {
      path: '/api/pipeline_visualizer/demo/teardown/{scenario}',
      validate: { params: schema.object({ scenario: schema.string() }) },
    },
    async (context, req, response) => {
      const scenario = SCENARIOS[req.params.scenario];
      if (!scenario) {
        return response.badRequest({ body: { message: `Unknown scenario: ${req.params.scenario}` } });
      }
      const client = context.core.opensearch.client.asCurrentUser;
      const removed: string[] = [];

      for (const id of Object.keys(scenario.ingestPipelines)) {
        try {
          await client.transport.request({ method: 'DELETE', path: `/_ingest/pipeline/${id}` });
          removed.push(`ingest pipeline: ${id}`);
        } catch { /* ignore */ }
      }
      for (const id of Object.keys(scenario.searchPipelines)) {
        try {
          await client.transport.request({ method: 'DELETE', path: `/_search/pipeline/${id}` });
          removed.push(`search pipeline: ${id}`);
        } catch { /* ignore */ }
      }
      try {
        await client.transport.request({ method: 'DELETE', path: `/${scenario.index.name}` });
        removed.push(`index: ${scenario.index.name}`);
      } catch { /* ignore */ }

      return response.ok({ body: { removed } });
    }
  );
}
