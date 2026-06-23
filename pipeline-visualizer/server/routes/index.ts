import { IRouter } from 'opensearch-dashboards/server';
import { registerIngestRoutes } from './ingest_routes';
import { registerSearchRoutes } from './search_routes';
import { registerIndexAssocRoutes } from './index_assoc_routes';
import { registerMlRoutes } from './ml_routes';
import { registerIndexRoutes } from './index_routes';
import { registerSimulateRoutes } from './simulate_routes';
import { registerDemoRoutes } from './demo_routes';

export function registerRoutes(router: IRouter) {
  registerIngestRoutes(router);
  registerSearchRoutes(router);
  registerIndexAssocRoutes(router);
  registerMlRoutes(router);
  registerIndexRoutes(router);
  registerSimulateRoutes(router);
  registerDemoRoutes(router);
}
