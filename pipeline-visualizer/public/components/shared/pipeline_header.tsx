import React from 'react';
import { EuiPageHeader, EuiButton, EuiButtonEmpty, EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

interface Props {
  pipelineId: string;
  pipelineType: 'ingest' | 'search';
  hasML?: boolean;
  onDelete: () => void;
}

export function PipelineHeader({ pipelineId, pipelineType, hasML, onDelete }: Props) {
  const history = useHistory();
  return (
    <EuiPageHeader
      pageTitle={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{pipelineId}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={pipelineType === 'ingest' ? 'primary' : 'secondary'}>{pipelineType}</EuiBadge>
          </EuiFlexItem>
          {hasML && <EuiFlexItem grow={false}><EuiBadge color="accent">ML</EuiBadge></EuiFlexItem>}
        </EuiFlexGroup>
      }
      rightSideItems={[
        <EuiButton
          key="edit"
          onClick={() => history.push(`/pipeline-visualizer/editor/${pipelineType}/${encodeURIComponent(pipelineId)}`)}
        >
          Edit
        </EuiButton>,
        <EuiButtonEmpty key="delete" color="danger" onClick={onDelete}>Delete</EuiButtonEmpty>,
      ]}
      bottomBorder
    />
  );
}
