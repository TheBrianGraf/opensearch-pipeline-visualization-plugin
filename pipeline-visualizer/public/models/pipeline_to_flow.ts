import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { OsIngestPipeline, OsSearchPipeline, OsProcessor, OsProcessorConfig, ML_PROCESSOR_TYPES } from '../../common';

export interface PvNodeData {
  label: string;
  processorType: string;
  config: Record<string, unknown>;
  condition?: string;
  isOnFailure?: boolean;
  isMl?: boolean;
  swimLane?: 'request' | 'phase' | 'response';
}

export type PvEdgeKind = 'normal' | 'on_failure' | 'conditional';
export interface PvEdgeData { edgeKind: PvEdgeKind; }
export type PvFlowNode = Node<PvNodeData>;
export type PvFlowEdge = Edge<PvEdgeData>;
export interface PipelineFlowResult { nodes: PvFlowNode[]; edges: PvFlowEdge[]; }

let _counter = 0;
function nid(): string { return `pvn-${++_counter}`; }
function reset() { _counter = 0; }

function processorType(p: OsProcessor): string { return Object.keys(p)[0]; }
function processorConfig(p: OsProcessor): Record<string, unknown> {
  const type = processorType(p);
  const raw = p[type] as Record<string, unknown>;
  const { on_failure: _a, if: _b, tag: _c, description: _d, ignore_failure: _e, ...rest } = raw;
  return rest;
}
function isML(type: string): boolean { return (ML_PROCESSOR_TYPES as readonly string[]).includes(type); }

export function applyDagreLayout(
  nodes: PvFlowNode[],
  edges: PvFlowEdge[],
  sizeOf?: (node: PvFlowNode) => { width: number; height: number }
): PvFlowNode[] {
  const defaultSize = (n: PvFlowNode) => ({
    width:  n.type === 'pipelineInput' ? 140 : n.type === 'conditionalDiamond' ? 100 : 220,
    height: n.type === 'conditionalDiamond' ? 100 : 60,
  });
  const getSize = sizeOf ?? defaultSize;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 50 });
  nodes.forEach(n => {
    const { width, height } = getSize(n);
    g.setNode(n.id, { width, height });
  });
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const gn = g.node(n.id);
    return { ...n, position: { x: gn.x - gn.width / 2, y: gn.y - gn.height / 2 } };
  });
}

function applyLayout(nodes: PvFlowNode[], edges: PvFlowEdge[]): PvFlowNode[] {
  return applyDagreLayout(nodes, edges);
}

function buildChain(
  processors: OsProcessor[],
  prevId: string,
  nodes: PvFlowNode[],
  edges: PvFlowEdge[],
  opts: { isOnFailure?: boolean; swimLane?: PvNodeData['swimLane'] } = {}
): string {
  let curId = prevId;
  for (const proc of processors) {
    const type = processorType(proc);
    const rawConfig = proc[type] as OsProcessorConfig;
    const condition = rawConfig.if;
    const onFailureProcs = rawConfig.on_failure ?? [];
    const cleanConfig = processorConfig(proc);

    if (condition) {
      const diamond: PvFlowNode = {
        id: nid(), type: 'conditionalDiamond', position: { x: 0, y: 0 },
        data: { label: 'IF', processorType: '__diamond__', config: {}, condition },
      };
      nodes.push(diamond);
      edges.push({ id: `e-${curId}-${diamond.id}`, source: curId, target: diamond.id, type: 'conditionalEdge', data: { edgeKind: 'conditional' } });
      curId = diamond.id;
    }

    const node: PvFlowNode = {
      id: nid(),
      type: opts.isOnFailure ? 'onFailureNode' : 'processorNode',
      position: { x: 0, y: 0 },
      data: {
        label: rawConfig.tag ? `${type} (${rawConfig.tag})` : type,
        processorType: type,
        config: cleanConfig,
        condition,
        isOnFailure: opts.isOnFailure,
        isMl: isML(type),
        swimLane: opts.swimLane,
      },
    };
    nodes.push(node);
    edges.push({
      id: `e-${curId}-${node.id}`,
      source: curId,
      target: node.id,
      type: condition ? 'conditionalEdge' : opts.isOnFailure ? 'failureEdge' : 'default',
      data: { edgeKind: condition ? 'conditional' : opts.isOnFailure ? 'on_failure' : 'normal' },
    });

    if (onFailureProcs.length > 0) {
      buildChain(onFailureProcs, node.id, nodes, edges, { isOnFailure: true, swimLane: opts.swimLane });
    }
    curId = node.id;
  }
  return curId;
}

export function ingestPipelineToFlow(_id: string, pipeline: OsIngestPipeline): PipelineFlowResult {
  reset();
  const nodes: PvFlowNode[] = [];
  const edges: PvFlowEdge[] = [];

  const input: PvFlowNode = { id: nid(), type: 'pipelineInput', position: { x: 0, y: 0 }, data: { label: 'Document', processorType: '__input__', config: {} } };
  nodes.push(input);

  const lastMainId = buildChain(pipeline.processors ?? [], input.id, nodes, edges);

  if ((pipeline.on_failure ?? []).length > 0) {
    buildChain(pipeline.on_failure!, lastMainId, nodes, edges, { isOnFailure: true });
  }

  const output: PvFlowNode = { id: nid(), type: 'pipelineInput', position: { x: 0, y: 0 }, data: { label: 'Index', processorType: '__output__', config: {} } };
  nodes.push(output);
  edges.push({ id: `e-${lastMainId}-${output.id}`, source: lastMainId, target: output.id, data: { edgeKind: 'normal' } });

  return { nodes: applyLayout(nodes, edges), edges };
}

export function searchPipelineToFlow(_id: string, pipeline: OsSearchPipeline): PipelineFlowResult {
  reset();
  const nodes: PvFlowNode[] = [];
  const edges: PvFlowEdge[] = [];

  const input: PvFlowNode = { id: nid(), type: 'pipelineInput', position: { x: 0, y: 0 }, data: { label: 'Search Request', processorType: '__input__', config: {} } };
  nodes.push(input);

  let lastId = input.id;
  lastId = buildChain(pipeline.request_processors ?? [], lastId, nodes, edges, { swimLane: 'request' });
  lastId = buildChain(pipeline.phase_results_processors ?? [], lastId, nodes, edges, { swimLane: 'phase' });
  lastId = buildChain(pipeline.response_processors ?? [], lastId, nodes, edges, { swimLane: 'response' });

  const output: PvFlowNode = { id: nid(), type: 'pipelineInput', position: { x: 0, y: 0 }, data: { label: 'Search Response', processorType: '__output__', config: {} } };
  nodes.push(output);
  edges.push({ id: `e-${lastId}-${output.id}`, source: lastId, target: output.id, data: { edgeKind: 'normal' } });

  return { nodes: applyLayout(nodes, edges), edges };
}

export function flowToIngestPipeline(nodes: PvFlowNode[], edges: PvFlowEdge[]): OsIngestPipeline {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const outEdges = new Map<string, PvFlowEdge[]>();
  edges.forEach(e => { const list = outEdges.get(e.source) ?? []; list.push(e); outEdges.set(e.source, list); });

  const inputNode = nodes.find(n => n.data.processorType === '__input__');
  if (!inputNode) return { processors: [] };

  function collectChain(startId: string, failMode: boolean): OsProcessor[] {
    const result: OsProcessor[] = [];
    const visited = new Set<string>();
    let curId = startId;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (visited.has(curId)) break;
      visited.add(curId);
      const nexts = (outEdges.get(curId) ?? []).filter(e => e.data?.edgeKind !== 'on_failure');
      const n = byId.get(curId);
      if (!n || n.data.processorType === '__output__' || n.data.processorType === '__input__') {
        if (nexts.length === 0) break;
        curId = nexts[0].target;
        continue;
      }
      if (n.data.processorType === '__diamond__') {
        if (nexts.length === 0) break;
        curId = nexts[0].target;
        continue;
      }
      if (!!n.data.isOnFailure !== failMode) { break; }

      const onFailEdges = (outEdges.get(curId) ?? []).filter(e => e.data?.edgeKind === 'on_failure');
      const onFailure = onFailEdges.length > 0 ? collectChain(onFailEdges[0].target, true) : undefined;

      const config: OsProcessorConfig = { ...n.data.config };
      if (n.data.condition) config.if = n.data.condition;
      if (onFailure?.length) config.on_failure = onFailure;
      result.push({ [n.data.processorType]: config });

      if (nexts.length === 0) break;
      curId = nexts[0].target;
    }
    return result;
  }

  const pipelineOnFailEdges = (outEdges.get(inputNode.id) ?? []).filter(e => e.data?.edgeKind === 'on_failure');
  const inputNexNormal = (outEdges.get(inputNode.id) ?? []).filter(e => e.data?.edgeKind !== 'on_failure');

  const processors = inputNexNormal.length > 0 ? collectChain(inputNexNormal[0].target, false) : [];
  const on_failure = pipelineOnFailEdges.length > 0 ? collectChain(pipelineOnFailEdges[0].target, true) : undefined;

  return { processors, ...(on_failure?.length ? { on_failure } : {}) };
}

export function flowToSearchPipeline(nodes: PvFlowNode[], edges: PvFlowEdge[]): OsSearchPipeline {
  const allProcessorNodes = nodes.filter(n => !['__input__','__output__','__diamond__'].includes(n.data.processorType) && !n.data.isOnFailure);
  const toProc = (n: PvFlowNode): OsProcessor => {
    const config: OsProcessorConfig = { ...n.data.config };
    if (n.data.condition) config.if = n.data.condition;
    return { [n.data.processorType]: config };
  };
  return {
    request_processors: allProcessorNodes.filter(n => n.data.swimLane === 'request').map(toProc),
    phase_results_processors: allProcessorNodes.filter(n => n.data.swimLane === 'phase').map(toProc),
    response_processors: allProcessorNodes.filter(n => n.data.swimLane === 'response').map(toProc),
  };
}
