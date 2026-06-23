import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';
import { PipelineSummary } from '../../common';

const ML_PROCESSOR_TYPES = ['ml_inference','text_embedding','sparse_encoding','text_chunking','neural_sparse','text_similarity_scoring'];

export function registerSearchRoutes(router: IRouter): void {
  router.get(
    { path: '/api/pipeline_visualizer/search', validate: false },
    async (context, _req, response) => {
      try {
        const result = await context.core.opensearch.client.asCurrentUser.transport.request({
          method: 'GET', path: '/_search/pipeline',
        });
        const body = (result as any).body as Record<string, any>;
        const summaries: PipelineSummary[] = Object.entries(body).map(([id, pipeline]) => {
          const rp = pipeline.request_processors ?? [];
          const resp = pipeline.response_processors ?? [];
          const phase = pipeline.phase_results_processors ?? [];
          const allProcessors = [...rp, ...resp, ...phase];
          const types = allProcessors.map((p: any) => Object.keys(p)[0]);
          return {
            id, type: 'search' as const, description: pipeline.description,
            processorCount: rp.length + resp.length + phase.length,
            hasMLProcessors: types.some((t: string) => ML_PROCESSOR_TYPES.includes(t)),
            version: pipeline.version,
          };
        });
        return response.ok({ body: summaries });
      } catch (err: any) {
        // OpenSearch returns 404 when no search pipelines exist — treat as empty list
        if (err.statusCode === 404) return response.ok({ body: [] });
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );

  router.get(
    { path: '/api/pipeline_visualizer/search/{id}', validate: { params: schema.object({ id: schema.string() }) } },
    async (context, req, response) => {
      try {
        const result = await context.core.opensearch.client.asCurrentUser.transport.request({
          method: 'GET', path: `/_search/pipeline/${encodeURIComponent(req.params.id)}`,
        });
        const body = (result as any).body as Record<string, any>;
        return response.ok({ body: body[req.params.id] ?? {} });
      } catch (err: any) {
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );

  router.put(
    {
      path: '/api/pipeline_visualizer/search/{id}',
      validate: { params: schema.object({ id: schema.string() }), body: schema.any() },
    },
    async (context, req, response) => {
      try {
        const result = await context.core.opensearch.client.asCurrentUser.transport.request({
          method: 'PUT',
          path: `/_search/pipeline/${encodeURIComponent(req.params.id)}`,
          body: req.body,
        });
        return response.ok({ body: (result as any).body });
      } catch (err: any) {
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );

  router.delete(
    { path: '/api/pipeline_visualizer/search/{id}', validate: { params: schema.object({ id: schema.string() }) } },
    async (context, req, response) => {
      try {
        const result = await context.core.opensearch.client.asCurrentUser.transport.request({
          method: 'DELETE', path: `/_search/pipeline/${encodeURIComponent(req.params.id)}`,
        });
        return response.ok({ body: (result as any).body });
      } catch (err: any) {
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );
}
