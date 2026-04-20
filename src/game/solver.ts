import { Bridge, Island, bridgeKey } from './types';
import { segmentsCross } from './rules';

export interface SolveResult {
  unique: boolean;
  solvable: boolean;
  requiresGuessing: boolean;
  trivialOnly: boolean;
  saturationFires: number;
  advancedFires: number;
  crossingFires: number;
  maxBranchDepth: number;
  solution?: Map<string, Bridge>;
}

interface Edge {
  a: number;
  b: number;
  mn: number;
  mx: number;
  crosses: number[];
}

interface Stats {
  saturationFires: number;
  advancedFires: number;
  crossingFires: number;
}

function buildEdges(islands: Island[]): { edges: Edge[]; incident: number[][] } {
  const edges: Edge[] = [];
  const byRow = new Map<number, number[]>();
  const byCol = new Map<number, number[]>();
  for (let i = 0; i < islands.length; i++) {
    const isl = islands[i];
    if (!byRow.has(isl.y)) byRow.set(isl.y, []);
    byRow.get(isl.y)!.push(i);
    if (!byCol.has(isl.x)) byCol.set(isl.x, []);
    byCol.get(isl.x)!.push(i);
  }
  for (const ids of byRow.values()) {
    ids.sort((a, b) => islands[a].x - islands[b].x);
    for (let k = 0; k < ids.length - 1; k++) {
      edges.push({ a: ids[k], b: ids[k + 1], mn: 0, mx: 2, crosses: [] });
    }
  }
  for (const ids of byCol.values()) {
    ids.sort((a, b) => islands[a].y - islands[b].y);
    for (let k = 0; k < ids.length - 1; k++) {
      edges.push({ a: ids[k], b: ids[k + 1], mn: 0, mx: 2, crosses: [] });
    }
  }
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e1 = edges[i];
      const e2 = edges[j];
      if (segmentsCross(islands[e1.a], islands[e1.b], islands[e2.a], islands[e2.b])) {
        e1.crosses.push(j);
        e2.crosses.push(i);
      }
    }
  }
  const incident: number[][] = islands.map(() => []);
  for (let i = 0; i < edges.length; i++) {
    incident[edges[i].a].push(i);
    incident[edges[i].b].push(i);
  }
  return { edges, incident };
}

function cloneEdges(edges: Edge[]): Edge[] {
  return edges.map((e) => ({ a: e.a, b: e.b, mn: e.mn, mx: e.mx, crosses: e.crosses }));
}

function propagate(
  islands: Island[],
  edges: Edge[],
  incident: number[][],
  stats: Stats,
): 'ok' | 'bad' {
  let changed = true;
  while (changed) {
    changed = false;

    for (let i = 0; i < islands.length; i++) {
      const clue = islands[i].clue;
      let sumMin = 0;
      let sumMax = 0;
      for (const eIdx of incident[i]) {
        sumMin += edges[eIdx].mn;
        sumMax += edges[eIdx].mx;
      }
      if (sumMin > clue || sumMax < clue) return 'bad';

      const saturating = clue === sumMax;
      for (const eIdx of incident[i]) {
        const e = edges[eIdx];
        const newMn = Math.max(e.mn, clue - sumMax + e.mx);
        const newMx = Math.min(e.mx, clue - sumMin + e.mn);
        if (newMn > newMx) return 'bad';
        if (newMn === e.mn && newMx === e.mx) continue;

        const purelySaturation = saturating && newMn === e.mx && newMx === e.mx;
        if (purelySaturation) stats.saturationFires++;
        else stats.advancedFires++;

        e.mn = newMn;
        e.mx = newMx;
        changed = true;

        if (e.mn > 0) {
          for (const cIdx of e.crosses) {
            const ce = edges[cIdx];
            if (ce.mx > 0) {
              if (ce.mn > 0) return 'bad';
              ce.mx = 0;
              stats.crossingFires++;
              changed = true;
            }
          }
        }
        if (e.mx === 0 && e.mn > 0) return 'bad';
        // Recompute sums because this island's bounds shifted
        sumMin = 0;
        sumMax = 0;
        for (const eIdx2 of incident[i]) {
          sumMin += edges[eIdx2].mn;
          sumMax += edges[eIdx2].mx;
        }
        if (sumMin > clue || sumMax < clue) return 'bad';
      }
    }
  }

  if (!checkFeasibleConnectivity(islands, edges, incident)) return 'bad';
  return 'ok';
}

function checkFeasibleConnectivity(
  islands: Island[],
  edges: Edge[],
  incident: number[][],
): boolean {
  if (islands.length === 0) return true;
  // Closed-component check: if the committed (mn > 0) graph contains a component
  // where every island already has sumMin == clue, no more edges can be added
  // from it — so that component must be the entire puzzle.
  const satisfied: boolean[] = islands.map((_, i) => {
    const clue = islands[i].clue;
    let sumMin = 0;
    for (const eIdx of incident[i]) sumMin += edges[eIdx].mn;
    return sumMin === clue;
  });
  const adj: number[][] = islands.map(() => []);
  for (const e of edges) {
    if (e.mn > 0) {
      adj[e.a].push(e.b);
      adj[e.b].push(e.a);
    }
  }
  const visited = new Array<boolean>(islands.length).fill(false);
  const start = islands.findIndex((_, i) => {
    let sumMin = 0;
    for (const eIdx of incident[i]) sumMin += edges[eIdx].mn;
    return sumMin > 0;
  });
  if (start < 0) return true;
  const stack = [start];
  let componentAllSatisfied = true;
  let componentSize = 0;
  while (stack.length) {
    const v = stack.pop()!;
    if (visited[v]) continue;
    visited[v] = true;
    componentSize++;
    if (!satisfied[v]) componentAllSatisfied = false;
    for (const n of adj[v]) if (!visited[n]) stack.push(n);
  }
  if (componentAllSatisfied && componentSize < islands.length) return false;

  // Reachability via still-alive edges (mx > 0): every island must be reachable
  // from island 0 in this graph, else it's already disconnected.
  const aliveAdj: number[][] = islands.map(() => []);
  for (const e of edges) {
    if (e.mx > 0) {
      aliveAdj[e.a].push(e.b);
      aliveAdj[e.b].push(e.a);
    }
  }
  const reach = new Array<boolean>(islands.length).fill(false);
  const q = [0];
  while (q.length) {
    const v = q.pop()!;
    if (reach[v]) continue;
    reach[v] = true;
    for (const n of aliveAdj[v]) if (!reach[n]) q.push(n);
  }
  for (let i = 0; i < islands.length; i++) if (!reach[i]) return false;
  return true;
}

function isFullyDetermined(edges: Edge[]): boolean {
  for (const e of edges) if (e.mn !== e.mx) return false;
  return true;
}

function isValidSolution(islands: Island[], edges: Edge[], incident: number[][]): boolean {
  for (let i = 0; i < islands.length; i++) {
    let sum = 0;
    for (const eIdx of incident[i]) sum += edges[eIdx].mn;
    if (sum !== islands[i].clue) return false;
  }
  const adj: number[][] = islands.map(() => []);
  for (const e of edges) {
    if (e.mn > 0) {
      adj[e.a].push(e.b);
      adj[e.b].push(e.a);
    }
  }
  if (islands.length === 0) return true;
  const visited = new Array<boolean>(islands.length).fill(false);
  const stack = [0];
  while (stack.length) {
    const v = stack.pop()!;
    if (visited[v]) continue;
    visited[v] = true;
    for (const n of adj[v]) if (!visited[n]) stack.push(n);
  }
  return visited.every(Boolean);
}

function edgesToBridgeMap(edges: Edge[]): Map<string, Bridge> {
  const out = new Map<string, Bridge>();
  for (const e of edges) {
    if (e.mn > 0) {
      out.set(bridgeKey(e.a, e.b), { a: e.a, b: e.b, count: e.mn as 1 | 2 });
    }
  }
  return out;
}

interface SearchState {
  solutions: number;
  solution?: Edge[];
  stats: Stats;
  maxDepth: number;
  requiresGuessing: boolean;
  nodesVisited: number;
  nodeCap: number;
}

function search(
  islands: Island[],
  edges: Edge[],
  incident: number[][],
  state: SearchState,
  depth: number,
): void {
  if (state.solutions >= 2) return;
  if (state.nodesVisited++ > state.nodeCap) return;

  const res = propagate(islands, edges, incident, state.stats);
  if (res === 'bad') return;

  if (isFullyDetermined(edges)) {
    if (isValidSolution(islands, edges, incident)) {
      state.solutions++;
      if (state.solutions === 1) state.solution = cloneEdges(edges);
    }
    return;
  }

  // Pick the undecided edge with the fewest possibilities (mx - mn + 1 == 2 or 3).
  let bestIdx = -1;
  let bestSpan = 99;
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const span = e.mx - e.mn;
    if (span > 0 && span < bestSpan) {
      bestSpan = span;
      bestIdx = i;
      if (span === 1) break;
    }
  }
  if (bestIdx < 0) return;

  state.requiresGuessing = true;
  if (depth + 1 > state.maxDepth) state.maxDepth = depth + 1;

  const lo = edges[bestIdx].mn;
  const hi = edges[bestIdx].mx;
  for (let v = hi; v >= lo; v--) {
    const snapshot = cloneEdges(edges);
    edges[bestIdx].mn = v;
    edges[bestIdx].mx = v;
    search(islands, edges, incident, state, depth + 1);
    for (let k = 0; k < edges.length; k++) {
      edges[k].mn = snapshot[k].mn;
      edges[k].mx = snapshot[k].mx;
    }
    if (state.solutions >= 2) return;
  }
}

export function solveHashi(
  islands: Island[],
  options: { nodeCap?: number } = {},
): SolveResult {
  const { edges, incident } = buildEdges(islands);
  const stats: Stats = { saturationFires: 0, advancedFires: 0, crossingFires: 0 };
  const state: SearchState = {
    solutions: 0,
    stats,
    maxDepth: 0,
    requiresGuessing: false,
    nodesVisited: 0,
    nodeCap: options.nodeCap ?? 20000,
  };

  search(islands, edges, incident, state, 0);

  const solution = state.solution ? edgesToBridgeMap(state.solution) : undefined;
  return {
    unique: state.solutions === 1,
    solvable: state.solutions >= 1,
    requiresGuessing: state.requiresGuessing,
    trivialOnly: stats.advancedFires === 0 && !state.requiresGuessing,
    saturationFires: stats.saturationFires,
    advancedFires: stats.advancedFires,
    crossingFires: stats.crossingFires,
    maxBranchDepth: state.maxDepth,
    solution,
  };
}
