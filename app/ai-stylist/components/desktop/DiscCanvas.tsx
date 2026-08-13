"use client";

import { Suspense, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export interface DiscConfig {
  radius      : number;
  height      : number;
  lerp        : number;
  cameraFov   : number;
  cameraPosY  : number;
  cameraPosZ  : number;
  discY       : number;
  modelBottom : number;
  modelSpread : number;
  modelSize   : number;
}

export const DISC_DEFAULTS: DiscConfig = {
  radius      : 1.4,
  height      : 0.21,
  lerp        : 1,
  cameraFov   : 32,
  cameraPosY  : 1.1,
  cameraPosZ  : 6.3,
  discY       : 10.5,
  modelBottom : 35,
  modelSpread : 23,
  modelSize   : 62,
};

const GLB_PATH = "/images/Meshy_AI_Brushed_Steel_Turntab_0319114408_texture.glb";

interface DiscCanvasProps {
  rotationRef: React.RefObject<number>;
  isDragging : boolean;
  config?    : DiscConfig;
}

function LiveCamera({ fov, posY, posZ }: { fov: number; posY: number; posZ: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // React Three Fiber exposes this imperative camera specifically for scene updates.
    // eslint-disable-next-line react-hooks/immutability
    cam.fov = fov;
    cam.position.set(0, posY, posZ);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [fov, posY, posZ, camera]);
  return null;
}

/* ── Rotating disc loaded from GLB ── */
function RotatingDisc({
  rotationRef, radius, height, lerp, discY,
}: {
  rotationRef: React.RefObject<number>;
  radius: number;
  height: number;
  lerp: number;
  discY: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(GLB_PATH);

  // Clone so we don't mutate the cached original
  const model = useMemo(() => {
    const clone = scene.clone(true);
    // GLB model has radius ≈ 1.0, height ≈ 0.15
    // Scale XZ by radius, Y by radius * height factor
    const heightScale = height / 0.15;
    clone.scale.set(radius, radius * heightScale, radius);
    return clone;
  }, [scene, radius, height]);

  // Concentric groove rings on top surface
  const grooveLines = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const arcPts = 128;
    const y = height * 0.52; // just above the GLB top
    const grooveCount = 14;
    for (let g = 1; g <= grooveCount; g++) {
      const gr = radius * (g / (grooveCount + 1));
      for (let i = 0; i < arcPts; i++) {
        const a0 = (i / arcPts) * Math.PI * 2;
        const a1 = ((i + 1) / arcPts) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a0) * gr, y, Math.sin(a0) * gr));
        pts.push(new THREE.Vector3(Math.cos(a1) * gr, y, Math.sin(a1) * gr));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius, height]);

  // Contact shadow material
  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
    []
  );

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      rotationRef.current ?? 0,
      lerp
    );
  });

  return (
    <group ref={groupRef} position={[0, (discY - 22.5) * 0.03, 0]}>
      <primitive object={model} />

      {/* Concentric grooves on top surface */}
      <lineSegments geometry={grooveLines}>
        <lineBasicMaterial color="#8a8580" opacity={0.18} transparent />
      </lineSegments>

      {/* Ground contact shadow */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -radius * 0.077 - 0.02, 0]}
      >
        <circleGeometry args={[radius * 1.15, 64]} />
        <primitive object={shadowMat} attach="material" />
      </mesh>
    </group>
  );
}

// Preload the GLB
useGLTF.preload(GLB_PATH);

export function DiscCanvas({ rotationRef, config }: DiscCanvasProps) {
  const { radius, height, lerp, cameraFov, cameraPosY, cameraPosZ, discY } = {
    ...DISC_DEFAULTS,
    ...config,
  };

  return (
    <Suspense fallback={null}>
      <Canvas
        className="pointer-events-none"
        style={{ width: "100%", height: "100%" }}
        camera={{ fov: cameraFov, position: [0, cameraPosY, cameraPosZ], near: 0.1, far: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <LiveCamera fov={cameraFov} posY={cameraPosY} posZ={cameraPosZ} />

        {/* Ambient fill */}
        <ambientLight intensity={1.8} />

        {/* Front fill */}
        <directionalLight position={[0, 1, 8]} intensity={0.3} />

        {/* Side fills */}
        <directionalLight position={[-6, 3, 3]} intensity={0.2} />
        <directionalLight position={[6, 3, 3]} intensity={0.2} />

        {/* Back rim light */}
        <directionalLight position={[0, 2, -5]} intensity={0.2} />

        <Suspense fallback={null}>
          <RotatingDisc rotationRef={rotationRef} radius={radius} height={height} lerp={lerp} discY={discY} />
        </Suspense>
      </Canvas>
    </Suspense>
  );
}
