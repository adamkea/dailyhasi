export type IslandId = number;

export interface Island {
  id: IslandId;
  x: number;
  y: number;
  clue: number;
}

export interface Bridge {
  a: IslandId;
  b: IslandId;
  count: 0 | 1 | 2;
}

export interface Puzzle {
  id: string;
  gridSize: number;
  islands: Island[];
  solution: Bridge[];
}

export type Orientation = 'h' | 'v';

export function bridgeKey(a: IslandId, b: IslandId): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
