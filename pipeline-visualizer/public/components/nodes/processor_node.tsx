import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { EuiBadge, EuiText } from '@elastic/eui';
import { PvNodeData } from '../../models/pipeline_to_flow';

export function ProcessorNode({ data, selected }: NodeProps<PvNodeData>) {
  return (
    <div style={{
      background: selected ? '#e6f0ff' : '#fff',
      border: `2px solid ${selected ? '#0071c2' : '#d3d3d3'}`,
      borderRadius: 6,
      padding: '8px 12px',
      minWidth: 160,
      maxWidth: 220,
      fontSize: 12,
      boxShadow: selected ? '0 0 0 2px rgba(0,113,194,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: data.condition ? 2 : 0 }}>
        <EuiText size="xs"><strong>{data.label}</strong></EuiText>
        {data.isMl && <EuiBadge color="accent" style={{ fontSize: 10 }}>ML</EuiBadge>}
      </div>
      {data.condition && (
        <div style={{ color: '#c55a00', fontFamily: 'monospace', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
          if: {data.condition}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </div>
  );
}
