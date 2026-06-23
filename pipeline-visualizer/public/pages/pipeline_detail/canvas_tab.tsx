import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { OsIngestPipeline, OsSearchPipeline } from '../../../common';
import { ingestPipelineToFlow, searchPipelineToFlow } from '../../models/pipeline_to_flow';
import { PV_NODE_TYPES } from '../../components/nodes';
import { PV_EDGE_TYPES } from '../../components/edges';

interface Props {
  pipelineId: string;
  pipelineType: 'ingest' | 'search';
  pipeline: OsIngestPipeline | OsSearchPipeline;
}

export function CanvasTab({ pipelineId, pipelineType, pipeline }: Props) {
  const { nodes, edges } = useMemo(() => {
    if (pipelineType === 'ingest') {
      return ingestPipelineToFlow(pipelineId, pipeline as OsIngestPipeline);
    }
    return searchPipelineToFlow(pipelineId, pipeline as OsSearchPipeline);
  }, [pipelineId, pipelineType, pipeline]);

  return (
    <div style={{ width: '100%', height: 600, border: '1px solid #d3d3d3', borderRadius: 4 }}>
      <style>{`
        @keyframes pv-dash {
          to { stroke-dashoffset: -18; }
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={PV_NODE_TYPES}
        edgeTypes={PV_EDGE_TYPES}
        fitView
        minZoom={0.1}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
