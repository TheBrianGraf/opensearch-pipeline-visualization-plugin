import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiPage, EuiPageBody, EuiPageHeader, EuiPageContent,
  EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon, EuiSpacer,
  EuiTitle, EuiText, EuiCallOut, EuiCodeBlock, EuiButton,
  EuiButtonEmpty, EuiHorizontalRule, EuiDescriptionList,
  EuiDescriptionListTitle, EuiDescriptionListDescription,
  EuiBadge,
} from '@elastic/eui';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { fetchIngestPipelines } from '../../store/reducers/ingest_pipeline_reducer';
import { fetchSearchPipelines } from '../../store/reducers/search_pipeline_reducer';

const ML_PIPELINE_SNIPPET = `PUT _ingest/pipeline/my-embedding-pipeline
{
  "description": "Generate embeddings",
  "processors": [{
    "text_embedding": {
      "model_id": "<your-model-id>",
      "field_map": {
        "passage_text": "passage_embedding"
      }
    }
  }]
}`;

const DATA_FLOW_DIAGRAM = `Write path:
  [Client] ──→ [default_pipeline] ──→ [Document indexed] ──→ [final_pipeline]

Search path:
  [Client] ──→ [search.pipeline] ──→ [Index queried] ──→ [Results returned]

ML path:
  [Ingest pipeline] ──→ [ml_inference / text_embedding] ──→ [ML Model] ──→ [Embeddings stored]`;

export function StartHerePage() {
  const dispatch = useAppDispatch();
  const history = useHistory();
  const ingestSummaries = useAppSelector(s => s.ingestPipeline.summaries);
  const searchSummaries = useAppSelector(s => s.searchPipeline.summaries);

  useEffect(() => {
    dispatch(fetchIngestPipelines());
    dispatch(fetchSearchPipelines());
  }, [dispatch]);

  const existingPipelines = [
    ...ingestSummaries.map(p => ({ ...p, type: 'ingest' as const })),
    ...searchSummaries.map(p => ({ ...p, type: 'search' as const })),
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="Pipeline Visualizer"
          description="Build, visualize, and manage OpenSearch pipelines"
          rightSideItems={[
            <EuiButton
              key="ecosystem"
              iconType="globe"
              onClick={() => history.push('/pipeline-visualizer/ecosystem')}
            >
              Ecosystem Map
            </EuiButton>,
            <EuiButton
              key="pipelines"
              fill
              onClick={() => history.push('/pipeline-visualizer/pipelines')}
            >
              View All Pipelines
            </EuiButton>,
          ]}
          bottomBorder
        />

        <EuiPageContent>
          {/* Section 1: What are pipelines? */}
          <EuiCallOut title="What are pipelines?" iconType="iInCircle" color="primary">
            <EuiFlexGroup gutterSize="xl" wrap>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Ingest pipelines</strong> transform documents before they are stored — lowercase
                  fields, parse dates, enrich with geo data, or run ML embeddings.
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Search pipelines</strong> modify queries or re-rank results — hybrid BM25 + neural
                  scoring, ML re-ranking, or term boosting.
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>ML / Neural</strong> — use <code>text_embedding</code> or{' '}
                  <code>ml_inference</code> processors to add semantic search capability via ML Commons.
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>

          <EuiSpacer size="xl" />

          {/* Section 2: Choose your journey */}
          <EuiTitle size="m"><h2>Choose your journey</h2></EuiTitle>
          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="l" wrap>
            {/* Card 1: Enrich docs */}
            <EuiFlexItem style={{ minWidth: 280 }}>
              <EuiCard
                icon={<EuiIcon type="indexOpen" size="xl" color="#006BB4" />}
                title="Enrich docs on write"
                description="Ingest pipelines transform documents before they're stored. Great for: lowercase fields, parse dates, enrich with geo data, run ML embeddings."
                footer={
                  <EuiButton
                    fill
                    fullWidth
                    onClick={() => history.push('/pipeline-visualizer/editor/ingest')}
                  >
                    Create Ingest Pipeline
                  </EuiButton>
                }
              />
            </EuiFlexItem>

            {/* Card 2: Improve search */}
            <EuiFlexItem style={{ minWidth: 280 }}>
              <EuiCard
                icon={<EuiIcon type="search" size="xl" color="#6F42C1" />}
                title="Improve search results"
                description="Search pipelines modify queries or re-rank results. Great for: hybrid BM25 + neural search, reranking with ML, normalization."
                footer={
                  <EuiButton
                    fullWidth
                    onClick={() => history.push('/pipeline-visualizer/editor/search')}
                  >
                    Create Search Pipeline
                  </EuiButton>
                }
              />
            </EuiFlexItem>

            {/* Card 3: Add AI/ML */}
            <EuiFlexItem style={{ minWidth: 280 }}>
              <EuiCard
                icon={<EuiIcon type="compute" size="xl" color="#D4A017" />}
                title="Add AI / ML"
                description="Use ML Commons to register and deploy a model, then reference it in ingest or search pipelines for semantic search or text embeddings."
                footer={
                  <div>
                    <EuiText size="xs" color="subdued">
                      <ol style={{ paddingLeft: 16, margin: 0 }}>
                        <li>Register a model in ML Commons</li>
                        <li>Deploy the model</li>
                        <li>Use it in an ingest pipeline (<code>text_embedding</code>) or search pipeline (<code>neural_query_enrichment</code>)</li>
                      </ol>
                    </EuiText>
                    <EuiSpacer size="s" />
                    <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
                      {ML_PIPELINE_SNIPPET}
                    </EuiCodeBlock>
                    <EuiSpacer size="s" />
                    <EuiButton
                      fullWidth
                      onClick={() => history.push('/pipeline-visualizer/editor/ingest')}
                    >
                      Create ML Ingest Pipeline
                    </EuiButton>
                  </div>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Section 3: How data flows */}
          <EuiTitle size="s"><h3>How data flows through pipelines</h3></EuiTitle>
          <EuiSpacer size="m" />
          <div
            style={{
              background: '#1a1a2e',
              color: '#a8d8ea',
              fontFamily: 'monospace',
              fontSize: 13,
              padding: '16px 20px',
              borderRadius: 6,
              whiteSpace: 'pre',
              lineHeight: 1.8,
            }}
          >
            {DATA_FLOW_DIAGRAM}
          </div>

          {/* Section 4: Existing pipelines (conditional) */}
          {existingPipelines.length > 0 && (
            <>
              <EuiSpacer size="xl" />
              <EuiHorizontalRule />
              <EuiSpacer size="l" />
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s"><h3>Your existing pipelines</h3></EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{existingPipelines.length}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiFlexGroup wrap gutterSize="s">
                {existingPipelines.map(p => (
                  <EuiFlexItem key={`${p.type}-${p.id}`} grow={false}>
                    <EuiButtonEmpty
                      size="s"
                      iconType={p.type === 'ingest' ? 'indexOpen' : 'search'}
                      onClick={() => history.push(`/pipeline-visualizer/${p.type}/${encodeURIComponent(p.id)}`)}
                    >
                      {p.id}
                      {p.hasMLProcessors && (
                        <EuiBadge color="accent" style={{ marginLeft: 6 }}>ML</EuiBadge>
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiButtonEmpty
                iconType="arrowRight"
                iconSide="right"
                onClick={() => history.push('/pipeline-visualizer/pipelines')}
              >
                View all pipelines
              </EuiButtonEmpty>
            </>
          )}

          <EuiSpacer size="xl" />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
