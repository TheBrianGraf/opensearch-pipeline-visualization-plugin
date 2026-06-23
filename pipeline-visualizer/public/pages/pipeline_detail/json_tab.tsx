import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { OsIngestPipeline, OsSearchPipeline } from '../../../common';

interface Props { pipeline: OsIngestPipeline | OsSearchPipeline; }

export function JsonTab({ pipeline }: Props) {
  return (
    <EuiCodeBlock language="json" paddingSize="m" isCopyable overflowHeight={600}>
      {JSON.stringify(pipeline, null, 2)}
    </EuiCodeBlock>
  );
}
