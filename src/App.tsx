import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Scene } from './three/Scene';
import { Hud } from './ui/Hud';

export default function App() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 18, 0], fov: 45, up: [0, 0, -1] }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Hud />
    </div>
  );
}
