import { mulberry32 } from './rng';
import { Bridge, Island, Puzzle, bridgeKey } from './types';
import { segmentsCross } from './rules';
import { solveHashi } from './solver';

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export interface GenerateOptions {
  doubleBridgeProb: number;
  extraDoubleBridgeProb: number;
  extraBridgeMultiplier: number;
  maxClue: number;
  minAdvancedFires: number;
  requireUnique: boolean;
}

export const DEFAULT_OPTIONS: GenerateOptions = {
  doubleBridgeProb: 0.3,
  extraDoubleBridgeProb: 0.25,
  extraBridgeMultiplier: 1.5,
  maxClue: 7,
  minAdvancedFires: 2,
  requireUnique: true,
};

interface BuildState {
  gridSize: number;
  islands: Island[];
  bridges: Map<string, Bridge>;
  grid: Map<string, number>;
}

function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

function wouldCross(
  fromIdx: number,
  toIdx: number,
  state: BuildState,
): boolean {
  const from = state.islands[fromIdx];
  const to = state.islands[toIdx];
  for (const existing of state.bridges.values()) {
    const ea = state.islands[existing.a];
    const eb = state.islands[existing.b];
    if (segmentsCross(from, to, ea, eb)) return true;
  }
  return false;
}

function isOnExistingBridge(x: number, y: number, state: BuildState): boolean {
  for (const b of state.bridges.values()) {
    const a = state.islands[b.a];
    const bIsland = state.islands[b.b];
    if (a.y === bIsland.y && y === a.y) {
      const lo = Math.min(a.x, bIsland.x);
      const hi = Math.max(a.x, bIsland.x);
      if (lo < x && x < hi) return true;
    } else if (a.x === bIsland.x && x === a.x) {
      const lo = Math.min(a.y, bIsland.y);
      const hi = Math.max(a.y, bIsland.y);
      if (lo < y && y < hi) return true;
    }
  }
  return false;
}

function islandBetween(
  fromIdx: number,
  x: number,
  y: number,
  state: BuildState,
): boolean {
  const from = state.islands[fromIdx];
  if (from.x === x) {
    const [lo, hi] = from.y < y ? [from.y + 1, y - 1] : [y + 1, from.y - 1];
    for (let yy = lo; yy <= hi; yy++) {
      if (state.grid.has(posKey(x, yy))) return true;
    }
  } else if (from.y === y) {
    const [lo, hi] = from.x < x ? [from.x + 1, x - 1] : [x + 1, from.x - 1];
    for (let xx = lo; xx <= hi; xx++) {
      if (state.grid.has(posKey(xx, y))) return true;
    }
  }
  return false;
}

function addIsland(state: BuildState, x: number, y: number): number {
  const id = state.islands.length;
  state.islands.push({ id, x, y, clue: 0 });
  state.grid.set(posKey(x, y), id);
  return id;
}

function addBridge(
  state: BuildState,
  a: number,
  b: number,
  count: 1 | 2,
): void {
  const key = bridgeKey(a, b);
  const existing = state.bridges.get(key);
  if (existing) {
    existing.count = Math.min(2, existing.count + count) as 1 | 2;
  } else {
    state.bridges.set(key, { a, b, count });
  }
}

function neighborCount(islandIdx: number, state: BuildState): number {
  const isl = state.islands[islandIdx];
  let count = 0;
  for (const [dx, dy] of DIRS) {
    for (let k = 1; k < state.gridSize; k++) {
      const x = isl.x + dx * k;
      const y = isl.y + dy * k;
      if (x < 0 || y < 0 || x >= state.gridSize || y >= state.gridSize) break;
      if (state.grid.has(posKey(x, y))) {
        count++;
        break;
      }
    }
  }
  return count;
}

function tryBuildCandidate(
  rand: () => number,
  gridSize: number,
  targetIslands: number,
  opts: GenerateOptions,
): BuildState | null {
  const state: BuildState = {
    gridSize,
    islands: [],
    bridges: new Map(),
    grid: new Map(),
  };

  const startX = Math.floor(rand() * gridSize);
  const startY = Math.floor(rand() * gridSize);
  addIsland(state, startX, startY);

  let stale = 0;
  while (state.islands.length < targetIslands && stale < 200) {
    const fromIdx = Math.floor(rand() * state.islands.length);
    const from = state.islands[fromIdx];
    const dir = DIRS[Math.floor(rand() * DIRS.length)];
    const step = 1 + Math.floor(rand() * 4);
    const nx = from.x + dir[0] * step;
    const ny = from.y + dir[1] * step;

    if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) {
      stale++;
      continue;
    }
    if (state.grid.has(posKey(nx, ny))) {
      stale++;
      continue;
    }
    if (islandBetween(fromIdx, nx, ny, state)) {
      stale++;
      continue;
    }
    if (isOnExistingBridge(nx, ny, state)) {
      stale++;
      continue;
    }

    const newIdx = state.islands.length;
    state.islands.push({ id: newIdx, x: nx, y: ny, clue: 0 });
    state.grid.set(posKey(nx, ny), newIdx);

    if (wouldCross(fromIdx, newIdx, state)) {
      state.islands.pop();
      state.grid.delete(posKey(nx, ny));
      stale++;
      continue;
    }

    const count: 1 | 2 = rand() < opts.doubleBridgeProb ? 2 : 1;
    addBridge(state, fromIdx, newIdx, count);
    stale = 0;
  }

  if (state.islands.length < Math.max(6, targetIslands - 3)) return null;

  const extraAttempts = Math.floor(state.islands.length * opts.extraBridgeMultiplier);
  for (let i = 0; i < extraAttempts; i++) {
    const a = Math.floor(rand() * state.islands.length);
    const dir = DIRS[Math.floor(rand() * DIRS.length)];
    const ia = state.islands[a];
    let found = -1;
    for (let k = 1; k < gridSize; k++) {
      const x = ia.x + dir[0] * k;
      const y = ia.y + dir[1] * k;
      if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) break;
      const hit = state.grid.get(posKey(x, y));
      if (hit !== undefined) {
        found = hit;
        break;
      }
    }
    if (found < 0 || found === a) continue;
    const key = bridgeKey(a, found);
    const existing = state.bridges.get(key);
    if (existing && existing.count === 2) continue;
    if (!existing && wouldCross(a, found, state)) continue;
    const addCount: 1 | 2 = existing ? 1 : rand() < opts.extraDoubleBridgeProb ? 2 : 1;
    addBridge(state, a, found, addCount);
  }

  for (const b of state.bridges.values()) {
    state.islands[b.a].clue += b.count;
    state.islands[b.b].clue += b.count;
  }

  for (const isl of state.islands) {
    if (isl.clue <= 0 || isl.clue > 8) return null;
    if (isl.clue > opts.maxClue) return null;
  }

  // Reject puzzles where any interior or edge island is "saturated" (clue == 2 * neighbors).
  // A saturated island reveals its entire bridge configuration without any deduction. A
  // single-neighbor island is unavoidable (clue == 2 just means "double bridge to the only
  // neighbor"), so we allow those.
  for (let i = 0; i < state.islands.length; i++) {
    const nbrs = neighborCount(i, state);
    if (nbrs >= 2 && state.islands[i].clue === 2 * nbrs) return null;
  }

  return state;
}

export function generatePuzzle(
  seed: number,
  gridSize = 7,
  targetIslands = 12,
  options: Partial<GenerateOptions> = {},
): Puzzle {
  const opts: GenerateOptions = { ...DEFAULT_OPTIONS, ...options };
  const rand = mulberry32(seed);

  const relaxSteps = [opts.minAdvancedFires, Math.max(1, Math.floor(opts.minAdvancedFires / 2)), 0];
  for (const minAdvanced of relaxSteps) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const state = tryBuildCandidate(rand, gridSize, targetIslands, opts);
      if (!state) continue;

      const result = solveHashi(state.islands, { nodeCap: 30000 });
      if (opts.requireUnique && !result.unique) continue;
      if (!result.solvable) continue;
      if (result.trivialOnly) continue;
      if (result.advancedFires < minAdvanced) continue;

      return {
        id: `seed-${seed}-${gridSize}`,
        gridSize,
        islands: state.islands,
        solution: Array.from(state.bridges.values()),
      };
    }
  }

  throw new Error('Failed to generate puzzle');
}
