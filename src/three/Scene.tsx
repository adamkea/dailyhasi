import { useState } from 'react';
import { Environment, OrbitControls, Stars } from '@react-three/drei';
import { useGame } from '../game/store';
import { Island } from './Island';
import { Bridge } from './Bridge';
import { Water } from './Water';
import { CELL } from './coords';

export function Scene() {
  const puzzle = useGame((s) => s.puzzle);
  const bridges = useGame((s) => s.bridges);
  const selectedId = useGame((s) => s.selectedId);
  const selectIsland = useGame((s) => s.selectIsland);
  const degree = useGame((s) => s.degree);
  const [hovered, setHovered] = useState<number | null>(null);

  const boardSize = (puzzle.gridSize + 4) * CELL;

  return (
    <>
      <color attach="background" args={['#06091a']} />
      <fog attach="fog" args={['#06091a', 18, 38]} />

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
              document.body.style.cursor = 'default';
            }}
          >
            <Island
              island={island}
              gridSize={puzzle.gridSize}
              degree={d}
              selected={selectedId === island.id}
              satisfied={d === island.clue}
              over={hovered === island.id}
              onClick={() => selectIsland(island.id)}
            />
          </group>
        );
      })}

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 5}
        target={[0, 0, 0]}
      />
    </>
  );
}
