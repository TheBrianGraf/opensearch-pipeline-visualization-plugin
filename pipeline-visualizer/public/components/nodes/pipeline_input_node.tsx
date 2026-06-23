import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PvNodeData } from '../../models/pipeline_to_flow';

export function PipelineInputNode({ data }: NodeProps<PvNodeData>) {
  const isOutput = data.processorType === '__output__';
  return (
    <div style={{
      background: isOutput ? '#f5f5f5' : '#0071c2',
      color: isOutput ? '#333' : '#fff',
      borderRadius: 24,
      padding: '6px 16px',
      fontSize: 12,
      fontWeight: 600,
      minWidth: 100,
      textAlign: 'center',
    }}>
      {!isOutput && <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />}
      {isOutput && <Handle type="target" position={Position.Left} style={{ background: '#888' }} />}
      {data.label}
    </div>
  );
}
