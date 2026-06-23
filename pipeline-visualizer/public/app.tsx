import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { PipelineListPage } from './pages/pipeline_list';
import { PipelineDetailPage } from './pages/pipeline_detail';
import { PipelineEditorPage } from './pages/pipeline_editor';
import { EcosystemMapPage } from './pages/ecosystem_map';
import { StartHerePage } from './pages/start_here';

export function App() {
  return (
    <Switch>
      <Route exact path="/pipeline-visualizer" component={StartHerePage} />
      <Route exact path="/pipeline-visualizer/ecosystem" component={EcosystemMapPage} />
      <Route exact path="/pipeline-visualizer/pipelines" component={PipelineListPage} />
      <Route path="/pipeline-visualizer/ingest/:id" render={() => <PipelineDetailPage pipelineType="ingest" />} />
      <Route path="/pipeline-visualizer/search/:id" render={() => <PipelineDetailPage pipelineType="search" />} />
      <Route path="/pipeline-visualizer/editor/:type/:id?" component={PipelineEditorPage} />
      <Redirect from="/" to="/pipeline-visualizer" />
    </Switch>
  );
}
