export const CELL = 1.6;

export function gridToWorld(x: number, y: number, gridSize: number): [number, number, number] {
  const offset = ((gridSize - 1) * CELL) / 2;
  return [x * CELL - offset, 0, y * CELL - offset];
}

export const ISLAND_RADIUS = 0.45;
export const ISLAND_HEIGHT = 0.35;
