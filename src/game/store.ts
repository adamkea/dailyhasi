import { create } from 'zustand';
import { Bridge, Island, Puzzle, bridgeKey } from './types';
import { canConnect, cycleBridge, degreeOf, isSolved } from './rules';
import { generatePuzzle } from './generator';
import { dailySeed, dateLabel } from './rng';

export type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { gridSize: number; targetIslands: number }> = {
  easy:   { gridSize: 6,  targetIslands: 10 },
  medium: { gridSize: 7,  targetIslands: 12 },
  hard:   { gridSize: 9,  targetIslands: 18 },
};

interface GameState {
  puzzle: Puzzle;
  bridges: Map<string, Bridge>;
  selectedId: number | null;
  dateLabel: string;
  solved: boolean;
  errorFlash: string | null;
  history: Array<Map<string, Bridge>>;
  difficulty: Difficulty;
  timerSeconds: number;
  timerActive: boolean;

  setSelected: (id: number | null) => void;
  attemptConnect: (fromId: number, toId: number) => void;
  reset: () => void;
  undoLast: () => void;
  tryConnect: (a: Island, b: Island) => void;
  degree: (id: number) => number;
  setDifficulty: (d: Difficulty) => void;
  tickTimer: () => void;
}

function buildInitial(difficulty: Difficulty = 'medium'): { puzzle: Puzzle; label: string } {
  const now = new Date();
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const puzzle = generatePuzzle(dailySeed(now), cfg.gridSize, cfg.targetIslands);
  return { puzzle, label: dateLabel(now) };
}

export const useGame = create<GameState>((set, get) => {
  const { puzzle, label } = buildInitial();

  return {
    puzzle,
    bridges: new Map(),
    selectedId: null,
    dateLabel: label,
    solved: false,
    errorFlash: null,
    history: [],
    difficulty: 'medium',
    timerSeconds: 0,
    timerActive: false,

    setSelected: (id) => set({ selectedId: id }),

    attemptConnect: (fromId, toId) => {
      if (fromId === toId) return;
      const { puzzle, bridges } = get();
      const a = puzzle.islands[fromId];
      const b = puzzle.islands[toId];
      const check = canConnect(a, b, { islands: puzzle.islands, bridges });
      if (!check.ok) {
        const reason = check.reason ?? 'invalid';
        set({ errorFlash: reason });
        setTimeout(() => {
          if (get().errorFlash === reason) set({ errorFlash: null });
        }, 1200);
        return;
      }
      if (!get().timerActive) set({ timerActive: true });
      get().tryConnect(a, b);
    },

    tryConnect: (a, b) => {
      const { puzzle, bridges, history } = get();
      const next = cycleBridge(a, b, { islands: puzzle.islands, bridges });
      const solved = isSolved(puzzle.islands, next);
      set({
        bridges: next,
        history: [...history, bridges],
        solved,
        ...(solved ? { timerActive: false } : {}),
      });
    },

    reset: () => {
      set({
        bridges: new Map(),
        selectedId: null,
        solved: false,
        errorFlash: null,
        history: [],
        timerSeconds: 0,
        timerActive: false,
      });
    },

    undoLast: () => {
      const { history } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      set({
        bridges: prev,
        history: history.slice(0, -1),
        solved: false,
        selectedId: null,
      });
    },

    degree: (id) => degreeOf(id, get().bridges.values()),

    setDifficulty: (d) => {
      const now = new Date();
      const cfg = DIFFICULTY_CONFIG[d];
      const puzzle = generatePuzzle(dailySeed(now), cfg.gridSize, cfg.targetIslands);
      set({
        difficulty: d,
        puzzle,
        bridges: new Map(),
        selectedId: null,
        solved: false,
        errorFlash: null,
        history: [],
        timerSeconds: 0,
        timerActive: false,
      });
    },

    tickTimer: () => {
      if (!get().solved) set((s) => ({ timerSeconds: s.timerSeconds + 1 }));
    },
  };
});

export function bridgeKeyFor(a: number, b: number) {
  return bridgeKey(a, b);
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
