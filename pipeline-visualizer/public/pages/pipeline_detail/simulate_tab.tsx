import React, { useEffect, useState } from 'react';
import {
  EuiTitle, EuiSpacer, EuiTextArea, EuiButton, EuiButtonEmpty,
  EuiFlexGroup, EuiFlexItem, EuiPanel, EuiCallOut, EuiIcon,
  EuiText, EuiCodeBlock, EuiAccordion,
} from '@elastic/eui';
import { getHttp } from '../../services';

interface Props {
  pipelineId: string;
}

interface DemoSample {
  doc: object;
  description: string;
}

interface FieldChange {
  key: string;
  type: 'added' | 'modified' | 'removed';
  oldValue?: unknown;
  newValue?: unknown;
}

function diffSources(before: Record<string, unknown>, after: Record<string, unknown>): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(after)) {
    if (!(key in before)) {
      changes.push({ key, type: 'added', newValue: after[key] });
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes.push({ key, type: 'modified', oldValue: before[key], newValue: after[key] });
    }
  }
  for (const key of Object.keys(before)) {
    if (!(key in after)) {
      changes.push({ key, type: 'removed', oldValue: before[key] });
    }
  }
  return changes;
}

function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

interface ProcessorStepProps {
  index: number;
  result: any;
  prevSource: Record<string, unknown>;
  inputSource: Record<string, unknown>;
}

function ProcessorStep({ index, result, prevSource }: ProcessorStepProps) {
  const processorType: string = result.processor_type ?? 'unknown';
  const status: string = result.status ?? 'success';
  const currentSource: Record<string, unknown> = result.doc?._source ?? {};
  const changes = diffSources(prevSource, currentSource);

  const statusIcon = status === 'success'
    ? { type: 'checkInCircleFilled', color: 'success' as const }
    : status === 'error'
    ? { type: 'errorFilled', color: 'danger' as const }
    : { type: 'minus', color: 'subdued' as const };

  const borderColor = status === 'success' ? '#017D73' : status === 'error' ? '#BD271E' : '#98A2B3';

  const statusLabel = status === 'skipped' ? 'skipped (condition false)' : status;

  const changeCount = changes.length;
  const accordionTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" style={{ fontFamily: 'monospace', opacity: 0.6 }}>
          Step {index + 1}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s"><strong>{processorType}</strong></EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type={statusIcon.type} color={statusIcon.color} size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color={status === 'error' ? 'danger' : 'subdued'}>{statusLabel}</EuiText>
      </EuiFlexItem>
      {changeCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">· {changeCount} field{changeCount !== 1 ? 's' : ''} changed</EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <EuiPanel
      paddingSize="s"
      style={{ marginBottom: 8, borderLeft: `4px solid ${borderColor}` }}
    >
      <EuiAccordion
        id={`step-${index}-${processorType}`}
        buttonContent={accordionTitle}
        initialIsOpen={status === 'error'}
      >
        <div style={{ paddingTop: 8 }}>
          {status === 'error' && result.error?.reason && (
            <>
              <EuiCallOut color="danger" size="s" title="Processor error" iconType="alert">
                <EuiText size="xs" style={{ fontFamily: 'monospace' }}>{result.error.reason}</EuiText>
              </EuiCallOut>
              <EuiSpacer size="s" />
            </>
          )}

          {changes.length === 0 ? (
            <EuiText size="xs" color="subdued" style={{ fontStyle: 'italic', paddingLeft: 4 }}>
              No field changes
            </EuiText>
          ) : (
            <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8 }}>
              {changes.map((c) => {
                const color = c.type === 'added' ? '#017D73' : c.type === 'modified' ? '#B8860B' : '#BD271E';
                const prefix = c.type === 'added' ? '+' : c.type === 'modified' ? '~' : '-';
                const keyPadded = c.key.padEnd(24);

                let valueDisplay = '';
                if (c.type === 'added') {
                  valueDisplay = formatValue(c.newValue);
                } else if (c.type === 'modified') {
                  valueDisplay = `${formatValue(c.oldValue)}  →  ${formatValue(c.newValue)}`;
                } else {
                  valueDisplay = `${formatValue(c.oldValue)}`;
                }

                return (
                  <div key={c.key} style={{ color, padding: '1px 4px' }}>
                    <span style={{ opacity: 0.7, marginRight: 8 }}>{prefix}</span>
                    <span style={{ marginRight: 8 }}>{keyPadded}</span>
                    <span style={{ opacity: c.type === 'removed' ? 0.6 : 1 }}>{valueDisplay}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </EuiAccordion>
    </EuiPanel>
  );
}

export function SimulateTab({ pipelineId }: Props) {
  const [inputJson, setInputJson] = useState('');
  const [demoSample, setDemoSample] = useState<DemoSample | null>(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHttp()
      .get(`/api/pipeline_visualizer/demo/sample/${encodeURIComponent(pipelineId)}`)
      .then((sample: any) => {
        setDemoSample(sample);
        setInputJson(JSON.stringify(sample.doc, null, 2));
      })
      .catch(() => {
        // No demo sample for this pipeline — leave input blank
      });
  }, [pipelineId]);

  const handleRun = async () => {
    let doc: object;
    try {
      doc = JSON.parse(inputJson);
    } catch {
      setError('Invalid JSON — please fix the input document before running.');
      return;
    }
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const result = await getHttp().post(
        `/api/pipeline_visualizer/simulate/${encodeURIComponent(pipelineId)}`,
        { body: JSON.stringify({ doc }) }
      );
      setResults(result);
    } catch (err: any) {
      setError(err.body?.message ?? err.message ?? 'Simulation failed');
    } finally {
      setRunning(false);
    }
  };

  const processorResults: any[] = results?.docs?.[0]?.processor_results ?? [];
  const finalResult = processorResults.length > 0
    ? processorResults[processorResults.length - 1]
    : null;

  // Build the sequence of source states for diffing
  // index -1 = original input doc
  let parsedInput: Record<string, unknown> = {};
  try { parsedInput = JSON.parse(inputJson) as Record<string, unknown>; } catch { /* ignore */ }

  const sourceStates: Record<string, unknown>[] = [parsedInput];
  for (const r of processorResults) {
    sourceStates.push(r.doc?._source ?? sourceStates[sourceStates.length - 1]);
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Input section */}
      <EuiTitle size="s"><h3>Input Document</h3></EuiTitle>
      <EuiSpacer size="s" />

      {demoSample && (
        <>
          <EuiCallOut
            size="s"
            color="primary"
            iconType="iInCircle"
            title={`Demo sample pre-loaded — ${demoSample.description}`}
          />
          <EuiSpacer size="s" />
        </>
      )}

      <EuiTextArea
        value={inputJson}
        onChange={(e) => setInputJson(e.target.value)}
        fullWidth
        rows={8}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        placeholder={'{\n  "field": "value"\n}'}
        aria-label="Input document JSON"
      />
      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={handleRun} isLoading={running} iconType="play">
            Run Simulation
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={() => { setResults(null); setError(null); }}
            disabled={!results && !error}
          >
            Clear results
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Error */}
      {error && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut color="danger" title="Simulation error" iconType="alert">
            <EuiText size="s" style={{ fontFamily: 'monospace' }}>{error}</EuiText>
          </EuiCallOut>
        </>
      )}

      {/* Results */}
      {results && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s"><h3>Simulation Results</h3></EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {processorResults.length} processor{processorResults.length !== 1 ? 's' : ''} — click any step to expand
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />

          {processorResults.length === 0 ? (
            <EuiCallOut color="warning" title="No processor results returned" iconType="alert">
              <EuiText size="s">The pipeline may be empty or the simulate API returned no steps.</EuiText>
            </EuiCallOut>
          ) : (
            processorResults.map((r: any, i: number) => (
              <ProcessorStep
                key={i}
                index={i}
                result={r}
                prevSource={sourceStates[i] as Record<string, unknown>}
                inputSource={parsedInput}
              />
            ))
          )}

          {finalResult?.doc && (
            <>
              <EuiSpacer size="m" />
              <EuiPanel color="subdued" paddingSize="s">
                <EuiTitle size="xs"><h4>Final Document</h4></EuiTitle>
                <EuiSpacer size="s" />
                <EuiCodeBlock language="json" fontSize="s" isCopyable paddingSize="s" overflowHeight={300}>
                  {JSON.stringify(finalResult.doc._source, null, 2)}
                </EuiCodeBlock>
              </EuiPanel>
            </>
          )}
        </>
      )}
    </div>
  );
}
