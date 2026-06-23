import React from 'react';
import { EuiPanel, EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';

const PROCESSOR_GROUPS = {
  'Common': ['set', 'remove', 'rename', 'script', 'date', 'json', 'convert', 'append', 'foreach', 'pipeline', 'fail', 'drop'],
  'Text': ['grok', 'gsub', 'dissect', 'kv', 'csv', 'html_strip', 'lowercase', 'uppercase', 'trim', 'join', 'split', 'bytes', 'uri_parts'],
  'ML / Neural': ['ml_inference', 'text_embedding', 'sparse_encoding', 'text_chunking', 'neural_sparse', 'text_similarity_scoring'],
  'Enrichment': ['enrich', 'user_agent', 'ip_location', 'community_id', 'fingerprint', 'sort'],
};

interface Props { pipelineType: 'ingest' | 'search'; }

export function ProcessorPalette({ pipelineType }: Props) {
  const onDragStart = (event: React.DragEvent, processorType: string) => {
    event.dataTransfer.setData('processorType', processorType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const searchOnlyProcessors = ['filter_query', 'neural_query_enricher', 'normalization-processor', 'rename_field', 'collapse'];

  return (
    <EuiPanel style={{ width: 200, height: '100%', overflowY: 'auto', flexShrink: 0 }} paddingSize="s">
      <EuiTitle size="xs"><h3>Processors</h3></EuiTitle>
      <EuiSpacer size="s" />

      {pipelineType === 'search' && (
        <div>
          <EuiText size="xs" color="subdued"><strong>Search</strong></EuiText>
          <EuiSpacer size="xs" />
          {searchOnlyProcessors.map(type => (
            <div
              key={type}
              draggable
              onDragStart={e => onDragStart(e, type)}
              style={{
                padding: '6px 8px', marginBottom: 4, background: '#e6f2ff',
                border: '1px solid #b3d4ff', borderRadius: 4, cursor: 'grab',
                fontSize: 12, userSelect: 'none',
              }}
            >
              {type}
            </div>
          ))}
          <EuiSpacer size="s" />
        </div>
      )}

      {Object.entries(PROCESSOR_GROUPS).map(([group, types]) => (
        <div key={group}>
          <EuiText size="xs" color="subdued"><strong>{group}</strong></EuiText>
          <EuiSpacer size="xs" />
          {types.map(type => (
            <div
              key={type}
              draggable
              onDragStart={e => onDragStart(e, type)}
              style={{
                padding: '6px 8px', marginBottom: 4,
                background: group === 'ML / Neural' ? '#f3eaff' : '#f5f5f5',
                border: `1px solid ${group === 'ML / Neural' ? '#d8b4ff' : '#d3d3d3'}`,
                borderRadius: 4, cursor: 'grab',
                fontSize: 12, userSelect: 'none',
              }}
            >
              {type}
            </div>
          ))}
          <EuiSpacer size="s" />
        </div>
      ))}
    </EuiPanel>
  );
}
