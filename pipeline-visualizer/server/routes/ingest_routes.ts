import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';
import { PipelineSummary } from '../../common';

const ML_PROCESSOR_TYPES = ['ml_inference','text_embedding','sparse_encoding','text_chunking','neural_sparse','text_similarity_scoring'];

export function registerIngestRoutes(router: IRouter): void {
  // List all ingest pipelines
  router.get(
    { path: '/api/pipeline_visualizer/ingest', validate: false },
    async (context, _req, response) => {
      try {
        const { body } = await context.core.opensearch.client.asCurrentUser.ingest.getPipeline({} as any);
        const summaries: PipelineSummary[] = Object.entries(body as Record<string, any>).map(
          ([id, pipeline]) => {
            const processors = pipeline.processors ?? [];
            const allProcessors = [...processors, ...(pipeline.on_failure ?? [])];
            const types = allProcessors.map((p: any) => Object.keys(p)[0]);
            return {
              id,
              type: 'ingest' as const,
              description: pipeline.description,
              processorCount: processors.length,
              hasMLProcessors: types.some((t: string) => ML_PROCESSOR_TYPES.includes(t)),
              version: pipeline.version,
            };
          }
        );
        return response.ok({ body: summaries });
      } catch (err: any) {
        // OpenSearch returns 404 when no ingest pipelines exist — treat as empty list
        if (err.statusCode === 404) return response.ok({ body: [] });
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );

  // Get single pipeline
  router.get(
    {
      path: '/api/pipeline_visualizer/ingest/{id}',
      validate: { params: schema.object({ id: schema.string() }) },
    },
    async (context, req, response) => {
      try {
        const { body } = await context.core.opensearch.client.asCurrentUser.ingest.getPipeline({ id: req.params.id } as any);
        const pipelines = body as Record<string, any>;
        return response.ok({ body: pipelines[req.params.id] ?? {} });
      } catch (err: any) {
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );

  // Create or update pipeline
  router.put(
    {
      path: '/api/pipeline_visualizer/ingest/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.any(),
      },
    },
    async (context, req, response) => {
      try {
        const { body } = await context.core.opensearch.client.asCurrentUser.ingest.putPipeline({
          id: req.params.id,
          body: req.body,
        } as any);
        return response.ok({ body });
      } catch (err: any) {
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );

  // Delete pipeline
  router.delete(
    {
      path: '/api/pipeline_visualizer/ingest/{id}',
      validate: { params: schema.object({ id: schema.string() }) },
    },
    async (context, req, response) => {
      try {
        const { body } = await context.core.opensearch.client.asCurrentUser.ingest.deletePipeline({ id: req.params.id } as any);
        return response.ok({ body });
      } catch (err: any) {
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );
}
