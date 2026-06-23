import { PluginInitializerContext } from 'opensearch-dashboards/server';
import { PipelineVisualizerPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new PipelineVisualizerPlugin(initializerContext);
}

export { PipelineVisualizerPluginSetup, PipelineVisualizerPluginStart } from './plugin';
