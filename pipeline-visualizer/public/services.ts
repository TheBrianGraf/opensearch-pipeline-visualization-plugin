import { CoreStart } from 'opensearch-dashboards/public';

let _core: CoreStart;

export function setCore(core: CoreStart) { _core = core; }
export function getCore(): CoreStart { return _core; }
export function getHttp() { return _core.http; }
export function getNotifications() { return _core.notifications; }
