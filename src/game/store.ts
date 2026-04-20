import { create } from 'zustand';
import { Bridge, Island, Puzzle, bridgeKey } from './types';
import { canConnect, cycleBridge, degreeOf, isSolved } from './rules';
import { GenerateOptions, generatePuzzle } from './generator';
import { dailySeed, dateLabel } from './rng';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  gridSize: number;
  targetIslands: number;
  options: GenerateOptions;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    gridSize: 6,
    targetIslands: 10,
    options: {
      doubleBridgeProb: 0.3,
      extraDoubleBridgeProb: 0.25,
      extraBridgeMultiplier: 1.5,
      maxClue: 6,
      minAdvancedFires: 1,
      requireUnique: true,
    },
  },
  medium: {
    gridSize: 7,
    targetIslands: 12,
    options: {
      doubleBridgeProb: 0.3,
      extraDoubleBridgeProb: 0.25,
      extraBridgeMultiplier: 1.5,
      maxClue: 7,
      minAdvancedFires: 4,
      requireUnique: true,
    },
  },
  hard: {
    gridSize: 9,
    targetIslands: 18,
    options: {
      doubleBridgeProb: 0.25,
      extraDoubleBridgeProb: 0.2,
      extraBridgeMultiplier: 1.2,
      maxClue: 8,
      minAdvancedFires: 10,
      requireUnique: true,
    },
  },
};

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const STORAGE_PREFIX = 'hashi:v1:';

function storageKey(seed: number, d: Difficulty): string {
  return `${STORAGE_PREFIX}${seed}:${d}`;
}

interface StoredProgress {
  bridges: Map<string, Bridge>;
  timerSeconds: number;
  solved: boolean;
}

function loadProgress(seed: number, d: Difficulty): StoredProgress | null {
  try {
    const raw = localStorage.getItem(storageKey(seed, d));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      bridges: Array<[string, Bridge]>;
      timerSeconds: number;
      solved: boolean;
    };
    return {
      bridges: new Map(parsed.bridges),
      timerSeconds: parsed.timerSeconds ?? 0,
      solved: !!parsed.solved,
    };
  } catch {
    return null;
  }
}

function saveProgress(seed: number, d: Difficulty, p: StoredProgress): void {
  try {
    const payload = JSON.stringify({
      bridges: Array.from(p.bridges.entries()),
      timerSeconds: p.timerSeconds,
      solved: p.solved,
    });
    localStorage.setItem(storageKey(seed, d), payload);
  } catch {
    // storage unavailable or quota exceeded — ignore
  }
}

function pruneStaleProgress(currentSeed: number): void {
  try {
    const currentPrefix = `${STORAGE_PREFIX}${currentSeed}:`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && !key.startsWith(currentPrefix)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function loadCompletionMap(seed: number): Record<Difficulty, boolean> {
  const map: Record<Difficulty, boolean> = { easy: false, medium: false, hard: false };
  for (const d of DIFFICULTIES) {
    const p = loadProgress(seed, d);
    if (p?.solved) map[d] = true;
  }
  return map;
}

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
  completed: Record<Difficulty, boolean>;

  setSelected: (id: number | null) => void;
  attemptConnect: (fromId: number, toId: number) => void;
  removeBridge: (a: number, b: number) => void;
  reset: () => void;
  undoLast: () => void;
  tryConnect: (a: Island, b: Island) => void;
  degree: (id: number) => number;
  setDifficulty: (d: Difficulty) => void;
  tickTimer: () => void;
}

function buildPuzzle(difficulty: Difficulty, seed: number): Puzzle {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  return generatePuzzle(seed, cfg.gridSize, cfg.targetIslands, cfg.options);
}

export const useGame = create<GameState>((set, get) => {
  const now = new Date();
  const seed = dailySeed(now);
  pruneStaleProgress(seed);

  const initialDifficulty: Difficulty = 'medium';
  const puzzle = buildPuzzle(initialDifficulty, seed);
  const stored = loadProgress(seed, initialDifficulty);
  const completed = loadCompletionMap(seed);

  const persist = () => {
    const s = get();
    saveProgress(dailySeed(new Date()), s.difficulty, {
      bridges: s.bridges,
      timerSeconds: s.timerSeconds,
      solved: s.solved,
    });
  };

  return {
    puzzle,
    bridges: stored?.bridges ?? new Map(),
    selectedId: null,
    dateLabel: dateLabel(now),
    solved: stored?.solved ?? false,
    errorFlash: null,
    history: [],
    difficulty: initialDifficulty,
    timerSeconds: stored?.timerSeconds ?? 0,
    timerActive: false,
    completed,

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

    removeBridge: (aId, bId) => {
      const { bridges, history, solved } = get();
      if (solved) return;
      const key = bridgeKey(aId, bId);
      if (!bridges.has(key)) return;
      const next = new Map(bridges);
      next.delete(key);
      set({
        bridges: next,
        history: [...history, bridges],
        selectedId: null,
      });
      persist();
    },

    tryConnect: (a, b) => {
      const { puzzle, bridges, history, difficulty, completed } = get();
      const next = cycleBridge(a, b, { islands: puzzle.islands, bridges });
      const solved = isSolved(puzzle.islands, next);
      const nextCompleted =
        solved && !completed[difficulty]
          ? { ...completed, [difficulty]: true }
          : completed;
      set({
        bridges: next,
        history: [...history, bridges],
        solved,
        completed: nextCompleted,
        ...(solved ? { timerActive: false } : {}),
      });
      persist();
    },

    reset: () => {
      const { difficulty, completed } = get();
      const nextCompleted = completed[difficulty]
        ? { ...completed, [difficulty]: false }
        : completed;
      set({
        bridges: new Map(),
        selectedId: null,
        solved: false,
        errorFlash: null,
        history: [],
        timerSeconds: 0,
        timerActive: false,
        completed: nextCompleted,
      });
      persist();
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
      persist();
    },

    degree: (id) => degreeOf(id, get().bridges.values()),

    setDifficulty: (d) => {
      const now = new Date();
      const seed = dailySeed(now);
      const puzzle = buildPuzzle(d, seed);
      const stored = loadProgress(seed, d);
      set({
        difficulty: d,
        puzzle,
        bridges: stored?.bridges ?? new Map(),
        selectedId: null,
        solved: stored?.solved ?? false,
        errorFlash: null,
        history: [],
        timerSeconds: stored?.timerSeconds ?? 0,
        timerActive: false,
      });
    },

    tickTimer: () => {
      if (get().solved) return;
      set((s) => ({ timerSeconds: s.timerSeconds + 1 }));
      persist();
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
