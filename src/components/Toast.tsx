import { useGame } from '../game/store';

export function Toast() {
  const errorFlash = useGame(s => s.errorFlash);
  if (!errorFlash) return null;
  return <div className="toast">{errorFlash}</div>;
}
