import { useRef, useState, useEffect, useCallback } from 'react';
import { useGame } from '../game/store';
import { Island, Bridge } from '../game/types';
import { canConnect } from '../game/rules';

const CELL_PX = 80;
const PADDING = 44;
const ISLAND_RADIUS = 22;

function gx(col: number) { return PADDING + col * CELL_PX; }
function gy(row: number) { return PADDING + row * CELL_PX; }

interface BridgeLineProps {
  bridge: Bridge;
  islands: Island[];
}

function BridgeLine({ bridge, islands }: BridgeLineProps) {
  const a = islands[bridge.a];
  const b = islands[bridge.b];
  const x1 = gx(a.x), y1 = gy(a.y);
  const x2 = gx(b.x), y2 = gy(b.y);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;

  const trim = ISLAND_RADIUS + 2;
  const ux = dx / len, uy = dy / len;
  const sx = x1 + ux * trim, sy = y1 + uy * trim;
  const ex = x2 - ux * trim, ey = y2 - uy * trim;

  if (bridge.count === 1) {
    return (
      <line
        x1={sx} y1={sy} x2={ex} y2={ey}
        stroke="var(--ink-soft)" strokeWidth={2} strokeLinecap="round"
      />
    );
  }

  // Double bridge — offset perpendicular to direction
  const OFFSET = 4;
  const isHoriz = a.y === b.y;
  const ox = isHoriz ? 0 : OFFSET;
  const oy = isHoriz ? OFFSET : 0;

  return (
    <>
      <line x1={sx - ox} y1={sy - oy} x2={ex - ox} y2={ey - oy}
        stroke="var(--ink-soft)" strokeWidth={1.5} strokeLinecap="round" />
      <line x1={sx + ox} y1={sy + oy} x2={ex + ox} y2={ey + oy}
        stroke="var(--ink-soft)" strokeWidth={1.5} strokeLinecap="round" />
    </>
  );
}

interface PreviewLineProps {
  from: Island;
  to: Island;
}

function PreviewLine({ from, to }: PreviewLineProps) {
  const x1 = gx(from.x), y1 = gy(from.y);
  const x2 = gx(to.x), y2 = gy(to.y);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const trim = ISLAND_RADIUS + 2;
  const ux = dx / len, uy = dy / len;
  return (
    <line
      x1={x1 + ux * trim} y1={y1 + uy * trim}
      x2={x2 - ux * trim} y2={y2 - uy * trim}
      stroke="var(--seal)" strokeWidth={2}
      strokeLinecap="round" strokeDasharray="6 4" opacity={0.45}
    />
  );
}

interface IslandNodeProps {
  island: Island;
  selected: boolean;
  satisfied: boolean;
  hovered: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

function IslandNode({ island, selected, satisfied, hovered, onPointerDown, onPointerUp, onPointerEnter, onPointerLeave }: IslandNodeProps) {
  let fill = 'var(--paper-2)';
  let stroke = 'var(--ink)';
  let strokeWidth = 2;
  let textFill = 'var(--ink)';

  if (selected) {
    fill = 'var(--seal)';
    stroke = 'var(--seal-deep)';
    textFill = '#fff';
  } else if (hovered) {
    fill = 'var(--paper-3)';
    stroke = 'var(--ink-soft)';
  } else if (satisfied) {
    stroke = 'var(--seal)';
    strokeWidth = 2.5;
  }

  return (
    <g
      style={{ cursor: 'pointer' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <circle
        cx={gx(island.x)} cy={gy(island.y)} r={ISLAND_RADIUS}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth}
      />
      <text
        x={gx(island.x)} y={gy(island.y)}
        dominantBaseline="central" textAnchor="middle"
        fontSize={16} fontWeight={600}
        fontFamily="'Shippori Mincho B1', serif"
        fill={textFill}
        pointerEvents="none"
      >
        {island.clue}
      </text>
    </g>
  );
}

export function GameBoard() {
  const puzzle = useGame(s => s.puzzle);
  const bridges = useGame(s => s.bridges);
  const selectedId = useGame(s => s.selectedId);
  const solved = useGame(s => s.solved);
  const setSelected = useGame(s => s.setSelected);
  const attemptConnect = useGame(s => s.attemptConnect);
  const degree = useGame(s => s.degree);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const dragRef = useRef<{ active: boolean; fromId: number | null }>({ active: false, fromId: null });

  const { islands, gridSize } = puzzle;
  const W = gridSize * CELL_PX + 2 * PADDING;
  const H = gridSize * CELL_PX + 2 * PADDING;

  const handleIslandPointerDown = useCallback((id: number, e: React.PointerEvent) => {
    if (solved) return;
    e.stopPropagation();
    dragRef.current = { active: true, fromId: id };
    if (selectedId === id) {
      setSelected(null);
    } else if (selectedId !== null) {
      attemptConnect(selectedId, id);
      setSelected(null);
      dragRef.current = { active: false, fromId: null };
    } else {
      setSelected(id);
    }
  }, [solved, selectedId, setSelected, attemptConnect]);

  const handleIslandPointerUp = useCallback((id: number, e: React.PointerEvent) => {
    if (solved) return;
    e.stopPropagation();
    const { fromId } = dragRef.current;
    if (dragRef.current.active && fromId !== null && fromId !== id) {
      attemptConnect(fromId, id);
      setSelected(null);
      dragRef.current = { active: false, fromId: null };
    }
  }, [solved, attemptConnect, setSelected]);

  const handleIslandPointerEnter = useCallback((id: number) => {
    if (solved) return;
    setHoveredId(id);
  }, [solved]);

  const handleIslandPointerLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  useEffect(() => {
    const cleanup = () => {
      dragRef.current = { active: false, fromId: null };
    };
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
    return () => {
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
    };
  }, []);

  const showPreview = selectedId !== null && hoveredId !== null && hoveredId !== selectedId && !solved;
  const previewValid = showPreview && canConnect(
    islands[selectedId!],
    islands[hoveredId!],
    { islands, bridges }
  ).ok;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%" height="100%"
      style={{ display: 'block', cursor: solved ? 'default' : 'crosshair' }}
      onPointerDown={() => { if (!dragRef.current.active) setSelected(null); }}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Bridges layer */}
      <g>
        {Array.from(bridges.values()).filter(b => b.count > 0).map(b => (
          <BridgeLine key={`${b.a}-${b.b}`} bridge={b} islands={islands} />
        ))}
      </g>

      {/* Preview layer */}
      <g>
        {previewValid && showPreview && (
          <PreviewLine from={islands[selectedId!]} to={islands[hoveredId!]} />
        )}
      </g>

      {/* Islands layer */}
      <g>
        {islands.map(island => (
          <IslandNode
            key={island.id}
            island={island}
            selected={selectedId === island.id}
            satisfied={degree(island.id) === island.clue}
            hovered={hoveredId === island.id && selectedId !== island.id}
            onPointerDown={(e) => handleIslandPointerDown(island.id, e)}
            onPointerUp={(e) => handleIslandPointerUp(island.id, e)}
            onPointerEnter={() => handleIslandPointerEnter(island.id)}
            onPointerLeave={handleIslandPointerLeave}
          />
        ))}
      </g>
    </svg>
  );
}
