import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';

export function registerSimulateRoutes(router: IRouter): void {
  router.post(
    {
      path: '/api/pipeline_visualizer/simulate/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({ doc: schema.any() }),
      },
    },
    async (context, req, response) => {
      try {
        const pipelineId = req.params.id;
        const result = await context.core.opensearch.client.asCurrentUser.transport.request({
          method: 'POST',
          path: `/_ingest/pipeline/${encodeURIComponent(pipelineId)}/_simulate?verbose=true`,
          body: {
            docs: [
              {
                _index: 'simulate',
                _id: '1',
                _source: req.body.doc,
              },
            ],
          },
        });
        return response.ok({ body: (result as any).body });
      } catch (err: any) {
        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: { message: err.message },
        });
      }
    }
  );
}
