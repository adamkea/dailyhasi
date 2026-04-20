import { useGame, formatTimer } from '../game/store';

export function WinOverlay() {
  const timerSeconds = useGame(s => s.timerSeconds);
  const reset        = useGame(s => s.reset);
  const setDifficulty = useGame(s => s.setDifficulty);
  const difficulty   = useGame(s => s.difficulty);

  const nextDifficulty = difficulty === 'easy' ? 'medium' : difficulty === 'medium' ? 'hard' : 'easy';

  return (
    <div className="win-overlay">
      <div className="win-card">
        <div className="win-kanji">完 成</div>
        <h2>Bridges connected</h2>
        <p className="win-time">Solved in {formatTimer(timerSeconds)}</p>
        <div className="win-actions">
          <button className="reset-btn" onClick={reset}>Play again</button>
          <button className="reset-btn" onClick={() => setDifficulty(nextDifficulty)}>
            Try {nextDifficulty} →
          </button>
        </div>
      </div>
    </div>
  );
}
