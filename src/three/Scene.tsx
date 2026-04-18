import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import { Fog, PerspectiveCamera } from 'three';
import { useGame } from '../game/store';
import { Island } from './Island';
import { Bridge } from './Bridge';
import { Water } from './Water';
import { CELL } from './coords';

function CameraFitter({ gridSize }: { gridSize: number }) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const fovRad = (camera.fov * Math.PI) / 180;
    const aspect = size.width / size.height;
    const halfGrid = ((gridSize - 1) / 2) * CELL;

    // Reserve space for HUD overlays (top date/bridges panel, bottom controls).
    // Capped by a minimum usable fraction so very short viewports still render sensibly.
    const isCompact = Math.min(size.width, size.height) < 520;
    const hudTopPx = isCompact ? 90 : 120;
    const hudBottomPx = isCompact ? 100 : 120;
    const usableHeightPx = Math.max(
      size.height - hudTopPx - hudBottomPx,
      size.height * 0.85,
    );
    const verticalScale = usableHeightPx / size.height;

    // Tight edge margins — the board can press close to the play-area bounds.
    const marginH = 1.05;
    const marginV = 1.08;

    const hHoriz = (halfGrid * marginH) / (Math.tan(fovRad / 2) * aspect);
    const hVert = (halfGrid * marginV) / (Math.tan(fovRad / 2) * verticalScale);
    const newY = Math.max(hVert, hHoriz);

    camera.position.setY(newY);

    // Pan camera so the board centers in the usable region rather than the raw viewport.
    // up = (0, 0, -1) ⇒ screen-up is world -Z, screen-down is world +Z.
    const hudPxOffset = (hudBottomPx - hudTopPx) / 2;
    const worldPerPx = (2 * newY * Math.tan(fovRad / 2)) / size.height;
    camera.position.setZ(hudPxOffset * worldPerPx);

    if (scene.fog instanceof Fog) {
      scene.fog.near = newY * 0.95;
      scene.fog.far = newY * 2.1;
    }
  }, [camera, scene, size.width, size.height, gridSize]);

  return null;
}

export function Scene() {
  const puzzle = useGame((s) => s.puzzle);
  const bridges = useGame((s) => s.bridges);
  const selectedId = useGame((s) => s.selectedId);
  const setSelected = useGame((s) => s.setSelected);
  const attemptConnect = useGame((s) => s.attemptConnect);
  const degree = useGame((s) => s.degree);
  const [hovered, setHovered] = useState<number | null>(null);
  const dragFromRef = useRef<number | null>(null);

  const boardSize = (puzzle.gridSize + 4) * CELL;

  useEffect(() => {
    const endDrag = () => {
      if (dragFromRef.current !== null) {
        dragFromRef.current = null;
        setSelected(null);
      }
      document.body.style.cursor = 'default';
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [setSelected]);

  return (
    <>
      <CameraFitter gridSize={puzzle.gridSize} />
      <color attach="background" args={['#06091a']} />
      <fog attach="fog" args={['#06091a', 17, 38]} />

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-6, 6, -6]} intensity={0.4} color="#7cc4ff" />

      <Stars radius={80} depth={40} count={2500} factor={3} fade speed={0.5} />
      <Environment preset="night" />

      <Water size={boardSize * 1.6} />

      {Array.from(bridges.values()).map((b) => (
        <Bridge
          key={`${b.a}-${b.b}`}
          a={puzzle.islands[b.a]}
          b={puzzle.islands[b.b]}
          count={b.count === 0 ? 1 : b.count}
          gridSize={puzzle.gridSize}
        />
      ))}

      {puzzle.islands.map((island) => {
        const d = degree(island.id);
        return (
          <group
            key={island.id}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(island.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHovered((h) => (h === island.id ? null : h));
              if (dragFromRef.current === null) {
                document.body.style.cursor = 'default';
              }
            }}
          >
            <Island
              island={island}
              gridSize={puzzle.gridSize}
              selected={selectedId === island.id}
              satisfied={d === island.clue}
              over={hovered === island.id}
              onPointerDown={() => {
                dragFromRef.current = island.id;
                setSelected(island.id);
                document.body.style.cursor = 'grabbing';
              }}
              onPointerUp={() => {
                const from = dragFromRef.current;
                if (from !== null && from !== island.id) {
                  attemptConnect(from, island.id);
                }
                dragFromRef.current = null;
                setSelected(null);
                document.body.style.cursor = 'pointer';
              }}
            />
          </group>
        );
      })}
    </>
  );
}
