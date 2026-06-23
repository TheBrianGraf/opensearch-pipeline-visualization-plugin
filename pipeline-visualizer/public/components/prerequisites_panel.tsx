import React, { useMemo, useState } from 'react';
import {
  EuiPanel, EuiTitle, EuiSpacer, EuiIcon, EuiText,
  EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty,
} from '@elastic/eui';
import {
  OsIngestPipeline, OsSearchPipeline, IndexAssociation,
  MlModel, PrerequisiteCheck, CheckStatus,
} from '../../common';
import { ML_PROCESSOR_TYPES } from '../../common';

interface IndexAssocByPipeline { byPipeline: Record<string, IndexAssociation[]>; }

interface Props {
  pipelineId: string;
  pipelineType: 'ingest' | 'search';
  pipeline: OsIngestPipeline | OsSearchPipeline;
  indexAssociations: IndexAssocByPipeline;
  mlModels: MlModel[];
}

function allProcessorTypes(pipeline: OsIngestPipeline | OsSearchPipeline): string[] {
  const ip = pipeline as OsIngestPipeline;
  const sp = pipeline as OsSearchPipeline;
  const lists = [
    ip.processors ?? [],
    sp.request_processors ?? [],
    sp.response_processors ?? [],
    sp.phase_results_processors ?? [],
  ];
  return lists.flat().map((p) => Object.keys(p)[0]).filter(Boolean);
}

function statusIcon(s: CheckStatus): { type: string; color: string } {
  if (s === 'ok')      return { type: 'checkInCircleFilled', color: 'success' };
  if (s === 'warning') return { type: 'alert',               color: 'warning' };
  if (s === 'error')   return { type: 'errorFilled',         color: 'danger'  };
  return                      { type: 'questionInCircle',    color: 'subdued' };
}

function CheckRow({ check }: { check: PrerequisiteCheck }) {
  const [expanded, setExpanded] = useState(false);
  const icon = statusIcon(check.status);
  return (
    <div style={{ marginBottom: 12 }}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon.type} color={icon.color} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>{check.label}</strong></EuiText>
          {check.detail && (
            <EuiText size="xs" color="subdued">{check.detail}</EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {check.action?.apiSnippet && (
        <div style={{ marginLeft: 24, marginTop: 4 }}>
          <EuiButtonEmpty size="xs" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Hide snippet' : check.action!.label ?? 'Show snippet'}
          </EuiButtonEmpty>
          {expanded && (
            <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
              {check.action.apiSnippet}
            </EuiCodeBlock>
          )}
        </div>
      )}
    </div>
  );
}

export function PrerequisitesPanel({ pipelineId, pipelineType, pipeline, indexAssociations, mlModels }: Props) {
  const checks = useMemo<PrerequisiteCheck[]>(() => {
    const result: PrerequisiteCheck[] = [];
    const assocs = indexAssociations?.byPipeline?.[pipelineId] ?? [];

    if (pipelineType === 'ingest') {
      const ingestAssocs = assocs.filter(a => a.pipelineType === 'default' || a.pipelineType === 'final');
      if (ingestAssocs.length === 0) {
        result.push({
          label: 'Index attachment',
          status: 'warning',
          detail: 'This pipeline is not attached to any index. Documents will not be processed.',
          action: {
            label: 'Show how to attach',
            apiSnippet: `PUT /my-index/_settings\n{\n  "index.default_pipeline": "${pipelineId}"\n}`,
          },
        });
      } else {
        result.push({
          label: 'Index attachment',
          status: 'ok',
          detail: `Attached to: ${ingestAssocs.map(a => a.indexName).join(', ')}`,
        });
      }

      // Pipeline chain checks
      const ip = pipeline as OsIngestPipeline;
      const chainedNames: string[] = (ip.processors ?? [])
        .filter(p => 'pipeline' in p)
        .map(p => (p.pipeline as any)?.pipeline_name ?? (p.pipeline as any)?.name)
        .filter(Boolean);
      for (const name of chainedNames) {
        result.push({
          label: `Pipeline chain: ${name}`,
          status: 'unknown',
          detail: `This pipeline calls "${name}" via a pipeline processor. Verify it exists.`,
        });
      }
    }

    if (pipelineType === 'search') {
      const searchAssocs = assocs.filter(a => a.pipelineType === 'search');
      if (searchAssocs.length === 0) {
        result.push({
          label: 'Index attachment',
          status: 'warning',
          detail: 'This search pipeline is not attached to any index.',
          action: {
            label: 'Show how to attach',
            apiSnippet: `PUT /my-index/_settings\n{\n  "index.search.pipeline": "${pipelineId}"\n}`,
          },
        });
      } else {
        result.push({
          label: 'Index attachment',
          status: 'ok',
          detail: `Attached to: ${searchAssocs.map(a => a.indexName).join(', ')}`,
        });
      }
    }

    // ML model check
    const procTypes = allProcessorTypes(pipeline);
    const hasML = procTypes.some(t => (ML_PROCESSOR_TYPES as readonly string[]).includes(t));
    if (hasML) {
      const deployed = mlModels.filter(m => m.state === 'DEPLOYED');
      if (mlModels.length === 0) {
        result.push({
          label: 'ML model deployed',
          status: 'error',
          detail: 'No ML models deployed. ML processors will fail at runtime.',
          action: { label: 'Learn how to deploy a model', apiSnippet: 'POST /_plugins/_ml/models/<model_id>/_deploy' },
        });
      } else if (deployed.length === 0) {
        result.push({
          label: 'ML model deployed',
          status: 'error',
          detail: `ML models exist but none are deployed (${mlModels.length} registered). ML processors will fail at runtime.`,
          action: { label: 'Deploy a model', apiSnippet: 'POST /_plugins/_ml/models/<model_id>/_deploy' },
        });
      } else {
        result.push({
          label: 'ML model deployed',
          status: 'ok',
          detail: `${deployed.length} model(s) deployed: ${deployed.map(m => m.name).join(', ')}`,
        });
      }
    }

    return result;
  }, [pipelineId, pipelineType, pipeline, indexAssociations, mlModels]);

  if (checks.length === 0) return null;

  const allOk = checks.every(c => c.status === 'ok');

  return (
    <EuiPanel paddingSize="m">
      <EuiTitle size="xs"><h3>Prerequisites</h3></EuiTitle>
      <EuiSpacer size="m" />
      {allOk ? (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}><EuiIcon type="checkInCircleFilled" color="success" /></EuiFlexItem>
          <EuiFlexItem><EuiText size="s" color="success">All good! This pipeline is ready to use.</EuiText></EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        checks.map((c, i) => <CheckRow key={i} check={c} />)
      )}
    </EuiPanel>
  );
}
