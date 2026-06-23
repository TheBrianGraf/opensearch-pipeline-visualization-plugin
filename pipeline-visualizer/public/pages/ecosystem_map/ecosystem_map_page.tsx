import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiButton,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { fetchIngestPipelines } from '../../store/reducers/ingest_pipeline_reducer';
import { fetchSearchPipelines } from '../../store/reducers/search_pipeline_reducer';
import { fetchMlModels } from '../../store/reducers/ml_model_reducer';
import { fetchIndexSettings } from '../../store/reducers/index_settings_reducer';
import { PipelineSummary, IndexPipelineSettings, MlModel } from '../../../common';

// ── Node data shapes ──────────────────────────────────────────────────────────

interface EcoIngestData { label: string; processorCount: number; hasML: boolean; pipelineId: string; }
interface EcoSearchData { label: string; processorCount: number; hasML: boolean; pipelineId: string; }
interface EcoIndexData { indexName: string; }
interface EcoModelData { modelName: string; state: string; }

// ── Shared node style ─────────────────────────────────────────────────────────

const nodeBase: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  minWidth: 160,
  fontSize: 12,
  cursor: 'pointer',
  color: 'white',
  fontFamily: 'inherit',
};

// ── Custom node components ────────────────────────────────────────────────────

function EcoIngestNode({ data }: NodeProps<EcoIngestData>) {
  return (
    <div style={{ ...nodeBase, background: '#006BB4' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{data.label}</div>
      <div style={{ opacity: 0.85 }}>{data.processorCount} processor{data.processorCount !== 1 ? 's' : ''}</div>
      {data.hasML && (
        <span style={{
          display: 'inline-block', marginTop: 4, padding: '1px 6px',
          background: '#9B59B6', borderRadius: 4, fontSize: 10, fontWeight: 700,
        }}>ML</span>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />
    </div>
  );
}

function EcoSearchNode({ data }: NodeProps<EcoSearchData>) {
  return (
    <div style={{ ...nodeBase, background: '#6F42C1' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{data.label}</div>
      <div style={{ opacity: 0.85 }}>{data.processorCount} processor{data.processorCount !== 1 ? 's' : ''}</div>
      {data.hasML && (
        <span style={{
          display: 'inline-block', marginTop: 4, padding: '1px 6px',
          background: '#E8559B', borderRadius: 4, fontSize: 10, fontWeight: 700,
        }}>ML</span>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />
    </div>
  );
}

function EcoIndexNode({ data }: NodeProps<EcoIndexData>) {
  return (
    <div style={{ ...nodeBase, background: '#017D73' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff' }} />
      <div style={{ fontSize: 9, opacity: 0.8, letterSpacing: 1, marginBottom: 2 }}>INDEX</div>
      <div style={{ fontWeight: 600 }}>{data.indexName}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />
    </div>
  );
}

function EcoModelNode({ data }: NodeProps<EcoModelData>) {
  const isDeployed = data.state === 'DEPLOYED';
  return (
    <div style={{ ...nodeBase, background: isDeployed ? '#D4A017' : '#888' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff' }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{data.modelName}</div>
      <span style={{
        display: 'inline-block', padding: '1px 6px',
        background: isDeployed ? '#A67C00' : '#666',
        borderRadius: 4, fontSize: 10,
      }}>{data.state}</span>
      <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  ecoIngest: EcoIngestNode,
  ecoSearch: EcoSearchNode,
  ecoIndex: EcoIndexNode,
  ecoModel: EcoModelNode,
};

// ── Graph builder ─────────────────────────────────────────────────────────────

function buildGraph(
  ingestPipelines: PipelineSummary[],
  searchPipelines: PipelineSummary[],
  indices: IndexPipelineSettings[],
  mlModels: MlModel[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  ingestPipelines.forEach(p => {
    nodes.push({
      id: `ingest__${p.id}`,
      type: 'ecoIngest',
      position: { x: 0, y: 0 },
      data: { label: p.id, processorCount: p.processorCount, hasML: p.hasMLProcessors, pipelineId: p.id },
    });
  });

  searchPipelines.forEach(p => {
    nodes.push({
      id: `search__${p.id}`,
      type: 'ecoSearch',
      position: { x: 0, y: 0 },
      data: { label: p.id, processorCount: p.processorCount, hasML: p.hasMLProcessors, pipelineId: p.id },
    });
  });

  indices.forEach(idx => {
    nodes.push({
      id: `index__${idx.indexName}`,
      type: 'ecoIndex',
      position: { x: 0, y: 0 },
      data: { indexName: idx.indexName },
    });
    if (idx.defaultPipeline) {
      const targetId = `ingest__${idx.defaultPipeline}`;
      if (nodes.some(n => n.id === targetId)) {
        edges.push({
          id: `e_${idx.indexName}_default`,
          source: `index__${idx.indexName}`,
          target: targetId,
          label: 'default',
          animated: true,
          style: { stroke: '#006BB4' },
          labelStyle: { fontSize: 10, fill: '#006BB4' },
          labelBgStyle: { fill: '#fff', opacity: 0.8 },
        });
      }
    }
    if (idx.finalPipeline) {
      const targetId = `ingest__${idx.finalPipeline}`;
      if (nodes.some(n => n.id === targetId)) {
        edges.push({
          id: `e_${idx.indexName}_final`,
          source: `index__${idx.indexName}`,
          target: targetId,
          label: 'final',
          animated: false,
          style: { stroke: '#004B84', strokeDasharray: '5,5' },
          labelStyle: { fontSize: 10, fill: '#004B84' },
          labelBgStyle: { fill: '#fff', opacity: 0.8 },
        });
      }
    }
    if (idx.searchPipeline) {
      const targetId = `search__${idx.searchPipeline}`;
      if (nodes.some(n => n.id === targetId)) {
        edges.push({
          id: `e_${idx.indexName}_search`,
          source: `index__${idx.indexName}`,
          target: targetId,
          label: 'search',
          animated: true,
          style: { stroke: '#6F42C1' },
          labelStyle: { fontSize: 10, fill: '#6F42C1' },
          labelBgStyle: { fill: '#fff', opacity: 0.8 },
        });
      }
    }
  });

  mlModels.forEach(m => {
    nodes.push({
      id: `model__${m.id}`,
      type: 'ecoModel',
      position: { x: 0, y: 0 },
      data: { modelName: m.name || m.id, state: m.state },
    });
  });

  // Apply Dagre layout
  if (nodes.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 120 });
    nodes.forEach(n => g.setNode(n.id, { width: 180, height: 70 }));
    edges.forEach(e => g.setEdge(e.source, e.target));
    dagre.layout(g);
    nodes.forEach(n => {
      const pos = g.node(n.id);
      if (pos) {
        n.position = { x: pos.x - 90, y: pos.y - 35 };
      }
    });
  }

  return { nodes, edges };
}

// ── Main page component ───────────────────────────────────────────────────────

export function EcosystemMapPage() {
  const dispatch = useAppDispatch();
  const history = useHistory();

  const ingestState = useAppSelector(s => s.ingestPipeline);
  const searchState = useAppSelector(s => s.searchPipeline);
  const mlState = useAppSelector(s => s.mlModel);
  const indexState = useAppSelector(s => s.indexSettings);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    dispatch(fetchIngestPipelines());
    dispatch(fetchSearchPipelines());
    dispatch(fetchMlModels());
    dispatch(fetchIndexSettings());
  }, [dispatch]);

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(
      ingestState.summaries,
      searchState.summaries,
      indexState.indices,
      mlState.models,
    );
    setNodes(n);
    setEdges(e);
  }, [ingestState.summaries, searchState.summaries, indexState.indices, mlState.models, setNodes, setEdges]);

  const isLoading = ingestState.loading || searchState.loading || mlState.loading || indexState.loading;
  const isEmpty =
    !isLoading &&
    ingestState.summaries.length === 0 &&
    searchState.summaries.length === 0 &&
    indexState.indices.length === 0 &&
    mlState.models.length === 0;

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('ingest__')) {
      const id = node.id.replace('ingest__', '');
      history.push(`/pipeline-visualizer/ingest/${encodeURIComponent(id)}`);
    } else if (node.id.startsWith('search__')) {
      const id = node.id.replace('search__', '');
      history.push(`/pipeline-visualizer/search/${encodeURIComponent(id)}`);
    }
  }, [history]);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="Ecosystem Map"
          description="All pipelines, indices, and ML models in your cluster"
          rightSideItems={[
            <EuiButton key="list" onClick={() => history.push('/pipeline-visualizer/pipelines')}>
              View Pipelines List
            </EuiButton>,
            <EuiButton key="create-search" onClick={() => history.push('/pipeline-visualizer/editor/search')}>
              Create Search Pipeline
            </EuiButton>,
            <EuiButton key="create-ingest" fill onClick={() => history.push('/pipeline-visualizer/editor/ingest')}>
              Create Ingest Pipeline
            </EuiButton>,
          ]}
          bottomBorder
        />
        <EuiPageContent>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
              <EuiLoadingSpinner size="xl" />
            </div>
          ) : isEmpty ? (
            <EuiEmptyPrompt
              title={<h2>No pipelines configured yet</h2>}
              body={<p>Create your first pipeline to get started. Pipelines transform documents on ingest or enhance search results.</p>}
              actions={[
                <EuiButton key="ingest" fill onClick={() => history.push('/pipeline-visualizer/editor/ingest')}>
                  Create Ingest Pipeline
                </EuiButton>,
                <EuiButton key="search" onClick={() => history.push('/pipeline-visualizer/editor/search')}>
                  Create Search Pipeline
                </EuiButton>,
              ]}
            />
          ) : (
            <div style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.2 }}
              >
                <Background />
                <Controls />
                <MiniMap nodeColor={(n) => {
                  if (n.type === 'ecoIngest') return '#006BB4';
                  if (n.type === 'ecoSearch') return '#6F42C1';
                  if (n.type === 'ecoIndex') return '#017D73';
                  if (n.type === 'ecoModel') return (n.data as EcoModelData).state === 'DEPLOYED' ? '#D4A017' : '#888';
                  return '#ccc';
                }} />
              </ReactFlow>
            </div>
          )}
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
