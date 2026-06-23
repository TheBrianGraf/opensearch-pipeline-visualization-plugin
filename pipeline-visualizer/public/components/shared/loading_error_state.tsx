import React from 'react';
import { EuiLoadingSpinner, EuiCallOut, EuiSpacer } from '@elastic/eui';

interface Props {
  loading?: boolean;
  error?: string | null;
}

export function LoadingErrorState({ loading, error }: Props) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }
  if (error) {
    return (
      <>
        <EuiSpacer />
        <EuiCallOut title="Error loading data" color="danger" iconType="alert">
          <p>{error}</p>
        </EuiCallOut>
      </>
    );
  }
  return null;
}
