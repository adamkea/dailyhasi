import { Bridge, Island, bridgeKey } from './types';

export interface RuleContext {
  islands: Island[];
  bridges: Map<string, Bridge>;
}

interface Point {
  x: number;
  y: number;
}

export function segmentsCross(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const aHorizontal = a1.y === a2.y;
  const bHorizontal = b1.y === b2.y;
  if (aHorizontal === bHorizontal) return false;
  const h1 = aHorizontal ? a1 : b1;
  const h2 = aHorizontal ? a2 : b2;
  const v1 = aHorizontal ? b1 : a1;
  const v2 = aHorizontal ? b2 : a2;
  const hx1 = Math.min(h1.x, h2.x);
  const hx2 = Math.max(h1.x, h2.x);
  const hy = h1.y;
  const vx = v1.x;
  const vy1 = Math.min(v1.y, v2.y);
  const vy2 = Math.max(v1.y, v2.y);
  return hx1 < vx && vx < hx2 && vy1 < hy && hy < vy2;
}

export function canConnect(
  a: Island,
  b: Island,
  ctx: RuleContext,
): { ok: boolean; reason?: string } {
  if (a.id === b.id) return { ok: false, reason: 'same island' };
  if (a.x !== b.x && a.y !== b.y) return { ok: false, reason: 'not aligned' };

  const horizontal = a.y === b.y;
  const [lo, hi] = horizontal
    ? [Math.min(a.x, b.x), Math.max(a.x, b.x)]
    : [Math.min(a.y, b.y), Math.max(a.y, b.y)];

  for (const other of ctx.islands) {
    if (other.id === a.id || other.id === b.id) continue;
    if (horizontal && other.y === a.y && other.x > lo && other.x < hi) {
      return { ok: false, reason: 'island in the way' };
    }
    if (!horizontal && other.x === a.x && other.y > lo && other.y < hi) {
      return { ok: false, reason: 'island in the way' };
    }
  }

  for (const bridge of ctx.bridges.values()) {
    if (bridge.count === 0) continue;
    const ba = ctx.islands[bridge.a];
    const bb = ctx.islands[bridge.b];
    if (segmentsCross(a, b, ba, bb)) {
      return { ok: false, reason: 'crosses a bridge' };
    }
  }

  return { ok: true };
}

export function cycleBridge(
  a: Island,
  b: Island,
  ctx: RuleContext,
): Map<string, Bridge> {
  const next = new Map(ctx.bridges);
  const key = bridgeKey(a.id, b.id);
  const existing = next.get(key);
  const currentCount = existing?.count ?? 0;
  const nextCount = ((currentCount + 1) % 3) as 0 | 1 | 2;
  if (nextCount === 0) {
    next.delete(key);
  } else {
    next.set(key, { a: a.id, b: b.id, count: nextCount });
  }
  return next;
}

export function degreeOf(
  islandId: number,
  bridges: Iterable<Bridge>,
): number {
  let total = 0;
  for (const b of bridges) {
    if (b.a === islandId || b.b === islandId) total += b.count;
  }
  return total;
}

export function isSolved(
  islands: Island[],
  bridges: Map<string, Bridge>,
): boolean {
  for (const island of islands) {
    if (degreeOf(island.id, bridges.values()) !== island.clue) return false;
  }
  if (islands.length === 0) return true;

  const adj = new Map<number, Set<number>>();
  for (const island of islands) adj.set(island.id, new Set());
  for (const b of bridges.values()) {
    if (b.count === 0) continue;
    adj.get(b.a)!.add(b.b);
    adj.get(b.b)!.add(b.a);
  }
  const seen = new Set<number>();
  const stack = [islands[0].id];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of adj.get(id)!) stack.push(n);
  }
  return seen.size === islands.length;
}
