import { create } from 'zustand';
import { Bridge, Island, Puzzle, bridgeKey } from './types';
import { canConnect, cycleBridge, degreeOf, isSolved } from './rules';
import { generatePuzzle } from './generator';
import { dailySeed, dateLabel } from './rng';

interface GameState {
  puzzle: Puzzle;
  bridges: Map<string, Bridge>;
  selectedId: number | null;
  dateLabel: string;
  solved: boolean;
  errorFlash: string | null;

  setSelected: (id: number | null) => void;
  attemptConnect: (fromId: number, toId: number) => void;
  reset: () => void;
  undoLast: () => void;
  history: Array<Map<string, Bridge>>;
  tryConnect: (a: Island, b: Island) => void;
  degree: (id: number) => number;
}

function buildInitial(): { puzzle: Puzzle; label: string } {
  const now = new Date();
  const puzzle = generatePuzzle(dailySeed(now));
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
      get().tryConnect(a, b);
    },

    tryConnect: (a, b) => {
      const { puzzle, bridges, history } = get();
      const next = cycleBridge(a, b, {
        islands: puzzle.islands,
        bridges,
      });
      const solved = isSolved(puzzle.islands, next);
      set({
        bridges: next,
        history: [...history, bridges],
        solved,
      });
    },

    reset: () => {
      set({
        bridges: new Map(),
        selectedId: null,
        solved: false,
        errorFlash: null,
        history: [],
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
  };
});

export function bridgeKeyFor(a: number, b: number) {
  return bridgeKey(a, b);
}
