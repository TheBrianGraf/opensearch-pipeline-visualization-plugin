import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiPage, EuiPageBody, EuiPageContent, EuiPageHeader,
  EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon, EuiSpacer,
  EuiButton, EuiButtonEmpty, EuiCallOut, EuiLoadingSpinner,
  EuiText, EuiAccordion, EuiCodeBlock, EuiPanel, EuiTitle,
  EuiBadge,
} from '@elastic/eui';
import { getHttp, getNotifications } from '../../services';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScenarioMeta {
  id: string;
  label: string;
  description: string;
  creates: {
    ingestPipelines: string[];
    searchPipelines: string[];
    index: string;
    docCount: number;
  };
}

interface SetupResult {
  created: string[];
  errors: string[];
  simulatorPipeline: string;
  index: string;
}

type CardState = 'idle' | 'loading' | 'loaded' | 'tearing-down' | 'error';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scenarioIcon(id: string): { type: string; color: string } {
  if (id === 'web-logs')  return { type: 'database', color: '#006BB4' };
  if (id === 'ecommerce') return { type: 'tag',      color: '#017D73' };
  if (id === 'ml-ready')  return { type: 'compute',  color: '#D4A017' };
  return { type: 'package', color: '#888' };
}

function createsSummary(creates: ScenarioMeta['creates']): string[] {
  const lines: string[] = [];
  if (creates.ingestPipelines.length > 0)
    lines.push(`${creates.ingestPipelines.length} ingest pipeline${creates.ingestPipelines.length > 1 ? 's' : ''}: ${creates.ingestPipelines.join(', ')}`);
  if (creates.searchPipelines.length > 0)
    lines.push(`${creates.searchPipelines.length} search pipeline${creates.searchPipelines.length > 1 ? 's' : ''}: ${creates.searchPipelines.join(', ')}`);
  lines.push(`index: ${creates.index}`);
  lines.push(`${creates.docCount} sample documents indexed through the pipeline`);
  return lines;
}

// ── Scenario card ─────────────────────────────────────────────────────────────

interface ScenarioCardProps {
  scenario: ScenarioMeta;
  state: CardState;
  result: SetupResult | undefined;
  onLoad: () => void;
  onTeardown: () => void;
}

function ScenarioCard({ scenario, state, result, onLoad, onTeardown }: ScenarioCardProps) {
  const history = useHistory();
  const icon = scenarioIcon(scenario.id);
  const isLoading = state === 'loading';
  const isTearingDown = state === 'tearing-down';
  const isLoaded = state === 'loaded';
  const isError = state === 'error';

  return (
    <EuiFlexItem style={{ minWidth: 320, maxWidth: 420 }}>
      <EuiCard
        icon={<EuiIcon type={icon.type} size="xl" color={icon.color} />}
        title={scenario.label}
        description={scenario.description}
        footer={
          <div>
            {/* Creates list */}
            <EuiText size="xs" color="subdued">
              <strong>Creates:</strong>
              <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                {createsSummary(scenario.creates).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </EuiText>

            <EuiSpacer size="m" />

            {/* Action buttons */}
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill={!isLoaded}
                  size="s"
                  isLoading={isLoading}
                  isDisabled={isLoaded || isTearingDown}
                  onClick={onLoad}
                  iconType="playFilled"
                >
                  {isLoaded ? 'Loaded' : 'Load Demo Data'}
                </EuiButton>
              </EuiFlexItem>
              {isLoaded && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    color="danger"
                    isLoading={isTearingDown}
                    onClick={onTeardown}
                    iconType="trash"
                  >
                    Tear Down
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            {/* Error state */}
            {isError && result && result.errors.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut title="Setup encountered errors" color="danger" size="s" iconType="alert">
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {result.errors.map((e, i) => <li key={i}><EuiText size="xs">{e}</EuiText></li>)}
                  </ul>
                </EuiCallOut>
              </>
            )}

            {/* Loaded success state */}
            {isLoaded && result && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  title={<><EuiBadge color="success">Loaded</EuiBadge> {result.created.length} resources created</>}
                  color="success"
                  size="s"
                  iconType="checkInCircleFilled"
                />

                {/* Partial errors */}
                {result.errors.length > 0 && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiCallOut title="Some steps had warnings" color="warning" size="s" iconType="alert">
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {result.errors.map((e, i) => <li key={i}><EuiText size="xs">{e}</EuiText></li>)}
                      </ul>
                    </EuiCallOut>
                  </>
                )}

                <EuiSpacer size="s" />

                {/* What was created accordion */}
                <EuiAccordion id={`created-${scenario.id}`} buttonContent="What was created">
                  <ul style={{ paddingLeft: 16, marginTop: 8 }}>
                    {result.created.map((c, i) => (
                      <li key={i}><EuiText size="xs" color="subdued">{c}</EuiText></li>
                    ))}
                  </ul>
                </EuiAccordion>

                <EuiSpacer size="s" />

                {/* Navigation buttons */}
                <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      size="s"
                      iconType="visMapRegion"
                      onClick={() => history.push('/pipeline-visualizer/ecosystem')}
                    >
                      View Ecosystem Map
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      iconType="play"
                      onClick={() => history.push(`/pipeline-visualizer/ingest/${encodeURIComponent(result.simulatorPipeline)}`)}
                    >
                      Simulate Pipeline
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </div>
        }
      />
    </EuiFlexItem>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DemoPage() {
  const history = useHistory();
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetchingScenarios, setFetchingScenarios] = useState(true);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [results, setResults] = useState<Record<string, SetupResult>>({});

  useEffect(() => {
    getHttp()
      .get<ScenarioMeta[]>('/api/pipeline_visualizer/demo/scenarios')
      .then((data) => { setScenarios(data); setFetchingScenarios(false); })
      .catch(() => { setLoadError('Failed to load demo scenarios from server.'); setFetchingScenarios(false); });
  }, []);

  const setCardState = (id: string, state: CardState) =>
    setCardStates(prev => ({ ...prev, [id]: state }));

  const handleLoad = async (scenario: ScenarioMeta) => {
    setCardState(scenario.id, 'loading');
    try {
      const result = await getHttp().post<SetupResult>(
        `/api/pipeline_visualizer/demo/setup/${scenario.id}`
      );
      setResults(prev => ({ ...prev, [scenario.id]: result }));
      if (result.errors.length > 0 && result.created.length === 0) {
        setCardState(scenario.id, 'error');
        getNotifications().toasts.addDanger(`Demo setup failed: ${result.errors[0]}`);
      } else {
        setCardState(scenario.id, 'loaded');
        getNotifications().toasts.addSuccess(
          `Demo loaded! ${result.created.length} resources created in your cluster.`
        );
      }
    } catch (err: any) {
      setCardState(scenario.id, 'error');
      setResults(prev => ({ ...prev, [scenario.id]: { created: [], errors: [err.body?.message ?? err.message ?? 'Unknown error'], simulatorPipeline: '', index: '' } }));
      getNotifications().toasts.addDanger('Demo setup failed. Check the card for details.');
    }
  };

  const handleTeardown = async (scenario: ScenarioMeta) => {
    setCardState(scenario.id, 'tearing-down');
    try {
      await getHttp().delete(`/api/pipeline_visualizer/demo/teardown/${scenario.id}`);
      setCardState(scenario.id, 'idle');
      setResults(prev => { const n = { ...prev }; delete n[scenario.id]; return n; });
      getNotifications().toasts.addSuccess(`Demo "${scenario.label}" torn down.`);
    } catch (err: any) {
      setCardState(scenario.id, 'idle');
      getNotifications().toasts.addWarning('Teardown had errors — some resources may remain.');
    }
  };

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="Demo Scenarios"
          description="Load pre-built pipelines, indices, and sample documents to explore what the plugin can do."
          rightSideItems={[
            <EuiButtonEmpty key="back" iconType="arrowLeft" onClick={() => history.goBack()}>
              Back
            </EuiButtonEmpty>,
          ]}
          bottomBorder
        />

        <EuiPageContent>
          <EuiCallOut
            size="s"
            iconType="iInCircle"
            title="Demo data loads into your live OpenSearch cluster"
          >
            <p>
              Each scenario creates real ingest pipelines, search pipelines, an index with appropriate
              mappings, and indexes sample documents <strong>through the pipeline</strong> — so you can
              see the actual transformation results. Use <strong>Tear Down</strong> to remove everything
              when you are done.
            </p>
          </EuiCallOut>

          <EuiSpacer size="l" />

          {/* Scenario cards */}
          {fetchingScenarios ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <EuiLoadingSpinner size="xl" />
            </div>
          ) : loadError ? (
            <EuiCallOut title="Could not load scenarios" color="danger" iconType="alert">
              <p>{loadError}</p>
            </EuiCallOut>
          ) : (
            <EuiFlexGroup wrap gutterSize="l" alignItems="flexStart">
              {scenarios.map(scenario => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  state={cardStates[scenario.id] ?? 'idle'}
                  result={results[scenario.id]}
                  onLoad={() => handleLoad(scenario)}
                  onTeardown={() => handleTeardown(scenario)}
                />
              ))}
            </EuiFlexGroup>
          )}

          <EuiSpacer size="xl" />

          {/* What can I do next */}
          <EuiPanel paddingSize="l">
            <EuiTitle size="s"><h3>What can I do next?</h3></EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xl" wrap>
              {/* Ecosystem Map */}
              <EuiFlexItem style={{ minWidth: 220 }}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}><EuiIcon type="visMapRegion" size="l" color="#006BB4" /></EuiFlexItem>
                  <EuiFlexItem><EuiText size="s"><strong>Explore the Ecosystem Map</strong></EuiText></EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  See all your pipelines, indices, and ML models in one interactive canvas.
                </EuiText>
                <EuiSpacer size="s" />
                <EuiButton size="s" onClick={() => history.push('/pipeline-visualizer/ecosystem')}>
                  Open Ecosystem Map
                </EuiButton>
              </EuiFlexItem>

              {/* Simulate */}
              <EuiFlexItem style={{ minWidth: 220 }}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}><EuiIcon type="play" size="l" color="#017D73" /></EuiFlexItem>
                  <EuiFlexItem><EuiText size="s"><strong>Simulate a Pipeline</strong></EuiText></EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  Test how a document is transformed step-by-step. Open any demo pipeline and click the <strong>Simulate</strong> tab — it is pre-populated with a sample document.
                </EuiText>
                <EuiSpacer size="s" />
                <EuiButton size="s" onClick={() => history.push('/pipeline-visualizer/pipelines')}>
                  View Pipelines
                </EuiButton>
              </EuiFlexItem>

              {/* Browse indexed docs */}
              <EuiFlexItem style={{ minWidth: 260 }}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}><EuiIcon type="search" size="l" color="#D4A017" /></EuiFlexItem>
                  <EuiFlexItem><EuiText size="s"><strong>Browse Indexed Docs</strong></EuiText></EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  After loading a demo, query the index in Dev Tools to see the documents as the pipeline transformed them:
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
                  {`GET /demo-web-logs/_search\n{\n  "query": { "match_all": {} },\n  "size": 3\n}`}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
