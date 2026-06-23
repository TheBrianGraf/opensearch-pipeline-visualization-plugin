import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from 'reactflow';
import { EuiBadge } from '@elastic/eui';

export function FailureEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd }: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#bd271e"
        strokeWidth={2}
        strokeDasharray="6 3"
        markerEnd={markerEnd}
        style={{ animation: 'pv-dash 0.8s linear infinite' }}
      />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}>
          <EuiBadge color="danger" style={{ fontSize: 9 }}>on_failure</EuiBadge>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
