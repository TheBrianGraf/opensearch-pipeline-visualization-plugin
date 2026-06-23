import { IRouter } from 'opensearch-dashboards/server';
import { IndexPipelineSettings } from '../../common';

export function registerIndexRoutes(router: IRouter): void {
  router.get(
    { path: '/api/pipeline_visualizer/indices', validate: false },
    async (context, _req, response) => {
      try {
        const { body } = await context.core.opensearch.client.asCurrentUser.indices.getSettings({
          index: '*',
          filterPath: [
            '*.settings.index.default_pipeline',
            '*.settings.index.final_pipeline',
            '*.settings.index.search.pipeline',
          ],
          expandWildcards: 'open' as any,
          ignoreUnavailable: true as any,
        } as any);

        const settings = body as Record<string, any>;
        const results: IndexPipelineSettings[] = [];

        for (const [indexName, indexData] of Object.entries(settings)) {
          if (indexName.startsWith('.')) continue; // skip system indices
          const idx = indexData?.settings?.index ?? {};
          const entry: IndexPipelineSettings = { indexName };
          if (idx.default_pipeline) entry.defaultPipeline = idx.default_pipeline;
          if (idx.final_pipeline) entry.finalPipeline = idx.final_pipeline;
          if (idx.search?.pipeline) entry.searchPipeline = idx.search.pipeline;
          // Only include indices that have at least one pipeline setting
          if (entry.defaultPipeline || entry.finalPipeline || entry.searchPipeline) {
            results.push(entry);
          }
        }

        return response.ok({ body: results });
      } catch (err: any) {
        if (err.statusCode === 404) return response.ok({ body: [] });
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );
}
