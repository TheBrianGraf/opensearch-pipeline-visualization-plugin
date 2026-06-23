import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBasicTable, EuiBadge, EuiButtonIcon, EuiConfirmModal,
  EuiFlexGroup, EuiFlexItem, EuiToolTip,
} from '@elastic/eui';
import { PipelineSummary } from '../../../common';
import { MlBadge } from './ml_badge';

interface Props {
  pipelines: PipelineSummary[];
  loading: boolean;
  onDelete: (id: string, type: 'ingest' | 'search') => void;
}

export function PipelineTable({ pipelines, loading, onDelete }: Props) {
  const history = useHistory();
  const [deleteTarget, setDeleteTarget] = useState<PipelineSummary | null>(null);

  const columns = [
    {
      field: 'id' as const,
      name: 'Name',
      render: (id: string, row: PipelineSummary) => (
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <a
              href="#"
              onClick={e => { e.preventDefault(); history.push(`/pipeline-visualizer/${row.type}/${encodeURIComponent(id)}`); }}
            >
              {id}
            </a>
          </EuiFlexItem>
          {row.hasMLProcessors && <EuiFlexItem grow={false}><MlBadge /></EuiFlexItem>}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'type' as const,
      name: 'Type',
      render: (type: string) => (
        <EuiBadge color={type === 'ingest' ? 'primary' : 'secondary'}>{type}</EuiBadge>
      ),
      width: '100px',
    },
    { field: 'processorCount' as const, name: 'Processors', width: '100px' },
    {
      field: 'description' as const,
      name: 'Description',
      render: (d: string) => d ?? '—',
    },
    { field: 'version' as const, name: 'Version', width: '80px', render: (v: number) => v ?? '—' },
    {
      name: 'Actions',
      width: '100px',
      actions: [
        {
          render: (row: PipelineSummary) => (
            <EuiToolTip content="View">
              <EuiButtonIcon
                iconType="inspect"
                aria-label="View"
                onClick={() => history.push(`/pipeline-visualizer/${row.type}/${encodeURIComponent(row.id)}`)}
              />
            </EuiToolTip>
          ),
        },
        {
          render: (row: PipelineSummary) => (
            <EuiToolTip content="Edit">
              <EuiButtonIcon
                iconType="pencil"
                aria-label="Edit"
                onClick={() => history.push(`/pipeline-visualizer/editor/${row.type}/${encodeURIComponent(row.id)}`)}
              />
            </EuiToolTip>
          ),
        },
        {
          render: (row: PipelineSummary) => (
            <EuiToolTip content="Delete">
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                aria-label="Delete"
                onClick={() => setDeleteTarget(row)}
              />
            </EuiToolTip>
          ),
        },
      ],
    },
  ];

  return (
    <>
      <EuiBasicTable
        items={pipelines}
        columns={columns}
        loading={loading}
        noItemsMessage="No pipelines found"
        tableCaption="Pipelines"
        rowHeader="id"
      />
      {deleteTarget && (
        <EuiConfirmModal
          title={`Delete ${deleteTarget.id}?`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => { onDelete(deleteTarget.id, deleteTarget.type); setDeleteTarget(null); }}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
        >
          <p>This action cannot be undone.</p>
        </EuiConfirmModal>
      )}
    </>
  );
}
