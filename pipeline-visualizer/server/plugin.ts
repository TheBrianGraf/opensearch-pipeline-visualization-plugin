import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from 'opensearch-dashboards/server';
import { registerRoutes } from './routes';

export interface PipelineVisualizerPluginSetup {}
export interface PipelineVisualizerPluginStart {}

export class PipelineVisualizerPlugin implements Plugin<PipelineVisualizerPluginSetup, PipelineVisualizerPluginStart> {
  private readonly logger: Logger;
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }
  public setup(core: CoreSetup) {
    this.logger.debug('pipelineVisualizer: Setup');
    const router = core.http.createRouter();
    registerRoutes(router);
    return {};
  }
  public start(_core: CoreStart) { return {}; }
  public stop() {}
}
