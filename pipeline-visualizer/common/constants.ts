export const PLUGIN_ID = 'pipelineVisualizer';
export const PLUGIN_NAME = 'Pipeline Visualizer';

export const BASE_NODE_API_PATH = '/api/pipeline_visualizer';
export const INGEST_NODE_API_PATH = `${BASE_NODE_API_PATH}/ingest`;
export const SEARCH_NODE_API_PATH = `${BASE_NODE_API_PATH}/search`;
export const INDEX_ASSOC_NODE_API_PATH = `${BASE_NODE_API_PATH}/indices/associations`;
export const ML_NODE_API_PATH = `${BASE_NODE_API_PATH}/ml/models`;
export const INDICES_NODE_API_PATH = `${BASE_NODE_API_PATH}/indices`;

export const ML_PROCESSOR_TYPES: readonly string[] = Object.freeze([
  'ml_inference',
  'text_embedding',
  'sparse_encoding',
  'text_chunking',
  'neural_sparse',
  'text_similarity_scoring',
]);
