import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiPage, EuiPageBody, EuiPageContent, EuiPageHeader,
  EuiButton, EuiButtonEmpty, EuiTabbedContent, EuiSpacer,
} from '@elastic/eui';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { fetchIngestPipelines, deleteIngestPipeline } from '../../store/reducers/ingest_pipeline_reducer';
import { fetchSearchPipelines, deleteSearchPipeline } from '../../store/reducers/search_pipeline_reducer';
import { fetchIndexAssociations } from '../../store/reducers/index_assoc_reducer';
import { PipelineTable } from './pipeline_table';
import { LoadingErrorState } from '../../components/shared/loading_error_state';
import { getNotifications } from '../../services';

export function PipelineListPage() {
  const dispatch = useAppDispatch();
  const history = useHistory();
  const { summaries: ingestSummaries, loading: ingestLoading, error: ingestError } = useAppSelector(s => s.ingestPipeline);
  const { summaries: searchSummaries, loading: searchLoading, error: searchError } = useAppSelector(s => s.searchPipeline);

  useEffect(() => {
    dispatch(fetchIngestPipelines());
    dispatch(fetchSearchPipelines());
    dispatch(fetchIndexAssociations());
  }, [dispatch]);

  const mlSummaries = [...ingestSummaries, ...searchSummaries].filter(p => p.hasMLProcessors);

  const handleDelete = async (id: string, type: 'ingest' | 'search') => {
    const action = type === 'ingest' ? deleteIngestPipeline(id) : deleteSearchPipeline(id);
    const result = await dispatch(action);
    if ((result as any).error) {
      getNotifications().toasts.addError(new Error((result as any).error.message), { title: 'Delete failed' });
    } else {
      getNotifications().toasts.addSuccess(`Pipeline "${id}" deleted`);
    }
  };

  const tabs = [
    {
      id: 'ingest',
      name: `Ingest (${ingestSummaries.length})`,
      content: (
        <>
          <EuiSpacer />
          <LoadingErrorState loading={ingestLoading} error={ingestError} />
          <PipelineTable pipelines={ingestSummaries} loading={ingestLoading} onDelete={handleDelete} />
        </>
      ),
    },
    {
      id: 'search',
      name: `Search (${searchSummaries.length})`,
      content: (
        <>
          <EuiSpacer />
          <LoadingErrorState loading={searchLoading} error={searchError} />
          <PipelineTable pipelines={searchSummaries} loading={searchLoading} onDelete={handleDelete} />
        </>
      ),
    },
    {
      id: 'ml',
      name: `ML / Neural (${mlSummaries.length})`,
      content: (
        <>
          <EuiSpacer />
          <PipelineTable pipelines={mlSummaries} loading={ingestLoading || searchLoading} onDelete={handleDelete} />
        </>
      ),
    },
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="All Pipelines"
          rightSideItems={[
            <EuiButton key="ecosystem" onClick={() => history.push('/pipeline-visualizer/ecosystem')}>
              Ecosystem Map
            </EuiButton>,
            <EuiButton key="create-ingest" fill onClick={() => history.push('/pipeline-visualizer/editor/ingest')}>
              Create Ingest Pipeline
            </EuiButton>,
            <EuiButton key="create-search" onClick={() => history.push('/pipeline-visualizer/editor/search')}>
              Create Search Pipeline
            </EuiButton>,
            <EuiButtonEmpty key="home" iconType="home" onClick={() => history.push('/pipeline-visualizer')}>
              Start Here
            </EuiButtonEmpty>,
            <EuiButtonEmpty key="demo" iconType="beaker" onClick={() => history.push('/pipeline-visualizer/demo')}>
              Demo Data
            </EuiButtonEmpty>,
          ]}
          bottomBorder
        />
        <EuiPageContent>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
