"use client";

import { Center, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import type { Object3D } from "three";
import styles from "./merchantPdpSdk.module.css";

const MODEL_URL =
  "/media/partner-landing/merchant-network/arc-jacket-3d-v1/arc-jacket-cobalt-web.glb";

function JacketModel() {
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child: Object3D) => {
      if (!("isMesh" in child) || !child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  return (
    <Center>
      <primitive object={model} scale={2.35} />
    </Center>
  );
}

export function ArcJacketModelViewer() {
  return (
    <div
      className={styles.modelViewer}
      role="group"
      aria-label="Interactive 3D view of the Cobalt Arc Jacket. Drag left or right to rotate it."
    >
      <Canvas
        className={styles.modelCanvas}
        camera={{ position: [0, 0.02, 4.65], fov: 30, near: 0.1, far: 30 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        shadows
      >
        <ambientLight intensity={1.7} />
        <hemisphereLight args={["#ffffff", "#d8d5cd", 1.15]} />
        <directionalLight position={[4, 5, 5]} intensity={2.2} castShadow />
        <directionalLight position={[-4, 2, 3]} intensity={1.1} />
        <directionalLight position={[0, 3, -4]} intensity={1.35} />
        <Suspense fallback={null}>
          <JacketModel />
          <ContactShadows
            position={[0, -1.2, 0]}
            opacity={0.2}
            scale={3.2}
            blur={2.6}
            far={3}
            resolution={512}
          />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.34}
          maxPolarAngle={Math.PI * 0.66}
          rotateSpeed={0.72}
        />
      </Canvas>
      <span className={styles.modelBadge}>Interactive 3D</span>
      <span className={styles.modelHint}>Drag to rotate</span>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
