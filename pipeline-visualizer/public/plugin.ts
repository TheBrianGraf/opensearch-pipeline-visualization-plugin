import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  AppMountParameters,
  AppNavLinkStatus,
} from 'opensearch-dashboards/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { setCore } from './services';

export interface PipelineVisualizerPluginSetup {}
export interface PipelineVisualizerPluginStart {}

export class PipelineVisualizerPlugin implements Plugin<PipelineVisualizerPluginSetup, PipelineVisualizerPluginStart> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      navLinkStatus: AppNavLinkStatus.visible,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        setCore(coreStart);
        const { renderApp } = await import('./render_app');
        return renderApp(coreStart, params);
      },
    });
    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
