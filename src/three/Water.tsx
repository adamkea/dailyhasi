import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Water({ size }: { size: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (matRef.current) {
      const t = clock.elapsedTime;
      const hue = 0.58 + Math.sin(t * 0.12) * 0.02;
      matRef.current.color.setHSL(hue, 0.6, 0.25);
    }
    if (ref.current) {
      ref.current.position.y = -0.2 + Math.sin(clock.elapsedTime * 0.4) * 0.02;
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size, 24, 24]} />
      <meshStandardMaterial
        ref={matRef}
        color="#1b3a7a"
        metalness={0.2}
        roughness={0.15}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}
