import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ControlStrip } from './components/ControlStrip';
import { GameBoard } from './components/GameBoard';
import { WinOverlay } from './components/WinOverlay';
import { RulesModal } from './components/RulesModal';
import { Toast } from './components/Toast';
import { useGame } from './game/store';

export default function App() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const solved    = useGame(s => s.solved);
  const undoLast  = useGame(s => s.undoLast);
  const reset     = useGame(s => s.reset);
  const setSelected = useGame(s => s.setSelected);
  const puzzle    = useGame(s => s.puzzle);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'z' || e.key === 'Z') undoLast();
      if (e.key === 'r' || e.key === 'R') reset();
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoLast, reset, setSelected]);

  return (
    <div className="page">
      <Header onOpenRules={() => setRulesOpen(true)} />
      <ControlStrip />
      <div className="instructions">
        <span><kbd>Z</kbd> undo · <kbd>R</kbd> reset</span>
      </div>
      <div className="stage-wrap">
        <div className="stage">
          <div className="corner-bl" />
          <div className="corner-br" />
          <GameBoard />
          {solved && <WinOverlay />}
        </div>
        <div className="stage-caption">
          Daily puzzle — {puzzle.id}
        </div>
      </div>
      <footer className="page-footer">
        <div>Hashiwokakero · 橋をかけろ</div>
        <div>No.{puzzle.id.split('-')[1] ?? '001'}</div>
      </footer>
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <Toast />
    </div>
  );
}
