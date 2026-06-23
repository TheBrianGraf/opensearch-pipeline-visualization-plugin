import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { EuiText } from '@elastic/eui';
import { PvNodeData } from '../../models/pipeline_to_flow';

export function OnFailureNode({ data, selected }: NodeProps<PvNodeData>) {
  return (
    <div style={{
      background: selected ? '#fff0f0' : '#fff5f5',
      border: `2px solid ${selected ? '#bd271e' : '#e7969c'}`,
      borderLeft: '4px solid #bd271e',
      borderRadius: 6,
      padding: '8px 12px',
      minWidth: 160,
      maxWidth: 220,
      fontSize: 12,
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#bd271e' }} />
      <EuiText size="xs"><strong>{data.label}</strong></EuiText>
      <div style={{ color: '#bd271e', fontSize: 10 }}>on_failure</div>
      <Handle type="source" position={Position.Right} style={{ background: '#bd271e' }} />
    </div>
  );
}
