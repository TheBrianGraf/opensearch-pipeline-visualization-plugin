import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactFlow, { Handle, Position, Background, Controls, Node } from 'reactflow';
import {
  EuiPanel,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiSwitch,
} from '@elastic/eui';
import { routeService } from '../../route_service';
import { OsIngestPipeline, OsSearchPipeline } from '../../common';
import { ingestPipelineToFlow, searchPipelineToFlow } from '../../models/pipeline_to_flow';
import { PipelineInputNode } from '../../components/nodes/pipeline_input_node';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface PrevReading {
  count: number;
  capturedAt: number;
}

interface Props {
  pipelineId: string;
  pipelineType: 'ingest' | 'search';
  pipeline: OsIngestPipeline | OsSearchPipeline;
}

// ── Heat helpers ──────────────────────────────────────────────────────────────

function heatColor(pct: number): string {
  if (pct < 10) return '#54b399';
  if (pct < 25) return '#d6bf57';
  if (pct < 50) return '#da8b45';
  return '#e7664c';
}

function latencyColor(ms: number): 'success' | 'warning' | 'danger' | 'default' {
  if (ms === 0) return 'default';
  if (ms < 5) return 'success';
  if (ms < 50) return 'warning';
  return 'danger';
}

function failureColor(rate: number): 'success' | 'warning' | 'danger' {
  if (rate === 0) return 'success';
  if (rate < 1) return 'warning';
  return 'danger';
}

// ── Performance processor node ────────────────────────────────────────────────

function PerformanceProcessorNode({ data }: { data: any }) {
  const perf: ProcessorStats | undefined = data.perfStats;
  const pct: number = data.pctOfTotal ?? 0;
  const isBottleneck: boolean = data.isBottleneck ?? false;
  const color = heatColor(pct);
  const avgMs = perf && perf.count > 0 ? Math.round((perf.timeMs / perf.count) * 100) / 100 : 0;

  return (
    <div
      style={{
        width: 240,
        minHeight: 110,
        background: perf ? `${color}18` : '#ffffff',
        border: `2px solid ${perf ? color : '#d3dae6'}`,
        borderRadius: 8,
        padding: '8px 10px',
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontSize: 12,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#69707d' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#69707d' }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontWeight: 600, color: '#1a1c21', fontSize: 13, letterSpacing: 0.1 }}>
          {data.processorType ?? data.label ?? 'processor'}
          {data.tag ? <span style={{ color: '#69707d', fontWeight: 400 }}> [{data.tag}]</span> : null}
        </span>
        {isBottleneck && (
          <span title="Bottleneck — highest share of pipeline time" style={{ fontSize: 16, lineHeight: 1 }}>
            🔥
          </span>
        )}
      </div>

      <div style={{ height: 1, background: '#d3dae6', marginBottom: 6 }} />

      {perf ? (
        <>
          {/* Calls + avg */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#343741', marginBottom: 4 }}>
            <span>{perf.count.toLocaleString()} calls</span>
            <span style={{ color: heatColor(pct), fontWeight: 600 }}>{avgMs} ms avg</span>
          </div>

          {/* Heat bar */}
          <svg width="100%" height={6} style={{ display: 'block', margin: '2px 0 5px' }}>
            <rect x={0} y={0} width="100%" height={6} fill="#f0f0f0" rx={3} />
            <rect x={0} y={0} width={`${Math.min(pct, 100)}%`} height={6} fill={color} rx={3} />
          </svg>
          <div style={{ color: '#69707d', fontSize: 11, marginBottom: 3 }}>
            {pct.toFixed(1)}% of pipeline time
          </div>

          {/* Failure row */}
          {perf.failed > 0 ? (
            <div style={{ color: '#e7664c', fontSize: 11, fontWeight: 600 }}>
              ⚠ {perf.failed.toLocaleString()} failed
            </div>
          ) : (
            <div style={{ color: '#54b399', fontSize: 11 }}>✓ 0 failures</div>
          )}
        </>
      ) : (
        <div style={{ color: '#69707d', fontSize: 11, fontStyle: 'italic', marginTop: 8 }}>
          No stats available
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PerformanceTab({ pipelineId, pipelineType, pipeline }: Props) {
  const [stats, setStats] = useState<PipelineStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const prevReadingRef = useRef<PrevReading | null>(null);
  const [throughput, setThroughput] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await routeService.getPipelineStats(pipelineType, pipelineId);
      const now = Date.now();

      // Compute throughput from delta between readings
      if (prevReadingRef.current) {
        const deltaDocs = data.count - prevReadingRef.current.count;
        const deltaSec = (now - prevReadingRef.current.capturedAt) / 1000;
        if (deltaSec > 0 && deltaDocs >= 0) {
          setThroughput(Math.round((deltaDocs / deltaSec) * 10) / 10);
        }
      }
      prevReadingRef.current = { count: data.count, capturedAt: now };
      setStats(data);
      setLastUpdated(now);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [pipelineId, pipelineType]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchStats]);

  // "X seconds ago" ticker
  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Build heat-augmented React Flow graph
  const { nodes, edges } = useMemo(() => {
    const base = pipelineType === 'ingest'
      ? ingestPipelineToFlow(pipelineId, pipeline as OsIngestPipeline)
      : searchPipelineToFlow(pipelineId, pipeline as OsSearchPipeline);
    if (!stats || !stats.processors.length) return base;

    const maxTime = Math.max(...stats.processors.map((p) => p.timeMs), 1);
    let procIdx = 0;

    const augmented = base.nodes.map((node: Node) => {
      const isProc =
        node.type === 'processorNode' ||
        node.type === 'conditionalDiamond' ||
        node.type === 'onFailureNode';

      if (!isProc) return node;

      const proc = stats.processors[procIdx];
      procIdx++;

      if (!proc) return node;

      const pct = stats.timeMs > 0 ? (proc.timeMs / stats.timeMs) * 100 : 0;
      const isBottleneck = proc.timeMs === maxTime && proc.timeMs > 0;

      return {
        ...node,
        data: {
          ...node.data,
          perfStats: proc,
          pctOfTotal: pct,
          isBottleneck,
        },
      };
    });

    return { nodes: augmented, edges: base.edges };
  }, [pipeline, pipelineId, pipelineType, stats]);

  const nodeTypes = useMemo(
    () => ({
      processorNode: PerformanceProcessorNode,
      conditionalDiamond: PerformanceProcessorNode,
      onFailureNode: PerformanceProcessorNode,
      pipelineInput: PipelineInputNode,
    }),
    []
  );

  return (
    <div>
      {/* ── Header row ── */}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="refresh"
                size="s"
                onClick={() => { setLoading(true); fetchStats(); }}
                isDisabled={loading}
              >
                Refresh
              </EuiButtonEmpty>
            </EuiFlexItem>
            {lastUpdated && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  Updated {secondsAgo}s ago
                  {autoRefresh && loading && (
                    <EuiLoadingSpinner size="s" style={{ marginLeft: 6 }} />
                  )}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                Stats cumulative since node start
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label="Auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                compressed
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* ── Summary cards ── */}
      {stats && (
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
              <EuiStat
                title={stats.count.toLocaleString()}
                description="Documents Processed"
                titleColor="default"
                titleSize="m"
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
              <EuiStat
                title={`${stats.avgLatencyMs} ms`}
                description="Avg Latency / Doc"
                titleColor={latencyColor(stats.avgLatencyMs)}
                titleSize="m"
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
              <EuiStat
                title={throughput !== null ? `${throughput} /s` : '—'}
                description="Est. Throughput"
                titleColor={throughput !== null ? 'default' : 'subdued'}
                titleSize="m"
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
              <EuiStat
                title={`${stats.failureRate}%`}
                description="Failure Rate"
                titleColor={failureColor(stats.failureRate)}
                titleSize="m"
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
              <EuiStat
                title={String(stats.current)}
                description="In Flight"
                titleColor={stats.current > 0 ? 'warning' : 'default'}
                titleSize="m"
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <EuiSpacer size="m" />

      {/* ── Callouts ── */}
      {error && (
        <>
          <EuiCallOut color="danger" title="Failed to load stats" iconType="alert">
            <p>{error}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {stats && stats.count === 0 && !error && (
        <>
          <EuiCallOut color="primary" title="No traffic yet" iconType="iInCircle">
            <p>
              This pipeline hasn&apos;t processed any documents since the node last started. Index
              some documents or run the <strong>Simulate</strong> tab to generate traffic.
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {/* ── Heat-map canvas ── */}
      <div style={{ height: 500, position: 'relative', border: '1px solid #d3dae6', borderRadius: 6, overflow: 'hidden' }}>
        {loading && !stats && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.8)',
              zIndex: 10,
            }}
          >
            <EuiLoadingSpinner size="xl" />
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          zoomOnScroll={false}
        >
          <Background gap={16} color="#eef0f3" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued" textAlign="right">
        🔥 = bottleneck processor &nbsp;|&nbsp; Bar width = share of total pipeline time
      </EuiText>
    </div>
  );
}
