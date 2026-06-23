import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PvNodeData } from '../../models/pipeline_to_flow';

export function ConditionalDiamondNode({ data }: NodeProps<PvNodeData>) {
  return (
    <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 60, height: 60,
        transform: 'rotate(45deg)',
        background: '#fff7e6',
        border: '2px solid #f5a623',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ transform: 'rotate(-45deg)', fontSize: 11, fontWeight: 700, color: '#c55a00' }}>IF</span>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#f5a623', left: -4 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#f5a623', right: -4 }} />
    </div>
  );
}
