import React, { useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { EuiPage, EuiPageBody, EuiPageContent, EuiTabbedContent, EuiSpacer } from '@elastic/eui';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { fetchIngestPipeline, deleteIngestPipeline } from '../../store/reducers/ingest_pipeline_reducer';
import { fetchSearchPipeline, deleteSearchPipeline } from '../../store/reducers/search_pipeline_reducer';
import { fetchIndexAssociations } from '../../store/reducers/index_assoc_reducer';
import { fetchMlModels } from '../../store/reducers/ml_model_reducer';
import { PipelineHeader } from '../../components/shared/pipeline_header';
import { LoadingErrorState } from '../../components/shared/loading_error_state';
import { PrerequisitesPanel } from '../../components/prerequisites_panel';
import { CanvasTab } from './canvas_tab';
import { JsonTab } from './json_tab';
import { IndexAssocTab } from './index_assoc_tab';
import { SimulateTab } from './simulate_tab';
import { getNotifications } from '../../services';

interface RouteParams { id: string; }
interface Props { pipelineType: 'ingest' | 'search'; }

export function PipelineDetailPage({ pipelineType }: Props) {
  const { id } = useParams<RouteParams>();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const ingestState = useAppSelector(s => s.ingestPipeline);
  const searchState = useAppSelector(s => s.searchPipeline);
  const indexAssocState = useAppSelector(s => s.indexAssoc);
  const mlModels = useAppSelector(s => s.mlModel.models);

  const loading = pipelineType === 'ingest' ? ingestState.loading : searchState.loading;
  const error = pipelineType === 'ingest' ? ingestState.error : searchState.error;
  const pipeline = pipelineType === 'ingest' ? ingestState.pipelines[id] : searchState.pipelines[id];

  const summaries = pipelineType === 'ingest' ? ingestState.summaries : searchState.summaries;
  const summary = summaries.find(s => s.id === id);

  useEffect(() => {
    if (pipelineType === 'ingest') dispatch(fetchIngestPipeline(id));
    else dispatch(fetchSearchPipeline(id));
    dispatch(fetchIndexAssociations());
    dispatch(fetchMlModels());
  }, [id, pipelineType, dispatch]);

  const handleDelete = async () => {
    const action = pipelineType === 'ingest' ? deleteIngestPipeline(id) : deleteSearchPipeline(id);
    const result = await dispatch(action);
    if ((result as any).error) {
      getNotifications().toasts.addError(new Error((result as any).error.message), { title: 'Delete failed' });
    } else {
      getNotifications().toasts.addSuccess(`Pipeline "${id}" deleted`);
      history.push('/pipeline-visualizer/pipelines');
    }
  };

  const tabs = pipeline
    ? [
        {
          id: 'canvas',
          name: 'Visual Flow',
          content: (
            <>
              <EuiSpacer />
              <CanvasTab pipelineId={id} pipelineType={pipelineType} pipeline={pipeline} />
            </>
          ),
        },
        {
          id: 'json',
          name: 'JSON',
          content: <><EuiSpacer /><JsonTab pipeline={pipeline} /></>,
        },
        {
          id: 'indices',
          name: 'Associated Indices',
          content: <><EuiSpacer /><IndexAssocTab pipelineId={id} /></>,
        },
        {
          id: 'prerequisites',
          name: 'Prerequisites',
          content: (
            <>
              <EuiSpacer />
              <PrerequisitesPanel
                pipelineId={id}
                pipelineType={pipelineType}
                pipeline={pipeline}
                indexAssociations={indexAssocState}
                mlModels={mlModels}
              />
            </>
          ),
        },
        ...(pipelineType === 'ingest'
          ? [
              {
                id: 'simulate',
                name: 'Simulate',
                content: (
                  <>
                    <EuiSpacer />
                    <SimulateTab pipelineId={id} />
                  </>
                ),
              },
            ]
          : []),
      ]
    : [];

  return (
    <EuiPage>
      <EuiPageBody>
        <PipelineHeader
          pipelineId={id}
          pipelineType={pipelineType}
          hasML={summary?.hasMLProcessors}
          onDelete={handleDelete}
        />
        <EuiPageContent>
          <LoadingErrorState loading={loading} error={error} />
          {tabs.length > 0 && <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />}
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
