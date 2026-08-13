"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { TurntableScene } from "./TurntableScene";
import { TURNTABLE } from "@/app/ai-stylist/utils/turntable-config";

interface TurntableCanvasProps {
  images: string[];
  rotation: number;
  selectedIndex: number;
  isDragging: boolean;
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
  children: React.ReactNode;
}

export function TurntableCanvas({
  images,
  rotation,
  selectedIndex,
  isDragging,
  pointerHandlers,
  children,
}: TurntableCanvasProps) {
  return (
    <div className="relative flex-1">
      {/* Layer 0: Three.js Canvas */}
      <Suspense
        fallback={
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: "transparent" }}
          >
            <div className="h-[1.667vw] w-[1.667vw] animate-spin rounded-full border-[0.104vw] border-brand-blue border-t-transparent" />
          </div>
        }
      >
        <Canvas
          className="absolute inset-0 z-0"
          style={{ background: "transparent" }}
          camera={{
            fov: TURNTABLE.fov,
            position: TURNTABLE.cameraPosition,
            near: 0.1,
            far: 100,
          }}
          gl={{ alpha: true, antialias: true }}
        >
          <TurntableScene
            images={images}
            rotation={rotation}
            selectedIndex={selectedIndex}
          />
        </Canvas>
      </Suspense>

      {/* Layer 1: Drag capture surface */}
      <div
        className="absolute inset-0 z-10"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "pan-y",
        }}
        onPointerDown={pointerHandlers.onPointerDown}
        onPointerMove={pointerHandlers.onPointerMove}
        onPointerUp={pointerHandlers.onPointerUp}
        onPointerCancel={pointerHandlers.onPointerUp}
      />

      {/* Layer 2: DOM overlays (buttons, controls) */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {children}
      </div>
    </div>
  );
}
