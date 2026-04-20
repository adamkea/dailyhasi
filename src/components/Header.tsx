import { useGame } from '../game/store';

interface HeaderProps {
  onOpenRules: () => void;
}

export function Header({ onOpenRules }: HeaderProps) {
  const dateLabel = useGame(s => s.dateLabel);
  const puzzle = useGame(s => s.puzzle);

  return (
    <header className="masthead">
      <div className="dateline">
        <div>{dateLabel}</div>
        <div className="puzzle-id">No.{puzzle.id.split('-')[1] ?? '001'}</div>
      </div>
      <div className="brand">
        <div className="brand-kanji">橋 を か け ろ</div>
        <h1>Daily <em>Hashi</em></h1>
      </div>
      <div className="meta-right">
        <button className="rules-btn" onClick={onOpenRules}>How to play</button>
        <div className="seal">日</div>
      </div>
    </header>
  );
}
