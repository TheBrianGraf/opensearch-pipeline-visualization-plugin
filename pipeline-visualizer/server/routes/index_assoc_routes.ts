import { IRouter } from 'opensearch-dashboards/server';
import { IndexAssociation, IndexAssociationResponse } from '../../common';

export function registerIndexAssocRoutes(router: IRouter): void {
  router.get(
    { path: '/api/pipeline_visualizer/indices/associations', validate: false },
    async (context, _req, response) => {
      try {
        const client = context.core.opensearch.client.asCurrentUser;

        const [ingestResult, searchResult] = await Promise.all([
          client.indices.getSettings({
            index: '*',
            filter_path: ['*.settings.index.default_pipeline', '*.settings.index.final_pipeline'],
            flat_settings: false,
          } as any),
          client.indices.getSettings({
            index: '*',
            filter_path: ['*.settings.index.search'],
            flat_settings: false,
          } as any),
        ]);

        const byPipeline: Record<string, IndexAssociation[]> = {};

        const ingestBody = (ingestResult as any).body as Record<string, any>;
        Object.entries(ingestBody ?? {}).forEach(([indexName, data]) => {
          const idx = data?.settings?.index ?? {};
          if (idx.default_pipeline) {
            const pid = idx.default_pipeline as string;
            (byPipeline[pid] = byPipeline[pid] ?? []).push({ indexName, pipelineId: pid, pipelineType: 'default' });
          }
          if (idx.final_pipeline) {
            const pid = idx.final_pipeline as string;
            (byPipeline[pid] = byPipeline[pid] ?? []).push({ indexName, pipelineId: pid, pipelineType: 'final' });
          }
        });

        const searchBody = (searchResult as any).body as Record<string, any>;
        Object.entries(searchBody ?? {}).forEach(([indexName, data]) => {
          const pid = data?.settings?.index?.search?.pipeline as string | undefined;
          if (pid) {
            (byPipeline[pid] = byPipeline[pid] ?? []).push({ indexName, pipelineId: pid, pipelineType: 'search' });
          }
        });

        const res: IndexAssociationResponse = { byPipeline };
        return response.ok({ body: res });
      } catch (err: any) {
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );
}
