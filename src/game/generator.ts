import { mulberry32 } from './rng';
import { Bridge, Island, Puzzle, bridgeKey } from './types';

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

interface BuildState {
  gridSize: number;
  islands: Island[];
  bridges: Map<string, Bridge>;
  grid: Map<string, number>;
}

function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

function segmentsCross(h: Bridge, v: Bridge, islands: Island[]): boolean {
  const a1 = islands[h.a];
  const a2 = islands[h.b];
  const b1 = islands[v.a];
  const b2 = islands[v.b];
  const hy = a1.y;
  const hx1 = Math.min(a1.x, a2.x);
  const hx2 = Math.max(a1.x, a2.x);
  const vx = b1.x;
  const vy1 = Math.min(b1.y, b2.y);
  const vy2 = Math.max(b1.y, b2.y);
  return hx1 < vx && vx < hx2 && vy1 < hy && hy < vy2;
}

function wouldCross(
  fromIdx: number,
  toIdx: number,
  state: BuildState,
): boolean {
  const from = state.islands[fromIdx];
  const to = state.islands[toIdx];
  const horizontal = from.y === to.y;
  const candidate: Bridge = { a: fromIdx, b: toIdx, count: 1 };
  for (const existing of state.bridges.values()) {
    const ea = state.islands[existing.a];
    const eb = state.islands[existing.b];
    const existingHorizontal = ea.y === eb.y;
    if (horizontal === existingHorizontal) continue;
    const h = horizontal ? candidate : existing;
    const v = horizontal ? existing : candidate;
    if (segmentsCross(h, v, state.islands)) return true;
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

export function generatePuzzle(seed: number, targetIslands = 12): Puzzle {
  const rand = mulberry32(seed);
  const gridSize = 7;

  for (let attempt = 0; attempt < 32; attempt++) {
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

      const count: 1 | 2 = rand() < 0.45 ? 2 : 1;
      addBridge(state, fromIdx, newIdx, count);
      stale = 0;
    }

    if (state.islands.length < Math.max(6, targetIslands - 3)) continue;

    const extraAttempts = state.islands.length * 3;
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
      const addCount: 1 | 2 = existing ? 1 : rand() < 0.4 ? 2 : 1;
      addBridge(state, a, found, addCount);
    }

    for (const b of state.bridges.values()) {
      state.islands[b.a].clue += b.count;
      state.islands[b.b].clue += b.count;
    }

    const allValid = state.islands.every((i) => i.clue > 0 && i.clue <= 8);
    if (!allValid) continue;

    return {
      id: `seed-${seed}`,
      gridSize,
      islands: state.islands,
      solution: Array.from(state.bridges.values()),
    };
  }

  throw new Error('Failed to generate puzzle');
}
