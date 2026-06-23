import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';

interface ProcessorStats {
  type: string;
  tag?: string;
  count: number;
  timeMs: number;
  failed: number;
  current: number;
}

interface PipelineStatsResponse {
  pipelineId: string;
  count: number;
  timeMs: number;
  failed: number;
  current: number;
  avgLatencyMs: number;
  failureRate: number;
  processors: ProcessorStats[];
}

function aggregateAcrossNodes(nodes: Record<string, any>, pipelineId: string): PipelineStatsResponse {
  let count = 0, timeMs = 0, failed = 0, current = 0;
  const processorAggregates: Map<string, ProcessorStats> = new Map();

  for (const node of Object.values(nodes)) {
    const p = node?.ingest?.pipelines?.[pipelineId];
    if (!p) continue;
    count   += p.count           ?? 0;
    timeMs  += p.time_in_millis  ?? 0;
    failed  += p.failed          ?? 0;
    current += p.current         ?? 0;

    const procs: any[] = p.processors ?? [];
    procs.forEach((proc, idx) => {
      const [key] = Object.keys(proc);
      const stats = proc[key]?.stats ?? proc[key] ?? {};
      const existingKey = `${idx}:${key}`;
      const existing = processorAggregates.get(existingKey);
      if (existing) {
        existing.count   += stats.count          ?? 0;
        existing.timeMs  += stats.time_in_millis ?? 0;
        existing.failed  += stats.failed         ?? 0;
        existing.current += stats.current        ?? 0;
      } else {
        const typeName = proc[key]?.type ?? key.split('[')[0];
        const tag = key.includes('[') ? key.slice(key.indexOf('[') + 1, -1) : undefined;
        processorAggregates.set(existingKey, {
          type: typeName,
          tag,
          count:   stats.count          ?? 0,
          timeMs:  stats.time_in_millis ?? 0,
          failed:  stats.failed         ?? 0,
          current: stats.current        ?? 0,
        });
      }
    });
  }

  const processors = Array.from(processorAggregates.values());
  return {
    pipelineId,
    count,
    timeMs,
    failed,
    current,
    avgLatencyMs: count > 0 ? Math.round((timeMs / count) * 100) / 100 : 0,
    failureRate:  count > 0 ? Math.round((failed / count) * 10000) / 100 : 0,
    processors,
  };
}

export function registerStatsRoutes(router: IRouter): void {
  // GET /api/pipeline_visualizer/stats/ingest/{id}
  router.get(
    {
      path: '/api/pipeline_visualizer/stats/ingest/{id}',
      validate: { params: schema.object({ id: schema.string() }) },
    },
    async (context, req, response) => {
      try {
        const result = await context.core.opensearch.client.asCurrentUser.nodes.stats({
          metric: ['ingest'] as any,
        });
        const body = (result as any).body;
        const stats = aggregateAcrossNodes(body.nodes ?? {}, req.params.id);
        return response.ok({ body: stats });
      } catch (err: any) {
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );

  // GET /api/pipeline_visualizer/stats/search/{id}
  // Search pipeline stats live under nodes.{id}.search_pipeline.pipelines
  router.get(
    {
      path: '/api/pipeline_visualizer/stats/search/{id}',
      validate: { params: schema.object({ id: schema.string() }) },
    },
    async (context, req, response) => {
      try {
        const result = await context.core.opensearch.client.asCurrentUser.nodes.stats({} as any);
        const body = (result as any).body;
        let count = 0, timeMs = 0, failed = 0, current = 0;
        const processorAggregates: Map<string, ProcessorStats> = new Map();

        for (const node of Object.values(body.nodes ?? {}) as any[]) {
          const p = node?.search_pipeline?.pipelines?.[req.params.id];
          if (!p) continue;
          count   += p.count          ?? 0;
          timeMs  += p.time_in_millis ?? 0;
          failed  += p.failed         ?? 0;
          current += p.current        ?? 0;

          const allProcs = [
            ...(p.request_processors  ?? []),
            ...(p.response_processors ?? []),
            ...(p.phase_results_processors ?? []),
          ];
          allProcs.forEach((proc: any, idx: number) => {
            const [key] = Object.keys(proc);
            const stats = proc[key]?.stats ?? proc[key] ?? {};
            const existingKey = `${idx}:${key}`;
            const existing = processorAggregates.get(existingKey);
            if (existing) {
              existing.count   += stats.count          ?? 0;
              existing.timeMs  += stats.time_in_millis ?? 0;
              existing.failed  += stats.failed         ?? 0;
              existing.current += stats.current        ?? 0;
            } else {
              processorAggregates.set(existingKey, {
                type: proc[key]?.type ?? key.split('[')[0],
                tag: key.includes('[') ? key.slice(key.indexOf('[') + 1, -1) : undefined,
                count:   stats.count          ?? 0,
                timeMs:  stats.time_in_millis ?? 0,
                failed:  stats.failed         ?? 0,
                current: stats.current        ?? 0,
              });
            }
          });
        }

        const processors = Array.from(processorAggregates.values());
        return response.ok({
          body: {
            pipelineId: req.params.id,
            count, timeMs, failed, current,
            avgLatencyMs: count > 0 ? Math.round((timeMs / count) * 100) / 100 : 0,
            failureRate:  count > 0 ? Math.round((failed / count) * 10000) / 100 : 0,
            processors,
          } as PipelineStatsResponse,
        });
      } catch (err: any) {
        if (err.statusCode === 404) return response.ok({ body: { pipelineId: req.params.id, count: 0, timeMs: 0, failed: 0, current: 0, avgLatencyMs: 0, failureRate: 0, processors: [] } });
        return response.customError({ statusCode: err.statusCode ?? 500, body: { message: err.message } });
      }
    }
  );
}
