export interface OsProcessorConfig {
  tag?: string;
  description?: string;
  if?: string;
  ignore_failure?: boolean;
  on_failure?: OsProcessor[];
  [key: string]: unknown;
}
export type OsProcessor = Record<string, OsProcessorConfig>;

export interface OsIngestPipeline {
  description?: string;
  version?: number;
  processors?: OsProcessor[];
  on_failure?: OsProcessor[];
}
export interface OsSearchPipeline {
  version?: number;
  request_processors?: OsProcessor[];
  response_processors?: OsProcessor[];
  phase_results_processors?: OsProcessor[];
}

export type PipelineType = 'ingest' | 'search';
export interface PipelineSummary {
  id: string;
  type: PipelineType;
  description?: string;
  processorCount: number;
  hasMLProcessors: boolean;
  version?: number;
}

export type IndexAssocType = 'default' | 'final' | 'search';
export interface IndexAssociation {
  indexName: string;
  pipelineId: string;
  pipelineType: IndexAssocType;
}
export interface IndexAssociationResponse {
  byPipeline: Record<string, IndexAssociation[]>;
}
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

// ── ML Models ─────────────────────────────────────────────────────────────────
export type MlModelState =
  | 'DEPLOYED'
  | 'REGISTERED'
  | 'DEPLOYING'
  | 'UNDEPLOYED'
  | 'LOAD_FAILED'
  | 'DEPLOY_FAILED'
  | 'PARTIALLY_DEPLOYED';

export interface MlModel {
  id: string;
  name: string;
  description?: string;
  state: MlModelState;
  modelFormat?: string;
  algorithmName?: string;
  modelGroupId?: string;
}

// ── Index pipeline settings ───────────────────────────────────────────────────
export interface IndexPipelineSettings {
  indexName: string;
  defaultPipeline?: string;
  finalPipeline?: string;
  searchPipeline?: string;
}

// ── Full ecosystem snapshot ───────────────────────────────────────────────────
export interface EcosystemData {
  ingestPipelines: PipelineSummary[];
  searchPipelines: PipelineSummary[];
  indices: IndexPipelineSettings[];
  mlModels: MlModel[];
}

// ── Prerequisite checks ───────────────────────────────────────────────────────
export type CheckStatus = 'ok' | 'warning' | 'error' | 'unknown';
export interface PrerequisiteCheck {
  label: string;
  status: CheckStatus;
  detail?: string;
  action?: { label: string; apiSnippet?: string };
}
