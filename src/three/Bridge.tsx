import { useMemo } from 'react';
import * as THREE from 'three';
import { Island } from '../game/types';
import { gridToWorld, ISLAND_HEIGHT, ISLAND_RADIUS } from './coords';

interface Props {
  a: Island;
  b: Island;
  count: 1 | 2;
  gridSize: number;
}

const BRIDGE_COLOR = '#ffd27c';
const BRIDGE_EMISSIVE = '#8a5e1a';

export function Bridge({ a, b, count, gridSize }: Props) {
  const { position, rotation, length } = useMemo(() => {
    const [ax, , az] = gridToWorld(a.x, a.y, gridSize);
    const [bx, , bz] = gridToWorld(b.x, b.y, gridSize);
    const dx = bx - ax;
    const dz = bz - az;
    const dist = Math.hypot(dx, dz);
    const trimmed = Math.max(0.01, dist - ISLAND_RADIUS * 1.4);
    const midX = (ax + bx) / 2;
    const midZ = (az + bz) / 2;
    const angle = Math.atan2(dz, dx);
    return {
      position: new THREE.Vector3(midX, ISLAND_HEIGHT * 0.55, midZ),
      rotation: new THREE.Euler(0, -angle, 0),
      length: trimmed,
    };
  }, [a, b, gridSize]);

  const offsets: number[] = count === 2 ? [-0.12, 0.12] : [0];

  return (
    <group position={position} rotation={rotation}>
      {offsets.map((offset, idx) => (
        <group key={idx} position={[0, 0, offset]}>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, length, 20]} />
            <meshStandardMaterial
              color={BRIDGE_COLOR}
              emissive={BRIDGE_EMISSIVE}
              emissiveIntensity={0.7}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, length, 16]} />
            <meshBasicMaterial color={BRIDGE_COLOR} transparent opacity={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
