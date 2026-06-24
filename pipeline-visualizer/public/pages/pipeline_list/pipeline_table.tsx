import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBasicTable, EuiBadge, EuiConfirmModal,
  EuiFlexGroup, EuiFlexItem, EuiButtonIcon,
  EuiPopover, EuiContextMenuPanel, EuiContextMenuItem,
} from '@elastic/eui';
import { PipelineSummary } from '../../../common';
import { MlBadge } from './ml_badge';

interface Props {
  pipelines: PipelineSummary[];
  loading: boolean;
  onDelete: (id: string, type: 'ingest' | 'search') => void;
}

interface RowActionsProps {
  row: PipelineSummary;
  onDelete: (row: PipelineSummary) => void;
}

function RowActions({ row, onDelete }: RowActionsProps) {
  const history = useHistory();
  const [open, setOpen] = useState(false);

  const items = [
    <EuiContextMenuItem
      key="view"
      icon="inspect"
      onClick={() => { setOpen(false); history.push(`/pipeline-visualizer/${row.type}/${encodeURIComponent(row.id)}`); }}
    >
      View
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="edit"
      icon="pencil"
      onClick={() => { setOpen(false); history.push(`/pipeline-visualizer/editor/${row.type}/${encodeURIComponent(row.id)}`); }}
    >
      Edit
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      style={{ color: '#BD271E' }}
      onClick={() => { setOpen(false); onDelete(row); }}
    >
      Delete
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          aria-label="Actions"
          onClick={() => setOpen(o => !o)}
        />
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel style={{ minWidth: 160 }} items={items} />
    </EuiPopover>
  );
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
      width: '60px',
      render: (row: PipelineSummary) => (
        <RowActions row={row} onDelete={setDeleteTarget} />
      ),
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
