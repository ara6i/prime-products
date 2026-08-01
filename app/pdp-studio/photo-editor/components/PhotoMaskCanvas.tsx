"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type {
  MaskMode,
  MaskPoint,
  MaskStroke,
} from "../types/photoEditor";

interface PhotoMaskCanvasProps {
  imageUrl: string;
  imageAspectRatio: number;
  mode: MaskMode;
  brushSize: number;
  strokes: MaskStroke[];
  onAddStroke: (stroke: MaskStroke) => void;
}

const STROKE_COLORS: Record<MaskMode, string> = {
  retouch: "rgba(70, 82, 255, 0.42)",
  erase: "rgba(255, 61, 83, 0.4)",
  restore: "rgba(0, 196, 136, 0.4)",
};

export function PhotoMaskCanvas({
  imageUrl,
  imageAspectRatio,
  mode,
  brushSize,
  strokes,
  onAddStroke,
}: PhotoMaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeRef = useRef<MaskStroke | null>(null);
  const [activeStroke, setActiveStroke] = useState<MaskStroke | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });

  const paint = useCallback(
    (context: CanvasRenderingContext2D, stroke: MaskStroke, width: number, height: number) => {
      const points = stroke.points;
      if (!points.length) return;
      context.save();
      context.strokeStyle = STROKE_COLORS[stroke.mode];
      context.fillStyle = STROKE_COLORS[stroke.mode];
      context.lineCap = "round";
      context.lineJoin = "round";
      const strokeWidth = stroke.sizeRatio * width;
      context.lineWidth = strokeWidth;
      if (points.length === 1) {
        context.beginPath();
        context.arc(
          points[0].x * width,
          points[0].y * height,
          strokeWidth / 2,
          0,
          Math.PI * 2,
        );
        context.fill();
      } else {
        context.beginPath();
        context.moveTo(points[0].x * width, points[0].y * height);
        points.slice(1).forEach((point) => {
          context.lineTo(point.x * width, point.y * height);
        });
        context.stroke();
      }
      context.restore();
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    [...strokes, ...(activeStroke ? [activeStroke] : [])].forEach((stroke) =>
      paint(context, stroke, rect.width, rect.height),
    );
  }, [activeStroke, paint, strokes]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>): MaskPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const updateCursor = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      visible: true,
    });
  };

  const finishStroke = () => {
    const stroke = activeStrokeRef.current;
    if (stroke) onAddStroke(stroke);
    activeStrokeRef.current = null;
    setActiveStroke(null);
  };

  return (
    <div
      data-testid="mask-canvas"
      className={[
        "relative max-h-[82vh] overflow-hidden bg-white shadow-[0_14px_50px_rgba(0,0,0,0.18)]",
        mode === "retouch"
          ? "w-[min(88%,34rem)]"
          : "w-full max-w-[32rem]",
      ].join(" ")}
      style={{ aspectRatio: imageAspectRatio }}
    >
      <Image
        src={imageUrl}
        alt="Product being edited"
        fill
        unoptimized
        sizes="(max-width: 900px) 60vw, 540px"
        className="select-none object-contain"
        priority
      />
      <canvas
        ref={canvasRef}
        aria-label="Brush editing canvas"
        className="absolute inset-0 size-full cursor-none touch-none"
        onPointerEnter={(event) => updateCursor(event)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.getBoundingClientRect();
          const stroke: MaskStroke = {
            id: `${Date.now()}-${event.pointerId}`,
            mode,
            size: brushSize,
            sizeRatio: brushSize / rect.width,
            points: [pointFromEvent(event)],
          };
          activeStrokeRef.current = stroke;
          setActiveStroke(stroke);
          updateCursor(event);
        }}
        onPointerMove={(event) => {
          updateCursor(event);
          if (!activeStrokeRef.current) return;
          const stroke = {
            ...activeStrokeRef.current,
            points: [...activeStrokeRef.current.points, pointFromEvent(event)],
          };
          activeStrokeRef.current = stroke;
          setActiveStroke(stroke);
        }}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onPointerLeave={() => {
          setCursor((current) => ({ ...current, visible: false }));
          finishStroke();
        }}
      />
      {cursor.visible ? (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full border-2 border-dashed border-[#315cff] bg-[#315cff]/5"
          style={{
            width: brushSize,
            height: brushSize,
            left: cursor.x - brushSize / 2,
            top: cursor.y - brushSize / 2,
          }}
        />
      ) : null}
    </div>
  );
}
