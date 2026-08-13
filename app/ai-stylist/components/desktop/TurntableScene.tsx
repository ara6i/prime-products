"use client";

import { useRef, useEffect, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TURNTABLE } from "@/app/ai-stylist/utils/turntable-config";

interface TurntableSceneProps {
  images: string[];
  rotation: number;
  selectedIndex: number;
}

/** Camera setup */
function SceneCamera() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...TURNTABLE.cameraPosition);
    camera.lookAt(
      TURNTABLE.cameraTarget[0],
      TURNTABLE.cameraTarget[1],
      TURNTABLE.cameraTarget[2]
    );
  }, [camera]);

  return null;
}

/** 3D disc — CylinderGeometry with metallic material, spins on Y axis */
function DiscPlatform() {
  const radius = TURNTABLE.discRadius;
  const height = 0.18;
  const segments = 64;

  const topMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e8e8e8",
        metalness: 0.3,
        roughness: 0.15,
      }),
    []
  );

  const sideMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c0c0c0",
        metalness: 0.7,
        roughness: 0.2,
      }),
    []
  );

  const bottomMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a0a0a0",
        metalness: 0.5,
        roughness: 0.4,
      }),
    []
  );

  // Edge lines on the side to show rotation
  const edgeLines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const lineCount = 48;
    const y = height / 2;

    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const x = Math.cos(angle) * (radius + 0.002);
      const z = Math.sin(angle) * (radius + 0.002);
      points.push(new THREE.Vector3(x, y, z));
      points.push(new THREE.Vector3(x, -y, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [radius, height]);

  // Top radial grooves
  const topGrooves = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const grooveCount = 24;
    const y = height / 2 + 0.001;

    for (let i = 0; i < grooveCount; i++) {
      const angle = (i / grooveCount) * Math.PI * 2;
      const innerR = radius * 0.15;
      const outerR = radius * 0.95;
      points.push(
        new THREE.Vector3(Math.cos(angle) * innerR, y, Math.sin(angle) * innerR)
      );
      points.push(
        new THREE.Vector3(Math.cos(angle) * outerR, y, Math.sin(angle) * outerR)
      );
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [radius, height]);

  return (
    <group position={[0, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, height, segments]} />
        <primitive object={sideMaterial} attach="material-0" />
        <primitive object={topMaterial} attach="material-1" />
        <primitive object={bottomMaterial} attach="material-2" />
      </mesh>

      <lineSegments geometry={edgeLines}>
        <lineBasicMaterial color="#a8a8a8" opacity={0.4} transparent />
      </lineSegments>

      <lineSegments geometry={topGrooves}>
        <lineBasicMaterial color="#d0d0d0" opacity={0.25} transparent />
      </lineSegments>
    </group>
  );
}

export function TurntableScene({
  rotation,
}: TurntableSceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Smoothly lerp the group rotation on Y axis (turntable spin)
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      rotation,
      0.15
    );
  });

  return (
    <>
      <SceneCamera />

      {/* Lighting — bright and even so disc stays light */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[0, 10, 5]} intensity={0.8} />
      <directionalLight position={[0, 2, 8]} intensity={0.5} />

      {/* Rotating group */}
      <group ref={groupRef}>
        <DiscPlatform />
      </group>
    </>
  );
}
