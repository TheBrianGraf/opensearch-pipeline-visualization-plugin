import React from 'react';
import { EuiBasicTable, EuiBadge, EuiEmptyPrompt } from '@elastic/eui';
import { IndexAssociation } from '../../../common';
import { useAppSelector } from '../../store/store';

interface Props { pipelineId: string; }

export function IndexAssocTab({ pipelineId }: Props) {
  const { byPipeline, loading } = useAppSelector(s => s.indexAssoc);
  const associations: IndexAssociation[] = byPipeline[pipelineId] ?? [];

  if (!loading && associations.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="database"
        title={<h3>No associated indices</h3>}
        body={<p>No indices have this pipeline configured.</p>}
      />
    );
  }

  const columns = [
    { field: 'indexName' as const, name: 'Index Name' },
    {
      field: 'pipelineType' as const,
      name: 'Association Type',
      render: (t: string) => {
        const color = t === 'default' ? 'primary' : t === 'final' ? 'warning' : 'secondary';
        return <EuiBadge color={color}>{t}</EuiBadge>;
      },
    },
  ];

  return (
    <EuiBasicTable
      items={associations}
      columns={columns}
      loading={loading}
      tableCaption="Associated indices"
      rowHeader="indexName"
    />
  );
}
