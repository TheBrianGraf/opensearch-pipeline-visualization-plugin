import React from 'react';
import {
  EuiPanel, EuiTitle, EuiSpacer, EuiFormRow,
  EuiFieldText, EuiTextArea, EuiSwitch, EuiText, EuiCallOut,
} from '@elastic/eui';
import { PvFlowNode } from '../../models/pipeline_to_flow';

const ML_PROCESSOR_TYPES = ['ml_inference', 'text_embedding', 'sparse_encoding', 'neural_sparse'];

interface Props {
  node: PvFlowNode;
  onChange: (id: string, data: Partial<PvFlowNode['data']>) => void;
}

export function ProcessorConfigPanel({ node, onChange }: Props) {
  const { processorType, config, condition } = node.data;

  const setField = (field: string, value: unknown) => {
    onChange(node.id, { config: { ...config, [field]: value } });
  };

  const specialNodes = ['__input__', '__output__', '__diamond__'];
  if (specialNodes.includes(processorType)) return null;

  const isML = ML_PROCESSOR_TYPES.includes(processorType);

  return (
    <EuiPanel style={{ width: 280, height: '100%', overflowY: 'auto', flexShrink: 0 }} paddingSize="m">
      <EuiTitle size="xs"><h3>{processorType}</h3></EuiTitle>
      <EuiSpacer size="m" />

      <EuiFormRow label="Tag" helpText="Optional identifier">
        <EuiFieldText
          value={(config.tag as string) ?? ''}
          onChange={e => setField('tag', e.target.value)}
        />
      </EuiFormRow>

      <EuiFormRow label="Description">
        <EuiFieldText
          value={(config.description as string) ?? ''}
          onChange={e => setField('description', e.target.value)}
        />
      </EuiFormRow>

      <EuiFormRow label="Condition (if)" helpText="Painless expression">
        <EuiFieldText
          value={condition ?? ''}
          onChange={e => onChange(node.id, { condition: e.target.value || undefined })}
          placeholder="ctx.field == 'value'"
        />
      </EuiFormRow>

      <EuiFormRow label="Ignore failure">
        <EuiSwitch
          label=""
          checked={!!(config.ignore_failure)}
          onChange={e => setField('ignore_failure', e.target.checked)}
        />
      </EuiFormRow>

      {/* ML-specific configuration */}
      {isML && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued"><strong>ML Configuration</strong></EuiText>
          <EuiSpacer size="s" />

          <EuiFormRow
            label="Model ID"
            helpText="Deploy an ML model first via ML Commons, then paste the model ID here."
          >
            <EuiFieldText
              value={(config.model_id as string) ?? ''}
              onChange={e => setField('model_id', e.target.value || undefined)}
              placeholder="e.g. abc123xyz"
            />
          </EuiFormRow>

          {processorType === 'text_embedding' && (
            <EuiFormRow
              label="Field map (JSON)"
              helpText='Map source text fields to embedding vector fields. E.g. {"passage_text": "passage_embedding"}'
            >
              <EuiTextArea
                resize="vertical"
                value={
                  typeof config.field_map === 'object' && config.field_map !== null
                    ? JSON.stringify(config.field_map, null, 2)
                    : (config.field_map as string) ?? ''
                }
                onChange={e => {
                  try {
                    setField('field_map', JSON.parse(e.target.value || '{}'));
                  } catch {
                    setField('field_map', e.target.value);
                  }
                }}
                placeholder={'{\n  "source_text_field": "embedding_vector_field"\n}'}
                rows={3}
              />
            </EuiFormRow>
          )}

          {processorType === 'ml_inference' && (
            <>
              <EuiFormRow
                label="Input map (JSON)"
                helpText='Map document fields to model inputs. E.g. [{"model_input": "$.doc_field"}]'
              >
                <EuiTextArea
                  resize="vertical"
                  value={
                    typeof config.input_map === 'object'
                      ? JSON.stringify(config.input_map, null, 2)
                      : (config.input_map as string) ?? ''
                  }
                  onChange={e => {
                    try { setField('input_map', JSON.parse(e.target.value || '[]')); }
                    catch { setField('input_map', e.target.value); }
                  }}
                  placeholder={'[{"model_field": "$.document_field"}]'}
                  rows={3}
                />
              </EuiFormRow>
              <EuiFormRow
                label="Output map (JSON)"
                helpText="Map model outputs to document fields."
              >
                <EuiTextArea
                  resize="vertical"
                  value={
                    typeof config.output_map === 'object'
                      ? JSON.stringify(config.output_map, null, 2)
                      : (config.output_map as string) ?? ''
                  }
                  onChange={e => {
                    try { setField('output_map', JSON.parse(e.target.value || '[]')); }
                    catch { setField('output_map', e.target.value); }
                  }}
                  placeholder={'[{"new_doc_field": "model_output_field"}]'}
                  rows={3}
                />
              </EuiFormRow>
            </>
          )}

          <EuiCallOut size="s" title="Quick setup reminder" iconType="iInCircle" color="primary">
            <p style={{ fontSize: 12 }}>
              1. Register model: <code>POST /_plugins/_ml/models/_register</code><br />
              2. Deploy model: <code>POST /_plugins/_ml/models/&lt;id&gt;/_deploy</code><br />
              3. Paste the model ID above
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued"><strong>Processor fields</strong></EuiText>
      <EuiSpacer size="s" />

      {['field', 'value', 'target_field', 'source_field', 'pattern', 'replacement',
        'model_id', 'message', 'format', 'timezone', 'separator', 'split_char'].map(key => {
        if (processorType === 'set' && !['field', 'value'].includes(key)) return null;
        if (!['field', 'target_field'].includes(key) && processorType === 'rename' && !['field', 'target_field'].includes(key)) return null;
        // model_id is handled above for ML processors
        if (isML && key === 'model_id') return null;
        return (
          <EuiFormRow key={key} label={key}>
            <EuiFieldText
              value={(config[key] as string) ?? ''}
              onChange={e => setField(key, e.target.value || undefined)}
            />
          </EuiFormRow>
        );
      }).filter(Boolean)}

      <EuiFormRow label="Raw config (JSON)" helpText="Additional processor-specific fields">
        <EuiTextArea
          resize="vertical"
          value={(() => {
            const { tag: _t, description: _d, ignore_failure: _i, field: _f, value: _v,
              target_field: _tf, source_field: _sf, pattern: _p, replacement: _r,
              model_id: _m, message: _ms, format: _fmt, timezone: _tz } = config;
            const excluded = ['tag','description','ignore_failure','field','value','target_field',
              'source_field','pattern','replacement','model_id','message','format','timezone',
              'field_map','input_map','output_map'];
            const extra = Object.entries(config).filter(([k]) => !excluded.includes(k));
            return extra.length > 0 ? JSON.stringify(Object.fromEntries(extra), null, 2) : '';
          })()}
          onChange={e => {
            try {
              const parsed = JSON.parse(e.target.value || '{}');
              onChange(node.id, { config: { ...config, ...parsed } });
            } catch { /* invalid JSON, ignore */ }
          }}
          placeholder="{}"
          rows={4}
        />
      </EuiFormRow>
    </EuiPanel>
  );
}
