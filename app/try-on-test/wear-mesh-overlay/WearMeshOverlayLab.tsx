"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { normalizedPhotoPointToSourcePixels } from "./meshProjection";
import {
  OverlayMeshCanvas,
  WearCanonicalCanvas,
  WearMeasurementWorkbench,
  type WearBrowserMesh,
  type WearMetric,
} from "./WearMeasurementWorkbench";
import styles from "./wearMeshOverlay.module.css";

type PhotoId = string;
type ComparisonMode = "overlay" | "split";

interface DatasetRow {
  setId: string;
  label: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  chestCm?: number;
  underChestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  frontImageUrl: string;
  alternateFrontImageUrl?: string;
}

interface PhotoDefinition {
  label: string;
  src: string;
  width: number;
  height: number;
  profile: {
    gender: "female" | "male";
    heightCm: number;
    weightKg: number;
    measurementsCm: {
      chest: number;
      underbust: number;
      waist: number;
      hips: number;
    };
  };
}

interface Candidate {
  scanId: string;
  gender: "female" | "male";
  heightCm: number;
  weightKg: number;
  color: string;
  heightDeltaCm: number;
  weightDeltaKg: number;
  cohortPosition: number;
  measurementsCm: {
    chest: number;
    waist: number;
    hips: number;
  };
}

interface CandidateResponse {
  eligibleCount: number;
  matches: Candidate[];
  shapeRankingComplete: boolean;
  error?: string;
}

interface MeshStats {
  vertexCount: number;
  triangleCount: number;
  outlinePointCount: number;
}

interface MaskMeshPayload {
  vertices: number[];
  triangles: number[];
  outline: number[];
  stats: MeshStats;
  source?: string;
  blenderApiUsed?: boolean;
  generator?: {
    application?: string;
    version?: string;
    headless?: boolean;
    pythonApi?: string;
  };
}

const DELARAM_REFERENCE_ROWS = [
  { id: "waist", heightFractionFromFeet: 0.632 },
  { id: "hips", heightFractionFromFeet: 0.49228944 },
] as const;

function widestOutlineSpanAtY(outline: readonly number[], y: number) {
  const intersections: number[] = [];
  const pointCount = Math.floor(outline.length / 2);
  for (let index = 0; index < pointCount; index += 1) {
    const next = (index + 1) % pointCount;
    const ax = outline[index * 2]!;
    const ay = outline[index * 2 + 1]!;
    const bx = outline[next * 2]!;
    const by = outline[next * 2 + 1]!;
    if (!((ay <= y && by > y) || (by <= y && ay > y))) continue;
    intersections.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
  }
  intersections.sort((left, right) => left - right);
  let widest: readonly [number, number] | null = null;
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    const span = [intersections[index]!, intersections[index + 1]!] as const;
    if (!widest || span[1] - span[0] > widest[1] - widest[0]) widest = span;
  }
  return widest;
}

interface ExactWearPayload {
  error?: string;
  scanId: string;
  metric: WearMetric;
  mesh2d: WearBrowserMesh;
}

const DEFAULT_PHOTOS: Record<string, PhotoDefinition> = {
  delaram: {
    label: "Delaram · clean front",
    src: "/try-on-test/sizing-lab/delaram-front.jpg",
    width: 1920,
    height: 2560,
    profile: {
      gender: "female",
      heightCm: 168,
      weightKg: 70.8,
      measurementsCm: { chest: 102, underbust: 0, waist: 79, hips: 102 },
    },
  },
  "delaram-2": {
    label: "Delaram 2 · tape photo",
    src: "/try-on-test/sizing-lab/delaram-2-front.jpg",
    width: 1920,
    height: 2560,
    profile: {
      gender: "female",
      heightCm: 168,
      weightKg: 70.8,
      measurementsCm: { chest: 102, underbust: 0, waist: 79, hips: 102 },
    },
  },
};

function datasetPhoto(row: DatasetRow): PhotoDefinition {
  return {
    label: row.label,
    src: row.alternateFrontImageUrl || row.frontImageUrl,
    width: 1,
    height: 1,
    profile: {
      gender: row.gender,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      measurementsCm: {
        chest: row.chestCm ?? 0,
        underbust: row.underChestCm ?? 0,
        waist: row.waistCm ?? 0,
        hips: row.hipsCm ?? 0,
      },
    },
  };
}

function visibleMeshUrl(photoId: PhotoId, revision: number) {
  return `/api/try-on-test/wear-mesh-overlay/model?photo=${encodeURIComponent(photoId)}&method=blender-2d&v=${revision}`;
}

const exactWearPayloadCache = new Map<string, Promise<ExactWearPayload>>();

function loadExactWearPayload(photoId: PhotoId, scanId: string) {
  const key = `${photoId}:${scanId}`;
  const cached = exactWearPayloadCache.get(key);
  if (cached) return cached;
  const parameters = new URLSearchParams({ photo: photoId, scan: scanId });
  const request = fetch(`/api/try-on-test/wear-mesh-overlay/workbench?${parameters}`, { cache: "no-store" })
    .then(async (response) => {
      const payload = await response.json() as ExactWearPayload;
      if (!response.ok) throw new Error(payload.error || "Exact WEAR projection is unavailable.");
      return payload;
    })
    .catch((error) => {
      exactWearPayloadCache.delete(key);
      throw error;
    });
  exactWearPayloadCache.set(key, request);
  return request;
}

function VisibleMaskMeshCanvas({
  photoId,
  photo,
  opacity,
  standalone = false,
  revision,
  showDelaramReferenceRows = false,
  onStats,
  onPayload,
}: {
  photoId: PhotoId;
  photo: PhotoDefinition;
  opacity: number;
  standalone?: boolean;
  revision: number;
  showDelaramReferenceRows?: boolean;
  onStats?: (stats: MeshStats | null) => void;
  onPayload?: (payload: MaskMeshPayload | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mesh, setMesh] = useState<MaskMeshPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(visibleMeshUrl(photoId, revision), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Visible mask mesh is unavailable.");
        return response.json() as Promise<MaskMeshPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        setMesh(payload);
        onStats?.(payload.stats);
        onPayload?.(payload);
      })
      .catch(() => {
        if (cancelled) return;
        setMesh(null);
        onStats?.(null);
        onPayload?.(null);
      });
    return () => {
      cancelled = true;
    };
  }, [onPayload, onStats, photoId, revision]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh) return;

    function draw() {
      if (!canvas || !mesh) return;
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextWidth = Math.max(1, Math.round(bounds.width * ratio));
      const nextHeight = Math.max(1, Math.round(bounds.height * ratio));
      if (canvas.width !== nextWidth) canvas.width = nextWidth;
      if (canvas.height !== nextHeight) canvas.height = nextHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);

      const vertices = mesh.vertices;
      const triangles = mesh.triangles;
      let mapX = (value: number) => value * canvas.width;
      let mapY = (value: number) => value * canvas.height;
      if (standalone && vertices.length >= 2) {
        const sourcePhoto = photo;
        const xs: number[] = [];
        const ys: number[] = [];
        for (let index = 0; index < vertices.length; index += 2) {
          // The mesh is stored as normalized photo coordinates. Restore source
          // pixels before fitting so a 1920×2560 photo cannot widen X by 4/3.
          const [sourceX, sourceY] = normalizedPhotoPointToSourcePixels(
            vertices[index]!,
            vertices[index + 1]!,
            sourcePhoto.width,
            sourcePhoto.height,
          );
          xs.push(sourceX);
          ys.push(sourceY);
        }
        const minimumX = Math.min(...xs);
        const maximumX = Math.max(...xs);
        const minimumY = Math.min(...ys);
        const maximumY = Math.max(...ys);
        const padding = 24 * ratio;
        const scale = Math.min(
          (canvas.width - padding * 2) / Math.max(0.001, maximumX - minimumX),
          (canvas.height - padding * 2) / Math.max(0.001, maximumY - minimumY),
        );
        const offsetX = (canvas.width - (maximumX - minimumX) * scale) / 2;
        const offsetY = (canvas.height - (maximumY - minimumY) * scale) / 2;
        mapX = (value: number) => offsetX + (value * sourcePhoto.width - minimumX) * scale;
        mapY = (value: number) => offsetY + (value * sourcePhoto.height - minimumY) * scale;
      }

      context.beginPath();
      for (let index = 0; index < triangles.length; index += 3) {
        const a = triangles[index]! * 2;
        const b = triangles[index + 1]! * 2;
        const c = triangles[index + 2]! * 2;
        context.moveTo(mapX(vertices[a]!), mapY(vertices[a + 1]!));
        context.lineTo(mapX(vertices[b]!), mapY(vertices[b + 1]!));
        context.lineTo(mapX(vertices[c]!), mapY(vertices[c + 1]!));
        context.closePath();
      }
      context.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
      context.lineWidth = Math.max(0.35, 0.46 * ratio);
      context.shadowColor = "rgba(34, 211, 238, 0.65)";
      context.shadowBlur = 2 * ratio;
      context.stroke();

      const outline = mesh.outline;
      if (outline.length >= 4) {
        context.beginPath();
        context.moveTo(mapX(outline[0]!), mapY(outline[1]!));
        for (let index = 2; index < outline.length; index += 2) {
          context.lineTo(mapX(outline[index]!), mapY(outline[index + 1]!));
        }
        context.closePath();
        context.strokeStyle = `rgba(74, 222, 128, ${Math.min(1, opacity + 0.2)})`;
        context.lineWidth = Math.max(1.25, 1.7 * ratio);
        context.shadowColor = "rgba(74, 222, 128, 0.7)";
        context.shadowBlur = 3 * ratio;
        context.stroke();
      }

      if (showDelaramReferenceRows && outline.length >= 4) {
        const ys = outline.filter((_, index) => index % 2 === 1);
        const minimumY = Math.min(...ys);
        const maximumY = Math.max(...ys);
        context.shadowColor = "rgba(239, 68, 68, 0.72)";
        context.shadowBlur = 3 * ratio;
        context.lineCap = "round";
        for (const row of DELARAM_REFERENCE_ROWS) {
          const y = maximumY - row.heightFractionFromFeet * (maximumY - minimumY);
          const span = widestOutlineSpanAtY(outline, y);
          if (!span) continue;
          context.beginPath();
          context.moveTo(mapX(span[0]), mapY(y));
          context.lineTo(mapX(span[1]), mapY(y));
          context.strokeStyle = row.id === "waist" ? "#ef4444" : "#fb7185";
          context.lineWidth = Math.max(2.2, 2.6 * ratio);
          context.stroke();
        }
        context.lineCap = "butt";
        context.shadowBlur = 0;
      }
    }

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", draw);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [mesh, opacity, photo, photoId, showDelaramReferenceRows, standalone]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.projectionCanvas}
      aria-label={standalone ? "Visible 2D mask mesh" : "Visible mask mesh aligned to the photo"}
    />
  );
}

function ExactWearProjectionCanvas({
  photoId,
  scanId,
  photo,
  photoMesh,
  overlay = false,
}: {
  photoId: PhotoId;
  scanId: string;
  photo: PhotoDefinition;
  photoMesh: MaskMeshPayload | null;
  overlay?: boolean;
}) {
  const [payload, setPayload] = useState<ExactWearPayload | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const requestKey = `${photoId}:${scanId}`;

  useEffect(() => {
    let cancelled = false;
    loadExactWearPayload(photoId, scanId)
      .then((result) => {
        if (!cancelled) {
          setError(null);
          setPayload(result);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError({
            key: requestKey,
            message: caught instanceof Error ? caught.message : "Exact WEAR projection is unavailable.",
          });
        }
      });
    return () => { cancelled = true; };
  }, [photoId, requestKey, scanId]);

  if (error?.key === requestKey) return <div className={styles.exactMeshMessage}>{error.message}</div>;
  if (!payload || payload.scanId !== scanId || (overlay && !photoMesh)) {
    return <div className={styles.exactMeshMessage}>Loading exact 2D projection…</div>;
  }

  if (overlay && photoMesh) {
    return (
      <OverlayMeshCanvas
        photo={photo}
        photoMesh={photoMesh}
        wearMesh={payload.mesh2d}
        metric={payload.metric}
        fitVisibleBody
      />
    );
  }

  return <WearCanonicalCanvas mesh={payload.mesh2d} metric={payload.metric} />;
}

function NumberControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className={styles.control}>
      <span>Mesh opacity</span>
      <strong>{value.toFixed(0)}%</strong>
      <input type="range" min={10} max={100} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function WearMeshOverlayLab() {
  const [photoId, setPhotoId] = useState<PhotoId>("delaram");
  const [photos, setPhotos] = useState<Record<string, PhotoDefinition>>(DEFAULT_PHOTOS);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scanId, setScanId] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [cohortError, setCohortError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.78);
  const [comparisonZoom, setComparisonZoom] = useState(1);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("overlay");
  const [meshStats, setMeshStats] = useState<MeshStats | null>(null);
  const [meshPayload, setMeshPayload] = useState<MaskMeshPayload | null>(null);
  const [meshRevision, setMeshRevision] = useState(1);
  const [showDelaramReferenceRows, setShowDelaramReferenceRows] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildMessage, setBuildMessage] = useState<string | null>(null);

  const photo = photos[photoId] ?? DEFAULT_PHOTOS.delaram!;
  const selected = candidates.find((candidate) => candidate.scanId === scanId) ?? candidates[0] ?? null;
  const visibleCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter((candidate) => candidate.scanId.toLowerCase().includes(query));
  }, [candidateSearch, candidates]);

  const photoOptions = useMemo(
    () => Object.entries(photos).sort((left, right) => left[1].label.localeCompare(right[1].label)),
    [photos],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/try-on-test/sizing-lab/dataset", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ rows?: DatasetRow[] }>)
      .then((payload) => {
        if (cancelled) return;
        const rows = (payload.rows ?? []).filter((row) => (
          /^\/try-on-test\/sizing-lab\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png)$/.test(
            row.alternateFrontImageUrl || row.frontImageUrl,
          )
        ));
        const next = Object.fromEntries(rows.map((row) => [row.setId, datasetPhoto(row)]));
        setPhotos({ ...DEFAULT_PHOTOS, ...next });
        for (const row of rows) {
          const definition = datasetPhoto(row);
          const image = new window.Image();
          image.onload = () => {
            if (cancelled) return;
            setPhotos((current) => ({
              ...current,
              [row.setId]: {
                ...definition,
                width: image.naturalWidth,
                height: image.naturalHeight,
              },
            }));
          };
          image.src = definition.src;
        }
      })
      .catch(() => {
        // The two existing Delaram proofs remain available if the shared list fails.
      });
    return () => { cancelled = true; };
  }, []);

  function selectPhoto(nextPhotoId: string) {
    setPhotoId(nextPhotoId);
    setCandidateSearch("");
    setMeshPayload(null);
    setMeshStats(null);
    setBuildMessage(null);
    setComparisonZoom(1);
  }

  useEffect(() => {
    let cancelled = false;
    const parameters = new URLSearchParams({
      gender: photo.profile.gender,
      heightCm: String(photo.profile.heightCm),
      weightKg: String(photo.profile.weightKg),
    });
    fetch(`/api/try-on-test/wear-mesh-overlay/candidates?${parameters}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as CandidateResponse;
        if (!response.ok) throw new Error(payload.error || "The strict WEAR cohort is unavailable.");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setCohortError(null);
        setCandidates(payload.matches);
        setScanId((current) => (
          payload.matches.some((candidate) => candidate.scanId === current)
            ? current
            : payload.matches[0]?.scanId ?? ""
        ));
      })
      .catch((error) => {
        if (cancelled) return;
        setCandidates([]);
        setScanId("");
        setCohortError(error instanceof Error ? error.message : "The strict WEAR cohort is unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, [photo.profile.gender, photo.profile.heightCm, photo.profile.weightKg]);

  async function rebuildWithBlender() {
    setIsBuilding(true);
    setBuildMessage(null);
    try {
      const response = await fetch("/api/try-on-test/wear-mesh-overlay/blender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, imageUrl: photo.src }),
      });
      const payload = await response.json() as {
        error?: string;
        durationMs?: number;
        artifact?: MaskMeshPayload;
      };
      if (!response.ok || !payload.artifact) {
        throw new Error(payload.error || "Blender did not return a mesh.");
      }
      setMeshPayload(payload.artifact);
      setMeshRevision(Date.now());
      setBuildMessage(
        `Built by Blender in ${((payload.durationMs ?? 0) / 1000).toFixed(1)} seconds.`,
      );
    } catch (error) {
      setBuildMessage(error instanceof Error ? error.message : "Blender generation failed.");
    } finally {
      setIsBuilding(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>WEAR Mesh Match · private Test Lab</p>
          <h1>Saved person → Blender 2D mesh</h1>
          <p>The internal mask supplies the boundary. Blender&apos;s Python API builds the cyan triangle mesh.</p>
        </div>
        <div className={styles.statuses}>
          <span>Blender API</span>
          <span>Headless CPU</span>
          <span>No depth</span>
        </div>
      </header>

      <section className={styles.pipeline} aria-label="Visible 2D mesh pipeline">
        <div><b>1</b><span>Front photo<br /><small>visible person pixels</small></span></div>
        <i aria-hidden="true">→</i>
        <div><b>2</b><span>Internal mask<br /><small>background removed</small></span></div>
        <i aria-hidden="true">→</i>
        <div><b>3</b><span>Blender API<br /><small>flat triangle mesh</small></span></div>
        <i aria-hidden="true">→</i>
        <div><b>4</b><span>Strict WEAR cohort<br /><small>shape rank, then real geometry</small></span></div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <label htmlFor="wear-overlay-person">Saved test person</label>
          <select id="wear-overlay-person" value={photoId} onChange={(event) => selectPhoto(event.target.value)}>
            {photoOptions.map(([id, definition]) => (
              <option key={id} value={id}>{definition.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.projectionBadge}>
          {meshStats
            ? `${meshPayload?.generator?.version ?? "Blender"} · ${meshStats.vertexCount.toLocaleString()} points · ${meshStats.triangleCount.toLocaleString()} triangles`
            : "Loading Blender mesh…"}
        </div>
        <button
          type="button"
          data-active={photoId === "delaram" || photoId === "delaram-2" ? showDelaramReferenceRows : false}
          disabled={photoId !== "delaram" && photoId !== "delaram-2"}
          onClick={() => setShowDelaramReferenceRows((value) => !value)}
        >
          {photoId === "delaram" || photoId === "delaram-2"
            ? showDelaramReferenceRows ? "Hide Delaram waist + hips" : "Show Delaram waist + hips"
            : "No saved waist/hip lines"}
        </button>
        <button type="button" onClick={rebuildWithBlender} disabled={isBuilding}>
          {isBuilding ? "Blender is building…" : meshPayload ? "Rebuild this person" : "Build this person with Blender"}
        </button>
      </section>
      {buildMessage ? <p className={styles.buildMessage}>{buildMessage}</p> : null}

      <section className={styles.profileGate} aria-label="Strict WEAR profile gate">
        <div>
          <span>Test person</span>
          <strong>{photo.label}</strong>
        </div>
        <div><span>Gender</span><strong>{photo.profile.gender === "female" ? "Female" : "Male"}</strong></div>
        <div><span>Height</span><strong>{photo.profile.heightCm.toFixed(1)} cm</strong></div>
        <div><span>Weight</span><strong>{photo.profile.weightKg.toFixed(1)} kg</strong></div>
        <div className={styles.hardRule}>
          <span>Hard filter</span>
          <strong>Same gender · ≤1 cm · ≤1 kg</strong>
          <small>No wider fallback</small>
        </div>
      </section>

      <section className={styles.candidateStrip} aria-label="Strict height and weight filtered WEAR bodies">
        <div className={styles.filterSummary}>
          <strong>{cohortError ? "Cohort unavailable" : `${candidates.length} eligible WEAR bodies`}</strong>
          <span>{cohortError ?? "All shown meshes pass the hard profile filter"}</span>
          <label className={styles.candidateSearchLabel}>
            <span>Search model number</span>
            <input
              value={candidateSearch}
              onChange={(event) => setCandidateSearch(event.target.value)}
              placeholder="e.g. NA-1591-A"
              aria-label="Search WEAR model number"
            />
          </label>
        </div>
        {visibleCandidates.map((candidate) => (
          <button
            type="button"
            key={candidate.scanId}
            data-active={candidate.scanId === scanId}
            style={{ "--candidate-color": candidate.color } as React.CSSProperties}
            onClick={() => setScanId(candidate.scanId)}
          >
            <span className={styles.swatch} />
            <strong>{candidate.scanId}</strong>
            <small>
              H {candidate.heightCm.toFixed(1)} · W {candidate.weightKg.toFixed(2)} kg
              <br />Chest {candidate.measurementsCm.chest.toFixed(1)} · Waist {candidate.measurementsCm.waist.toFixed(1)} · Hips {candidate.measurementsCm.hips.toFixed(1)} cm
            </small>
          </button>
        ))}
        {!cohortError && candidateSearch.trim() && visibleCandidates.length === 0 ? (
          <p className={styles.noCandidateMatch}>No model number in this eligible WEAR list.</p>
        ) : null}
      </section>

      <section className={`${styles.viewerGrid} ${comparisonMode === "split" ? styles.viewerGridSplit : ""}`}>
        <article
          className={`${styles.panel} ${styles.photoPanel} ${comparisonMode === "split" ? styles.photoPanelHidden : ""}`}
          aria-hidden={comparisonMode === "split"}
        >
          <div className={styles.panelHeading}>
            <div>
              <span>Exact visible overlay</span>
              <h2>Blender-generated 2D mesh</h2>
            </div>
            <small>Green = detected boundary</small>
          </div>
          <div className={styles.photoStage} style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
            <Image src={photo.src} alt={photo.label} fill priority sizes="(max-width: 900px) 100vw, 42vw" />
            <div className={styles.projectedMeshOverlay}>
              <VisibleMaskMeshCanvas
                photoId={photoId}
                photo={photo}
                opacity={opacity}
                revision={meshRevision}
                showDelaramReferenceRows={(photoId === "delaram" || photoId === "delaram-2") && showDelaramReferenceRows}
                onStats={setMeshStats}
                onPayload={setMeshPayload}
              />
            </div>
            <span className={styles.dragHint}>Blender {meshPayload?.generator?.version ?? "API"} · headless CPU</span>
          </div>
          <p className={styles.overlayNote}>
            The photo and mesh now share the exact same frame. Blender triangulates the visible mask boundary; it does not invent depth.
          </p>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span>{comparisonMode === "overlay" ? "Direct comparison" : "Two-person comparison"}</span>
              <h2>
                {comparisonMode === "overlay"
                  ? `${photo.label.split(" · ")[0]} mesh over real WEAR scan`
                  : `${photo.label.split(" · ")[0]} beside selected WEAR body`}
              </h2>
            </div>
            <div className={styles.comparisonActions}>
              <div className={styles.modeButtons} aria-label="Mesh comparison view">
                <button
                  type="button"
                  data-active={comparisonMode === "overlay"}
                  aria-pressed={comparisonMode === "overlay"}
                  onClick={() => setComparisonMode("overlay")}
                >
                  Overlay
                </button>
                <button
                  type="button"
                  data-active={comparisonMode === "split"}
                  aria-pressed={comparisonMode === "split"}
                  onClick={() => setComparisonMode("split")}
                >
                  Side by side
                </button>
              </div>
              <div className={styles.zoomControls} aria-label="Mesh comparison zoom controls">
                <button type="button" aria-label="Zoom out" onClick={() => setComparisonZoom((value) => Math.max(0.7, Number((value - 0.15).toFixed(2))))}>−</button>
                <strong>{Math.round(comparisonZoom * 100)}%</strong>
                <button type="button" aria-label="Zoom in" onClick={() => setComparisonZoom((value) => Math.min(2, Number((value + 0.15).toFixed(2))))}>+</button>
                <button type="button" onClick={() => setComparisonZoom(1)}>Reset</button>
              </div>
            </div>
          </div>
          {comparisonMode === "overlay" ? (
            <div className={styles.overlayCompareStage} aria-label="Saved person and selected WEAR meshes directly overlaid">
              <div className={styles.zoomSurface} style={{ transform: `scale(${comparisonZoom})` }}>
                {selected ? (
                  <ExactWearProjectionCanvas
                    photoId={photoId}
                    scanId={selected.scanId}
                    photo={photo}
                    photoMesh={meshPayload}
                    overlay
                  />
                ) : null}
              </div>
              <div className={styles.overlayCompareLegend}>
                <span data-mesh="photo">Solid cyan · {photo.label.split(" · ")[0]}</span>
                <span data-mesh="wear">Dashed orange · {selected?.scanId ?? "selected WEAR"}</span>
                <small>Only these two meshes · one shared body-height scale</small>
              </div>
            </div>
          ) : (
            <div className={styles.meshRosterStage} aria-label="Saved person and selected WEAR body side by side">
              <div className={`${styles.meshRosterCard} ${styles.delaramRosterCard}`}>
                <header>
                  <span>Reference</span>
                  <strong>{photo.label.split(" · ")[0]}</strong>
                  <small>H {photo.profile.heightCm.toFixed(1)} cm · W {photo.profile.weightKg.toFixed(1)} kg</small>
                </header>
                <div className={styles.meshRosterVisual}>
                  <div className={styles.zoomSurface} style={{ transform: `scale(${comparisonZoom})` }}>
                    <VisibleMaskMeshCanvas photoId={photoId} photo={photo} opacity={Math.max(opacity, 0.72)} revision={meshRevision} standalone />
                  </div>
                </div>
                <footer>
                  <span>Chest <strong>{photo.profile.measurementsCm.chest.toFixed(1)}</strong></span>
                  <span>Waist <strong>{photo.profile.measurementsCm.waist.toFixed(1)}</strong></span>
                  <span>Hips <strong>{photo.profile.measurementsCm.hips.toFixed(1)}</strong></span>
                  <small>Saved real tape record · cm</small>
                </footer>
              </div>
              {selected ? (
                <div
                  key={selected.scanId}
                  className={styles.meshRosterCard}
                  data-active="true"
                >
                  <header>
                    <span>Selected WEAR body</span>
                    <strong>{selected.scanId}</strong>
                    <small>H {selected.heightCm.toFixed(1)} cm · W {selected.weightKg.toFixed(2)} kg</small>
                  </header>
                  <div className={styles.meshRosterVisual}>
                    <div className={styles.zoomSurface} style={{ transform: `scale(${comparisonZoom})` }}>
                      <ExactWearProjectionCanvas
                        photoId={photoId}
                        scanId={selected.scanId}
                        photo={photo}
                        photoMesh={meshPayload}
                      />
                    </div>
                  </div>
                  <footer>
                    <span>Chest <strong>{selected.measurementsCm.chest.toFixed(1)}</strong></span>
                    <span>Waist <strong>{selected.measurementsCm.waist.toFixed(1)}</strong></span>
                    <span>Hips <strong>{selected.measurementsCm.hips.toFixed(1)}</strong></span>
                    <small>WEAR recorded measurements · cm</small>
                  </footer>
                </div>
              ) : null}
            </div>
          )}
          {selected && comparisonMode === "overlay" ? (
            <div className={styles.selectedRecord}>
              <div><span>Height</span><strong>{selected.heightCm.toFixed(1)} cm</strong><small>Δ {selected.heightDeltaCm.toFixed(1)} cm</small></div>
              <div><span>Weight</span><strong>{selected.weightKg.toFixed(2)} kg</strong><small>Δ {selected.weightDeltaKg.toFixed(2)} kg</small></div>
              <div><span>Chest</span><strong>{selected.measurementsCm.chest.toFixed(1)} cm</strong><small>Real WEAR record</small></div>
              <div><span>Waist</span><strong>{selected.measurementsCm.waist.toFixed(1)} cm</strong><small>Real WEAR record</small></div>
              <div><span>Hips</span><strong>{selected.measurementsCm.hips.toFixed(1)} cm</strong><small>Real WEAR record</small></div>
            </div>
          ) : null}
        </article>
      </section>

      <section className={styles.controlsPanel}>
        <div>
          <h2>Visible 2D shape only</h2>
          <p>Head and hair can be excluded from matching. Torso, arms, hips and legs will be compared separately.</p>
        </div>
        <NumberControl value={opacity * 100} onChange={(value) => setOpacity(value / 100)} />
      </section>

      <WearMeasurementWorkbench
        photoId={photoId}
        photo={photo}
        candidates={candidates}
        selectedScanId={selected?.scanId ?? ""}
        onSelectScan={setScanId}
        photoMesh={meshPayload}
      />

      <section className={styles.truthCard}>
        <strong>What this proves</strong>
        <p>The person selector uses the saved Test Lab datasets. WEAR candidates must pass the same-gender, ±1 cm and ±1 kg filter. The comparison displays only the selected person and one selected WEAR body. This remains private Test Lab evidence, not a released sizing answer.</p>
      </section>
    </main>
  );
}
