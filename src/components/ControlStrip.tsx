import { useEffect } from 'react';
import { useGame, Difficulty } from '../game/store';

const TABS: { key: Difficulty; en: string; jp: string }[] = [
  { key: 'easy',   en: 'Easy',   jp: '初級' },
  { key: 'medium', en: 'Medium', jp: '中級' },
  { key: 'hard',   en: 'Hard',   jp: '上級' },
];

export function ControlStrip() {
  const difficulty   = useGame(s => s.difficulty);
  const timerActive  = useGame(s => s.timerActive);
  const setDifficulty = useGame(s => s.setDifficulty);
  const tickTimer    = useGame(s => s.tickTimer);
  const completed    = useGame(s => s.completed);

  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(tickTimer, 1000);
    return () => clearInterval(id);
  }, [timerActive, tickTimer]);

  return (
    <div className="control-strip">
      <div className="tabs" role="tablist" aria-label="Difficulty">
        {TABS.map(t => (
          <button
            key={t.key}
            className="tab"
            role="tab"
            aria-selected={difficulty === t.key}
            data-completed={completed[t.key] ? 'true' : undefined}
            onClick={() => setDifficulty(t.key)}
          >
            <span className="tab-jp">{t.jp}</span>
            {t.en}
          </button>
        ))}
      </div>
    </div>
  );
}
