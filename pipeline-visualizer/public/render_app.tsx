import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { store } from './store/store';
import { App } from './app';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  componentDidCatch(error: Error) {
    this.setState({ error });
    // eslint-disable-next-line no-console
    console.error('[PipelineVisualizer] React render error:', error);
  }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#bd271e', background: '#fff4f4', border: '2px solid #bd271e', borderRadius: 6, margin: 16 }}>
          <strong>Pipeline Visualizer failed to render</strong>
          <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12 }}>
            {e.message}
            {'\n\n'}
            {e.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function renderApp(_core: CoreStart, params: AppMountParameters) {
  ReactDOM.render(
    <ErrorBoundary>
      <Provider store={store}>
        <Router history={params.history}>
          <App />
        </Router>
      </Provider>
    </ErrorBoundary>,
    params.element
  );
  return () => ReactDOM.unmountComponentAtNode(params.element);
}
