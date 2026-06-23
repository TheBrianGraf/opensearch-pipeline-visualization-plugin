import {
  INGEST_NODE_API_PATH,
  SEARCH_NODE_API_PATH,
  INDEX_ASSOC_NODE_API_PATH,
  ML_NODE_API_PATH,
  INDICES_NODE_API_PATH,
} from '../common';
import {
  OsIngestPipeline,
  OsSearchPipeline,
  PipelineSummary,
  IndexAssociationResponse,
  MlModel,
  IndexPipelineSettings,
} from '../common';
import { getHttp } from './services';

export class RouteService {
  async listIngestPipelines(): Promise<PipelineSummary[]> {
    return getHttp().get<PipelineSummary[]>(INGEST_NODE_API_PATH);
  }
  async getIngestPipeline(id: string): Promise<OsIngestPipeline> {
    return getHttp().get<OsIngestPipeline>(`${INGEST_NODE_API_PATH}/${encodeURIComponent(id)}`);
  }
  async saveIngestPipeline(id: string, body: OsIngestPipeline): Promise<void> {
    return getHttp().put(`${INGEST_NODE_API_PATH}/${encodeURIComponent(id)}`, { body: JSON.stringify(body) });
  }
  async deleteIngestPipeline(id: string): Promise<void> {
    return getHttp().delete(`${INGEST_NODE_API_PATH}/${encodeURIComponent(id)}`);
  }

  async listSearchPipelines(): Promise<PipelineSummary[]> {
    return getHttp().get<PipelineSummary[]>(SEARCH_NODE_API_PATH);
  }
  async getSearchPipeline(id: string): Promise<OsSearchPipeline> {
    return getHttp().get<OsSearchPipeline>(`${SEARCH_NODE_API_PATH}/${encodeURIComponent(id)}`);
  }
  async saveSearchPipeline(id: string, body: OsSearchPipeline): Promise<void> {
    return getHttp().put(`${SEARCH_NODE_API_PATH}/${encodeURIComponent(id)}`, { body: JSON.stringify(body) });
  }
  async deleteSearchPipeline(id: string): Promise<void> {
    return getHttp().delete(`${SEARCH_NODE_API_PATH}/${encodeURIComponent(id)}`);
  }

  async getIndexAssociations(): Promise<IndexAssociationResponse> {
    return getHttp().get<IndexAssociationResponse>(INDEX_ASSOC_NODE_API_PATH);
  }

  async listMlModels(): Promise<MlModel[]> {
    return getHttp().get<MlModel[]>(ML_NODE_API_PATH);
  }

  async listIndicesWithPipelineSettings(): Promise<IndexPipelineSettings[]> {
    return getHttp().get<IndexPipelineSettings[]>(INDICES_NODE_API_PATH);
  }
}

export const routeService = new RouteService();
