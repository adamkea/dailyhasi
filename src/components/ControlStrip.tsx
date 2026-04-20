import { useEffect } from 'react';
import { useGame, formatTimer, Difficulty } from '../game/store';

const TABS: { key: Difficulty; en: string; jp: string }[] = [
  { key: 'easy',   en: 'Easy',   jp: '初級' },
  { key: 'medium', en: 'Medium', jp: '中級' },
  { key: 'hard',   en: 'Hard',   jp: '上級' },
];

export function ControlStrip() {
  const difficulty   = useGame(s => s.difficulty);
  const timerSeconds = useGame(s => s.timerSeconds);
  const timerActive  = useGame(s => s.timerActive);
  const bridges      = useGame(s => s.bridges);
  const puzzle       = useGame(s => s.puzzle);
  const history      = useGame(s => s.history);
  const setDifficulty = useGame(s => s.setDifficulty);
  const tickTimer    = useGame(s => s.tickTimer);
  const undoLast     = useGame(s => s.undoLast);
  const reset        = useGame(s => s.reset);

  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(tickTimer, 1000);
    return () => clearInterval(id);
  }, [timerActive, tickTimer]);

  const placed = Array.from(bridges.values()).reduce((sum, b) => sum + b.count, 0);
  const total  = puzzle.islands.reduce((sum, i) => sum + i.clue, 0) / 2;

  return (
    <div className="control-strip">
      <div className="tabs" role="tablist" aria-label="Difficulty">
        {TABS.map(t => (
          <button
            key={t.key}
            className="tab"
            role="tab"
            aria-selected={difficulty === t.key}
            onClick={() => setDifficulty(t.key)}
          >
            <span className="tab-jp">{t.jp}</span>
            {t.en}
          </button>
        ))}
      </div>
      <div className="status-cluster">
        <div className="status-item">
          <span className="pulse" />
          Bridges <span className="value">{placed}/{Math.round(total)}</span>
        </div>
        <div className="divider" />
        <div className="status-item">
          Time <span className="value">{formatTimer(timerSeconds)}</span>
        </div>
        <button
          className="reset-btn"
          onClick={undoLast}
          disabled={history.length === 0}
        >
          Undo
        </button>
        <button className="reset-btn" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
