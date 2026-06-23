import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { EuiBadge } from '@elastic/eui';

export function ConditionalEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#f5a623"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}>
          <EuiBadge color="warning" style={{ fontSize: 9 }}>conditional</EuiBadge>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
