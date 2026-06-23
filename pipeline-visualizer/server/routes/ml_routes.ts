import { IRouter } from 'opensearch-dashboards/server';
import { MlModel } from '../../common';

export function registerMlRoutes(router: IRouter): void {
  router.get(
    { path: '/api/pipeline_visualizer/ml/models', validate: false },
    async (context, _req, response) => {
      try {
        const result = await context.core.opensearch.client.asCurrentUser.transport.request({
          method: 'GET',
          path: '/_plugins/_ml/models/_search',
          body: { query: { match_all: {} }, size: 200 },
        });
        const body = (result as any).body;
        const hits: any[] = body?.hits?.hits ?? [];
        const models: MlModel[] = hits.map((hit: any) => ({
          id: hit._id,
          name: hit._source?.name ?? hit._id,
          description: hit._source?.description,
          state: hit._source?.model_state ?? hit._source?.state ?? 'UNKNOWN',
          modelFormat: hit._source?.model_format,
          algorithmName: hit._source?.algorithm,
          modelGroupId: hit._source?.model_group_id,
        }));
        return response.ok({ body: models });
      } catch (err: any) {
        // ML Commons not installed or no models — return empty list
        if (err.statusCode === 404 || err.statusCode === 400) {
          return response.ok({ body: [] });
        }
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );
}
