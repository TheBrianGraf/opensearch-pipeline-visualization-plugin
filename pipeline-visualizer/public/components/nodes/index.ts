export { ProcessorNode } from './processor_node';
export { ConditionalDiamondNode } from './conditional_diamond_node';
export { OnFailureNode } from './on_failure_node';
export { PipelineInputNode } from './pipeline_input_node';
import { ProcessorNode } from './processor_node';
import { ConditionalDiamondNode } from './conditional_diamond_node';
import { OnFailureNode } from './on_failure_node';
import { PipelineInputNode } from './pipeline_input_node';
import { NodeTypes } from 'reactflow';

export const PV_NODE_TYPES: NodeTypes = {
  processorNode: ProcessorNode,
  conditionalDiamond: ConditionalDiamondNode,
  onFailureNode: OnFailureNode,
  pipelineInput: PipelineInputNode,
};
