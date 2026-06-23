import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import ReactFlow, {
  Background, Controls, addEdge,
  useNodesState, useEdgesState, Connection,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { EuiPage, EuiPageBody, EuiPageHeader, EuiButton, EuiButtonEmpty,
  EuiFieldText, EuiFormRow } from '@elastic/eui';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { fetchIngestPipeline, saveIngestPipeline } from '../../store/reducers/ingest_pipeline_reducer';
import { fetchSearchPipeline, saveSearchPipeline } from '../../store/reducers/search_pipeline_reducer';
import { PV_NODE_TYPES } from '../../components/nodes';
import { PV_EDGE_TYPES } from '../../components/edges';
import { ProcessorPalette } from './processor_palette';
import { ProcessorConfigPanel } from './processor_config_panel';
import { ingestPipelineToFlow, flowToIngestPipeline, flowToSearchPipeline, PvFlowNode, PvFlowEdge } from '../../models/pipeline_to_flow';
import { searchPipelineToFlow } from '../../models/pipeline_to_flow';
import { getNotifications } from '../../services';

interface RouteParams { type: string; id?: string; }

export function PipelineEditorPage() {
  const { type: pipelineType, id: existingId } = useParams<RouteParams>();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<PvFlowNode['data']>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<PvFlowEdge['data']>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pipelineId, setPipelineId] = useState(existingId ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingId) {
      if (pipelineType === 'ingest') {
        dispatch(fetchIngestPipeline(existingId)).then((result: any) => {
          const pipeline = result.payload?.pipeline;
          if (pipeline) {
            const { nodes: n, edges: e } = ingestPipelineToFlow(existingId, pipeline);
            setNodes(n as any);
            setEdges(e as any);
          }
        });
      } else {
        dispatch(fetchSearchPipeline(existingId)).then((result: any) => {
          const pipeline = result.payload?.pipeline;
          if (pipeline) {
            const { nodes: n, edges: e } = searchPipelineToFlow(existingId, pipeline);
            setNodes(n as any);
            setEdges(e as any);
          }
        });
      }
    } else {
      // New pipeline: add input/output bookend nodes
      setNodes([
        { id: 'input', type: 'pipelineInput', position: { x: 50, y: 200 }, data: { label: pipelineType === 'ingest' ? 'Document' : 'Search Request', processorType: '__input__', config: {} } },
        { id: 'output', type: 'pipelineInput', position: { x: 500, y: 200 }, data: { label: pipelineType === 'ingest' ? 'Index' : 'Search Response', processorType: '__output__', config: {} } },
      ] as any);
    }
  }, [existingId, pipelineType]); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, data: { edgeKind: 'normal' } }, eds));
  }, [setEdges]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const processorType = event.dataTransfer.getData('processorType');
    if (!processorType || !reactFlowWrapper.current || !rfInstance) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = rfInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    const newNode: PvFlowNode = {
      id: `proc-${Date.now()}`,
      type: 'processorNode',
      position,
      data: { label: processorType, processorType, config: {} },
    };
    setNodes(ns => [...ns, newNode as any]);
  }, [rfInstance, setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const selectedNode = selectedNodeId ? (nodes as PvFlowNode[]).find(n => n.id === selectedNodeId) : null;

  const handleNodeChange = (id: string, data: Partial<PvFlowNode['data']>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n) as any);
  };

  const handleSave = async () => {
    if (!pipelineId.trim()) {
      getNotifications().toasts.addWarning('Please enter a pipeline ID');
      return;
    }
    setSaving(true);
    try {
      if (pipelineType === 'ingest') {
        const body = flowToIngestPipeline(nodes as PvFlowNode[], edges as PvFlowEdge[]);
        const result = await dispatch(saveIngestPipeline({ id: pipelineId, body }));
        if ((result as any).error) throw new Error((result as any).error.message);
      } else {
        const body = flowToSearchPipeline(nodes as PvFlowNode[], edges as PvFlowEdge[]);
        const result = await dispatch(saveSearchPipeline({ id: pipelineId, body }));
        if ((result as any).error) throw new Error((result as any).error.message);
      }
      getNotifications().toasts.addSuccess(`Pipeline "${pipelineId}" saved`);
      history.push(`/pipeline-visualizer/${pipelineType}/${encodeURIComponent(pipelineId)}`);
    } catch (err: any) {
      getNotifications().toasts.addError(err, { title: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle={existingId ? `Edit: ${existingId}` : `New ${pipelineType} pipeline`}
          rightSideItems={[
            <EuiButton key="save" fill onClick={handleSave} isLoading={saving}>Save</EuiButton>,
            <EuiButtonEmpty key="cancel" onClick={() => history.goBack()}>Cancel</EuiButtonEmpty>,
          ]}
          bottomBorder
        />

        <div style={{ padding: '16px 0' }}>
          <EuiFormRow label="Pipeline ID" style={{ maxWidth: 400 }}>
            <EuiFieldText
              value={pipelineId}
              onChange={e => setPipelineId(e.target.value)}
              disabled={!!existingId}
              placeholder="my-pipeline"
            />
          </EuiFormRow>
        </div>

        <div style={{ display: 'flex', gap: 8, height: 'calc(100vh - 280px)', minHeight: 500 }}>
          <ProcessorPalette pipelineType={pipelineType as 'ingest' | 'search'} />

          <div ref={reactFlowWrapper} style={{ flex: 1, border: '1px solid #d3d3d3', borderRadius: 4 }}>
            <style>{`
              @keyframes pv-dash { to { stroke-dashoffset: -18; } }
            `}</style>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onInit={setRfInstance}
              onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              nodeTypes={PV_NODE_TYPES}
              edgeTypes={PV_EDGE_TYPES}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>

          {selectedNode && (
            <ProcessorConfigPanel node={selectedNode} onChange={handleNodeChange} />
          )}
        </div>
      </EuiPageBody>
    </EuiPage>
  );
}
