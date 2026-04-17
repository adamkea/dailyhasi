import { useGame } from '../game/store';

export function Hud() {
  const dateLabel = useGame((s) => s.dateLabel);
  const puzzleId = useGame((s) => s.puzzle.id);
  const islands = useGame((s) => s.puzzle.islands);
  const bridges = useGame((s) => s.bridges);
  const solved = useGame((s) => s.solved);
  const errorFlash = useGame((s) => s.errorFlash);
  const reset = useGame((s) => s.reset);
  const undoLast = useGame((s) => s.undoLast);
  const historyLen = useGame((s) => s.history.length);

  const totalClues = islands.reduce((acc, i) => acc + i.clue, 0);
  const placed = Array.from(bridges.values()).reduce(
    (acc, b) => acc + b.count * 2,
    0,
  );

  return (
    <div className="hud">
      <div className="topbar">
        <div className="panel">
          <div className="title">Daily Hashi</div>
          <div className="date">{dateLabel}</div>
          <div className="title" style={{ marginTop: 4 }}>{puzzleId}</div>
        </div>
        <div className="panel counter">
          <span className="title">Bridges</span>
          <strong>
            {placed / 2}/{totalClues / 2}
          </strong>
        </div>
      </div>

      {solved && <div className="banner">Solved — see you tomorrow!</div>}
      {!solved && errorFlash && (
        <div className="banner" style={{ background: 'rgba(255, 124, 156, 0.18)' }}>
          {errorFlash}
        </div>
      )}

      <div className="panel" style={{ alignSelf: 'center' }}>
        <div className="controls">
          <button onClick={undoLast} disabled={historyLen === 0}>
            Undo
          </button>
          <button onClick={reset}>Reset</button>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          Click an island, then another to place a bridge. Click again to double it, once more to remove. Drag to orbit.
        </div>
      </div>
    </div>
  );
}
