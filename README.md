# Daily Hashi

A daily [Hashiwokakero](https://en.wikipedia.org/wiki/Hashiwokakero) (Bridges) puzzle rendered in 3D with React Three Fiber + Drei.

## Stack

- **Vite + React 18 + TypeScript** — app shell
- **@react-three/fiber** — React renderer for three.js
- **@react-three/drei** — helpers (OrbitControls, Text, Environment, Stars)
- **zustand** — game state store

## Scripts

```
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm run preview   # preview the built bundle
```

## How to play

1. Click an island to select it.
2. Click a second island in line (horizontal/vertical) to place a bridge.
3. Click the same pair again to double it; once more to remove it.
4. Drag to orbit, scroll to zoom.

The goal is to connect every island into a single network so each island's clue equals the number of bridges touching it, without bridges crossing.

## Layout

```
src/
  App.tsx                # Canvas + HUD shell
  main.tsx               # React entrypoint
  styles.css             # HUD styling
  game/
    types.ts             # Island, Bridge, Puzzle
    rng.ts               # deterministic daily seed
    generator.ts         # builds a valid daily puzzle
    solver.ts            # constraint-propagation + backtracking Hashi solver
    rules.ts             # canConnect / cycleBridge / isSolved
    store.ts             # zustand game store
  three/
    coords.ts            # grid <-> world helpers
    Scene.tsx            # 3D scene root
    Island.tsx           # island mesh with clue + state ring
    Bridge.tsx           # one or two glowing rods between islands
    Water.tsx            # animated water plane
  ui/
    Hud.tsx              # date, counters, controls
```

## Daily seed

`dailySeed(new Date())` returns `YYYYMMDD`. Combined with `mulberry32` in `src/game/rng.ts` it feeds `generatePuzzle`, so everyone playing on the same day gets the same puzzle.

## Difficulty

Each difficulty tunes both size and the kind of reasoning required. The generator
produces candidates with lower bridge density and rejects any candidate where an
island is "saturated" (clue equals twice its neighbour count — a dead giveaway
that every incident edge is a double bridge). Remaining candidates are then run
through `src/game/solver.ts`; only puzzles with a unique solution that require a
configurable minimum number of non-saturation deductions are accepted.

Per-difficulty knobs live in `DIFFICULTY_CONFIG` in `src/game/store.ts`.

## Next steps

- Persist progress in `localStorage` keyed by seed
- Share-a-streak / emoji grid summary
- Touch-optimised controls and reduced-motion mode
