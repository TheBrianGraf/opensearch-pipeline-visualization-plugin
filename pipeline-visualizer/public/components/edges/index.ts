export { FailureEdge } from './failure_edge';
export { ConditionalEdge } from './conditional_edge';
import { FailureEdge } from './failure_edge';
import { ConditionalEdge } from './conditional_edge';
import { EdgeTypes } from 'reactflow';
export const PV_EDGE_TYPES: EdgeTypes = {
  failureEdge: FailureEdge,
  conditionalEdge: ConditionalEdge,
};
