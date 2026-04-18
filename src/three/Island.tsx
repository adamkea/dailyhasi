import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Island as IslandData } from '../game/types';
import { gridToWorld, ISLAND_HEIGHT, ISLAND_RADIUS } from './coords';

interface Props {
  island: IslandData;
  gridSize: number;
  selected: boolean;
  satisfied: boolean;
  over: boolean;
  onPointerDown: () => void;
  onPointerUp: () => void;
}

export function Island({
  island,
  gridSize,
  selected,
  satisfied,
  over,
  onPointerDown,
  onPointerUp,
}: Props) {
  const liftRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const [x, , z] = useMemo(
    () => gridToWorld(island.x, island.y, gridSize),
    [island.x, island.y, gridSize],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (liftRef.current) {
      const targetLift = selected ? 0.3 : over ? 0.15 : 0;
      const bob = Math.sin(t * 2 + island.id) * 0.03;
      liftRef.current.position.y = THREE.MathUtils.lerp(
        liftRef.current.position.y,
        targetLift + bob,
        0.15,
      );
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01;
      const target = selected ? 1.2 : 0.9;
      const current = ringRef.current.scale.x;
      const next = THREE.MathUtils.lerp(current, target, 0.15);
      ringRef.current.scale.setScalar(next);
    }
  });

  const baseColor = satisfied ? '#6bd1a8' : over ? '#ffd27c' : '#7cc4ff';
  const emissive = satisfied ? '#1d6b4e' : over ? '#7a5310' : '#234a7a';

  return (
    <group
      position={[x, 0, z]}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(); }}
      onPointerUp={(e) => { e.stopPropagation(); onPointerUp(); }}
    >
      <group ref={liftRef}>
        <mesh castShadow receiveShadow position={[0, ISLAND_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS * 1.15, ISLAND_HEIGHT, 40]} />
          <meshStandardMaterial
            color={baseColor}
            emissive={emissive}
            emissiveIntensity={selected ? 0.9 : 0.35}
            metalness={0.4}
            roughness={0.35}
          />
        </mesh>

        <mesh position={[0, ISLAND_HEIGHT + 0.02, 0]} castShadow>
          <sphereGeometry args={[ISLAND_RADIUS * 0.78, 32, 32]} />
          <meshStandardMaterial
            color={baseColor}
            emissive={emissive}
            emissiveIntensity={selected ? 1.2 : 0.5}
            metalness={0.5}
            roughness={0.25}
          />
        </mesh>

        <Text
          position={[0, ISLAND_HEIGHT + 0.62, 0]}
          fontSize={0.55}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#0a0e1e"
          fontWeight={700}
        >
          {String(island.clue)}
        </Text>

      </group>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[ISLAND_RADIUS * 1.2, ISLAND_RADIUS * 1.45, 48]} />
        <meshBasicMaterial
          color={selected ? '#ffd27c' : baseColor}
          transparent
          opacity={selected ? 0.9 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
