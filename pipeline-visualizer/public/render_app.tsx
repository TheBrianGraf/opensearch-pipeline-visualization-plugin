import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { store } from './store/store';
import { App } from './app';

export function renderApp(_core: CoreStart, params: AppMountParameters) {
  ReactDOM.render(
    <Provider store={store}>
      <Router history={params.history}>
        <App />
      </Router>
    </Provider>,
    params.element
  );
  return () => ReactDOM.unmountComponentAtNode(params.element);
}
