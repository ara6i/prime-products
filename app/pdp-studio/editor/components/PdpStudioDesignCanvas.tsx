"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type { DesignAnnotation, DesignDocument, DesignLayer } from "../types/pdpStudioDesign";

interface Props { document: DesignDocument; selectedId: string | null; annotations: DesignAnnotation[]; commentMode: boolean; drawMode:boolean; onSelect(id: string | null): void; onChange(id: string, patch: Partial<DesignLayer>): void; onComment(x: number, y: number): void; onDraw(points:number[]):void; }
export function PdpStudioDesignCanvas({ document, selectedId, annotations, commentMode, drawMode, onSelect, onChange, onComment, onDraw }: Props) {
  const host = useRef<HTMLDivElement>(null); const [size, setSize] = useState({ width: 900, height: 650 });
  const drawing=useRef<number[]>([]); const [drawingPreview,setDrawingPreview]=useState<number[]>([]);
  useEffect(() => { if (!host.current) return; const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); }); observer.observe(host.current); return () => observer.disconnect(); }, []);
  const scale = Math.min((size.width-48)/document.canvas.width, (size.height-48)/document.canvas.height); const stageWidth = document.canvas.width*scale, stageHeight = document.canvas.height*scale;
  return <div ref={host} className="relative grid min-h-[34rem] place-items-center overflow-hidden rounded-[18px] bg-[#e7e9ee] p-6 shadow-inner">
    <Stage width={stageWidth} height={stageHeight} scaleX={scale} scaleY={scale} onMouseDown={event => { const stage = event.target.getStage(); const pointer = stage?.getPointerPosition(); if(!pointer)return; const point=[pointer.x/scale,pointer.y/scale]; if(drawMode){drawing.current=point;setDrawingPreview(point);return;} if (commentMode) { onComment(point[0]!/document.canvas.width, point[1]!/document.canvas.height); return; } if (event.target === stage || event.target.name() === "canvas-bg") onSelect(null); }} onMouseMove={event=>{if(!drawMode||!drawing.current.length)return;const pointer=event.target.getStage()?.getPointerPosition();if(!pointer)return;drawing.current=[...drawing.current,pointer.x/scale,pointer.y/scale];setDrawingPreview(drawing.current)}} onMouseUp={()=>{if(drawMode&&drawing.current.length){onDraw(drawing.current);drawing.current=[];setDrawingPreview([])}}}>
      <Layer><Rect name="canvas-bg" width={document.canvas.width} height={document.canvas.height} fill={document.canvas.background} shadowColor="#111827" shadowBlur={20/scale} shadowOpacity={.12} /></Layer>
      <Layer>{document.layers.map(layer => <DesignNode key={layer.id} layer={layer} selected={selectedId===layer.id} onSelect={() => onSelect(layer.id)} onChange={patch => onChange(layer.id, patch)} />)}</Layer>
      <Layer>{drawingPreview.length?<Line points={drawingPreview} stroke="#315EF5" strokeWidth={8} lineCap="round" lineJoin="round"/>:null}{annotations.filter(note => !note.resolved).map((note,index) => <Group key={note.id} x={note.x*document.canvas.width} y={note.y*document.canvas.height}><Circle radius={18/scale} fill="#F06A3C" shadowColor="#7c2d12" shadowBlur={6/scale} shadowOpacity={.2}/><Text text={String(index+1)} width={36/scale} height={36/scale} x={-18/scale} y={-9/scale} fontSize={18/scale} align="center" fill="white" fontStyle="bold"/></Group>)}</Layer>
    </Stage>
  </div>;
}
function DesignNode({ layer, selected, onSelect, onChange }: { layer: DesignLayer; selected: boolean; onSelect(): void; onChange(patch: Partial<DesignLayer>): void }) {
  const node = useRef<Konva.Node>(null); const transformer = useRef<Konva.Transformer>(null);
  useEffect(() => { if (selected && node.current && transformer.current) { transformer.current.nodes([node.current]); transformer.current.getLayer()?.batchDraw(); } }, [selected]);
  if (!layer.visible) return null;
  const common = { ref: node as never, id: layer.id, x: layer.x, y: layer.y, width: layer.width, height: layer.height, rotation: layer.rotation, opacity: layer.opacity, draggable: !layer.locked, onClick: onSelect, onTap: onSelect, shadowEnabled: layer.effects.shadow.enabled, shadowColor: layer.effects.shadow.color, shadowBlur: layer.effects.shadow.blur, shadowOffsetX: layer.effects.shadow.offsetX, shadowOffsetY: layer.effects.shadow.offsetY, shadowOpacity: layer.effects.shadow.opacity, onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => onChange({ x: event.target.x(), y: event.target.y() }), onTransformEnd: () => { const current = node.current; if (!current) return; const scaleX=current.scaleX(), scaleY=current.scaleY(); current.scaleX(1); current.scaleY(1); onChange({ x: current.x(), y: current.y(), width: Math.max(20,current.width()*scaleX), height: Math.max(20,current.height()*scaleY), rotation: current.rotation() }); } };
  let rendered = null;
  if (layer.type === "image") rendered = <EditorImage layer={layer} common={common} />;
  else if (layer.type === "text") rendered = <Text {...common} text={layer.text} fontFamily={layer.fontFamily} fontSize={layer.fontSize} fontStyle={(layer.fontWeight ?? 400)>=600?"bold":"normal"} fill={layer.color} verticalAlign="middle" />;
  else if (layer.type === "shape" && layer.shape === "ellipse") rendered = <Ellipse {...common} radiusX={layer.width/2} radiusY={layer.height/2} offsetX={-layer.width/2} offsetY={-layer.height/2} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />;
  else if (layer.type === "shape" && layer.shape === "arrow") rendered = <Arrow {...common} points={layer.points ?? [0,0,layer.width,layer.height]} stroke={layer.stroke} fill={layer.stroke} strokeWidth={layer.strokeWidth} />;
  else if (layer.type === "drawing") rendered = <Line {...common} points={layer.points ?? []} stroke={layer.stroke} strokeWidth={layer.strokeWidth} lineCap="round" lineJoin="round" />;
  else rendered = <Rect {...common} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} cornerRadius={10} />;
  return <>{rendered}{selected && !layer.locked ? <Transformer ref={transformer} rotateEnabled enabledAnchors={["top-left","top-right","bottom-left","bottom-right","middle-left","middle-right","top-center","bottom-center"]} borderStroke="#315EF5" anchorStroke="#315EF5" anchorFill="white" anchorSize={10} /> : null}</>;
}
function EditorImage({ layer, common }: { layer: DesignLayer; common: Record<string, unknown> }) { const [image] = useImage(layer.assetUrl ?? "", "anonymous"); return <KonvaImage {...common} image={image} />; }
