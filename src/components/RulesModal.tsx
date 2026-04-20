import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

export function RulesModal({ open, onClose }: RulesModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>× Close</button>
        <div className="modal-kanji">橋</div>
        <h3>How to play</h3>
        <div className="modal-subtitle">— Hashiwokakero —</div>
        <ol className="rules-list">
          <li>Each numbered island must have exactly that many bridges touching it.</li>
          <li>Bridges run only horizontally or vertically, in straight lines between two islands.</li>
          <li>At most two bridges may connect the same pair of islands.</li>
          <li>Bridges may not cross other bridges, and may not pass through islands.</li>
          <li>When solved, every island must belong to a single connected network.</li>
        </ol>
        <div className="modal-tip">"一つの橋が、すべてを結ぶ。"</div>
      </div>
    </div>,
    document.body
  );
}
