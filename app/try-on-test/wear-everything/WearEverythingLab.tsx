"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type {
  WearEverythingModel,
  WearEverythingRow,
  WearEverythingValue,
} from "./wearEverything.server";
import styles from "./wearEverything.module.css";

type Panel = "rows" | "paths" | "recorded" | "extracted" | "landmarks";

const ROW_COLORS: Record<string, string> = {
  neck: "#c084fc",
  chest: "#fb923c",
  underbust: "#facc15",
  waist: "#22d3ee",
  hips: "#34d399",
};

const PATH_COLORS: Record<string, string> = {
  shoulders: "#f472b6",
  left_sleeve: "#38bdf8",
  right_sleeve: "#38bdf8",
  left_inseam: "#a78bfa",
  right_inseam: "#a78bfa",
};

const PANEL_LABELS: Array<{ id: Panel; label: string; count: keyof Pick<WearEverythingModel, "rows" | "segments" | "recorded" | "extracted" | "landmarks"> }> = [
  { id: "rows", label: "Body sections", count: "rows" },
  { id: "paths", label: "Paths", count: "segments" },
  { id: "recorded", label: "Recorded", count: "recorded" },
  { id: "extracted", label: "Extracted", count: "extracted" },
  { id: "landmarks", label: "Landmarks", count: "landmarks" },
];

function format(value: number | null, digits = 1) {
  return value === null ? "—" : value.toFixed(digits);
}

function rowId(id: string) {
  return `row:${id}`;
}

function pathId(id: string) {
  return `path:${id}`;
}

function pointId(label: string) {
  return `landmark:${label}`;
}

function contourPath(row: WearEverythingRow) {
  if (row.contour.length < 3) return "";
  return row.contour.map(([x, y], index) => {
    const px = 58 + x * 44;
    const py = 47 + y * 33;
    return `${index === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`;
  }).join(" ") + " Z";
}

function ShapePreview({ row }: { row: WearEverythingRow }) {
  const path = contourPath(row);
  return (
    <svg viewBox="0 0 116 94" role="img" aria-label={`${row.label} 32-point shape`} className={styles.shapeSvg}>
      <line x1="8" y1="47" x2="108" y2="47" />
      <line x1="58" y1="8" x2="58" y2="86" />
      {path ? <path d={path} style={{ stroke: ROW_COLORS[row.id] ?? "#67e8f9" }} /> : null}
    </svg>
  );
}

function SourcePill({ value }: { value: WearEverythingValue }) {
  const copy = value.visualStatus === "exact-row"
    ? "Certified shape row"
    : value.visualStatus === "exact-path"
      ? "Exact projected path"
      : value.visualStatus === "exact-landmark"
        ? "Exact landmark endpoints"
        : "WEAR number only";
  return <span className={`${styles.sourcePill} ${styles[value.visualStatus]}`}>{copy}</span>;
}

export function WearEverythingLab({ model }: { model: WearEverythingModel }) {
  const [panel, setPanel] = useState<Panel>("rows");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set([
    ...model.rows.map((row) => rowId(row.id)),
    ...model.segments.map((segment) => pathId(segment.id)),
  ]));
  const [showLabels, setShowLabels] = useState(false);

  const landmarksByLabel = useMemo(
    () => new Map(model.landmarks.map((landmark) => [landmark.label, landmark])),
    [model.landmarks],
  );

  const selectedValues = useMemo(
    () => [...model.recorded, ...model.extracted].filter((value) => selected.has(value.id)),
    [model.extracted, model.recorded, selected],
  );

  const activeRows = useMemo(() => {
    const ids = new Set(model.rows.filter((row) => selected.has(rowId(row.id))).map((row) => row.id));
    selectedValues.forEach((value) => {
      if (value.visualStatus === "exact-row" && value.overlayRef) ids.add(value.overlayRef);
    });
    return model.rows.filter((row) => ids.has(row.id));
  }, [model.rows, selected, selectedValues]);

  const activePaths = useMemo(() => {
    const ids = new Set(model.segments.filter((segment) => selected.has(pathId(segment.id))).map((segment) => segment.id));
    selectedValues.forEach((value) => {
      if (value.visualStatus === "exact-path" && value.overlayRef) ids.add(value.overlayRef);
    });
    return model.segments.filter((segment) => ids.has(segment.id));
  }, [model.segments, selected, selectedValues]);

  const activeLandmarkLabels = useMemo(() => {
    const labels = new Set(model.landmarks.filter((landmark) => selected.has(pointId(landmark.label))).map((landmark) => landmark.label));
    selectedValues.forEach((value) => {
      if (value.visualStatus !== "exact-landmark" || !value.overlayRef) return;
      value.overlayRef.split("|").filter((label) => label !== "floor").forEach((label) => labels.add(label));
    });
    return labels;
  }, [model.landmarks, selected, selectedValues]);

  const landmarkGuides = useMemo(() => selectedValues.flatMap((value) => {
    if (value.visualStatus !== "exact-landmark" || !value.overlayRef) return [];
    const [leftLabel, rightLabel] = value.overlayRef.split("|");
    const left = landmarksByLabel.get(leftLabel);
    const right = rightLabel === "floor" ? null : landmarksByLabel.get(rightLabel);
    if (!left || (rightLabel !== "floor" && !right)) return [];
    return [{ value, left, right, toFloor: rightLabel === "floor" }];
  }), [landmarksByLabel, selectedValues]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setGroup = (ids: string[], on: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      ids.forEach((id) => on ? next.add(id) : next.delete(id));
      return next;
    });
  };

  const currentIds = panel === "rows"
    ? model.rows.map((row) => rowId(row.id))
    : panel === "paths"
      ? model.segments.map((segment) => pathId(segment.id))
      : panel === "recorded"
        ? model.recorded.map((value) => value.id)
        : panel === "extracted"
          ? model.extracted.map((value) => value.id)
          : model.landmarks.map((landmark) => pointId(landmark.label));
  const currentAllOn = currentIds.every((id) => selected.has(id));
  const normalizedQuery = query.trim().toLowerCase();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Private source inspection · no GPU</p>
          <h1>Everything WEAR provides</h1>
          <p className={styles.lede}>
            One complete standing subject first. Toggle every certified section, exact path,
            projected landmark, recorded measurement, and extracted standing measurement.
          </p>
        </div>
        <div className={styles.subjectCard}>
          <strong>{model.scanId}</strong>
          <span>{model.gender} · {model.heightCm.toFixed(1)} cm · {model.weightKg.toFixed(1)} kg</span>
          <span>{model.role} split · {model.region} · {model.viewId}</span>
        </div>
      </header>

      <section className={styles.countGrid} aria-label="Exact source inventory">
        <Count value={model.recorded.length} label="recorded values" expected={45} />
        <Count value={model.extracted.length} label="extracted standing" expected={43} />
        <Count value={model.landmarks.length} label="named landmarks" expected={73} />
        <Count value={model.rows.length} label="closed body sections" expected={5} />
        <Count value={model.segments.length} label="projected paths" expected={5} />
      </section>

      <section className={styles.truthStrip}>
        <strong>Honest visual rule</strong>
        <span>Solid row = certified PLY section.</span>
        <span>Path = projected LND chain.</span>
        <span>Dot = named LND point.</span>
        <span>“WEAR number only” never creates a fake line.</span>
      </section>

      <section className={styles.sourceGrid} aria-label="Raw WEAR source layers">
        <SourceFact
          title="3D PLY surface"
          value={model.surfaceSchema.meaning}
          detail={`${model.surfaceSchema.required.join(" · ")} · optional ${model.surfaceSchema.optional.join(" / ")}`}
          foot={model.surfaceSchema.unitRule}
        />
        <SourceFact
          title="3D LND anatomy"
          value={`${model.landmarks.length} named XYZ points in millimetres`}
          detail="The canvas shows the same points projected through the exact front camera."
          foot={model.sourceFiles.landmarks}
        />
        <SourceFact
          title="Measurement tables"
          value={`${model.recorded.length} recorded + ${model.extracted.length} extracted values`}
          detail={`Height ${model.profileInputSources.height} · weight ${model.profileInputSources.weight}`}
          foot={model.sourceFiles.demographics}
        />
        <SourceFact
          title="Deterministic views"
          value={`${model.viewIds.length} Blender views · ${model.pose}`}
          detail={model.viewIds.join(" · ")}
          foot={`BMI ${model.bmi.toFixed(2)} · schema ${model.schemaVersion} · ${model.pipelineId}`}
        />
      </section>

      <div className={styles.workspace}>
        <section className={styles.viewerCard}>
          <div className={styles.viewerHeader}>
            <div>
              <p className={styles.eyebrow}>Exact Blender card</p>
              <h2>{model.scanId} source geometry</h2>
            </div>
            <button type="button" className={styles.labelButton} onClick={() => setShowLabels((value) => !value)}>
              {showLabels ? "Hide labels" : "Show labels"}
            </button>
          </div>

          <div className={styles.canvasShell}>
            <div className={styles.canvas}>
              <Image
                src={`/api/try-on-test/wear-cpu-progress/card?key=${encodeURIComponent(model.imageKey)}`}
                alt={`${model.scanId} exact WEAR Blender mesh card`}
                fill
                sizes="(max-width: 1000px) 92vw, 560px"
                className={styles.meshImage}
                priority
                unoptimized
              />
              <svg className={styles.overlay} viewBox={`0 0 ${model.render.width} ${model.render.height}`}>
                {activePaths.map((segment) => (
                  <polyline
                    key={segment.id}
                    points={segment.points.map((point) => `${point.x * model.render.width},${point.y * model.render.height}`).join(" ")}
                    fill="none"
                    stroke={PATH_COLORS[segment.id] ?? "#38bdf8"}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {landmarkGuides.map(({ value, left, right, toFloor }) => (
                  <line
                    key={value.id}
                    x1={left.x * model.render.width}
                    y1={left.y * model.render.height}
                    x2={(right?.x ?? left.x) * model.render.width}
                    y2={(right?.y ?? 0.975) * model.render.height}
                    stroke="#f8fafc"
                    strokeOpacity="0.88"
                    strokeWidth="1"
                    strokeDasharray={toFloor ? "3 2" : "2 1"}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {activeRows.map((row) => (
                  <g key={row.id}>
                    <line
                      x1={row.leftX * model.render.width}
                      x2={row.rightX * model.render.width}
                      y1={row.y * model.render.height}
                      y2={row.y * model.render.height}
                      stroke={ROW_COLORS[row.id] ?? "#67e8f9"}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    {showLabels ? (
                      <text
                        x={row.rightX * model.render.width + 3}
                        y={row.y * model.render.height + 1.5}
                        fill={ROW_COLORS[row.id] ?? "#67e8f9"}
                        fontSize="5"
                        fontWeight="700"
                      >{row.label}</text>
                    ) : null}
                  </g>
                ))}
                {model.landmarks.filter((landmark) => activeLandmarkLabels.has(landmark.label)).map((landmark) => (
                  <g key={landmark.id}>
                    <circle cx={landmark.x * model.render.width} cy={landmark.y * model.render.height} r="1.8" fill="#f8fafc" stroke="#0ea5e9" strokeWidth="0.8" />
                    {showLabels ? (
                      <text x={landmark.x * model.render.width + 2.5} y={landmark.y * model.render.height - 2} fill="#e2e8f0" fontSize="4.2">
                        {landmark.label}
                      </text>
                    ) : null}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className={styles.renderFacts}>
            <span>{model.render.width} × {model.render.height}px</span>
            <span>Blender {model.render.blenderVersion}</span>
            <span>{model.render.camera}</span>
            <span>{model.render.source}</span>
          </div>

          <div className={styles.layerButtons}>
            <button onClick={() => setGroup(model.rows.map((row) => rowId(row.id)), true)}>5 rows</button>
            <button onClick={() => setGroup(model.segments.map((segment) => pathId(segment.id)), true)}>5 paths</button>
            <button onClick={() => setGroup(model.landmarks.map((landmark) => pointId(landmark.label)), true)}>73 dots</button>
            <button onClick={() => setSelected(new Set())}>Clear canvas</button>
          </div>
        </section>

        <section className={styles.dataCard}>
          <div className={styles.panelTabs} role="tablist" aria-label="WEAR source groups">
            {PANEL_LABELS.map((item) => (
              <button
                type="button"
                role="tab"
                aria-selected={panel === item.id}
                key={item.id}
                className={panel === item.id ? styles.activeTab : ""}
                onClick={() => { setPanel(item.id); setQuery(""); }}
              >
                {item.label}<span>{model[item.count].length}</span>
              </button>
            ))}
          </div>

          <div className={styles.panelToolbar}>
            <div>
              <h2>{PANEL_LABELS.find((item) => item.id === panel)?.label}</h2>
              <p>{panelHelp(panel)}</p>
            </div>
            <button type="button" onClick={() => setGroup(currentIds, !currentAllOn)}>
              {currentAllOn ? "Hide all" : "Show all"}
            </button>
          </div>

          {(panel === "recorded" || panel === "extracted" || panel === "landmarks") ? (
            <input
              className={styles.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${panel}…`}
              aria-label={`Search ${panel}`}
            />
          ) : null}

          <div className={styles.panelBody}>
            {panel === "rows" ? model.rows.map((row) => (
              <RowCard key={row.id} row={row} checked={selected.has(rowId(row.id))} onToggle={() => toggle(rowId(row.id))} />
            )) : null}

            {panel === "paths" ? model.segments.map((segment) => (
              <ToggleCard
                key={segment.id}
                checked={selected.has(pathId(segment.id))}
                onToggle={() => toggle(pathId(segment.id))}
                title={segment.label}
                value={`${segment.points.length} exact projected points`}
                detail="Path comes from named WEAR landmarks. It is not guessed from RGB."
              />
            )) : null}

            {panel === "recorded" ? (
              <ValueList values={model.recorded} selected={selected} query={normalizedQuery} onToggle={toggle} />
            ) : null}

            {panel === "extracted" ? (
              <ValueList values={model.extracted} selected={selected} query={normalizedQuery} onToggle={toggle} />
            ) : null}

            {panel === "landmarks" ? model.landmarks
              .filter((landmark) => !normalizedQuery || landmark.label.toLowerCase().includes(normalizedQuery))
              .map((landmark) => (
                <ToggleCard
                  key={landmark.id}
                  checked={selected.has(pointId(landmark.label))}
                  onToggle={() => toggle(pointId(landmark.label))}
                  title={landmark.label}
                  value={`XYZ ${format(landmark.x3dMm, 1)}, ${format(landmark.y3dMm, 1)}, ${format(landmark.z3dMm, 1)} mm`}
                  detail={`${landmark.visible ? "Visible" : "Hidden"} in ${model.viewId} · projected x ${landmark.x.toFixed(4)}, y ${landmark.y.toFixed(4)}.`}
                />
              )) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function SourceFact({ title, value, detail, foot }: { title: string; value: string; detail: string; foot: string }) {
  return (
    <article className={styles.sourceFact}>
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
      <small title={foot}>{foot}</small>
    </article>
  );
}

function Count({ value, label, expected }: { value: number; label: string; expected: number }) {
  const complete = value === expected;
  return (
    <div className={styles.countCard}>
      <strong>{value}<small>/{expected}</small></strong>
      <span>{label}</span>
      <em>{complete ? "complete" : "incomplete"}</em>
    </div>
  );
}

function panelHelp(panel: Panel) {
  if (panel === "rows") return "Closed 32-point PLY sections with A–B, C–D, walked shape, and recorded tape.";
  if (panel === "paths") return "Exact front-view polylines built from WEAR landmark chains.";
  if (panel === "recorded") return "All 45 WEAR measurement-table values. Only source-certified geometry is drawn.";
  if (panel === "extracted") return "All 43 standing values computed from the named 3D landmarks.";
  return "All 73 LND points projected through the exact Blender front camera.";
}

function RowCard({ row, checked, onToggle }: { row: WearEverythingRow; checked: boolean; onToggle: () => void }) {
  return (
    <article className={`${styles.rowCard} ${checked ? styles.checkedCard : ""}`}>
      <label className={styles.checkLine}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span style={{ background: ROW_COLORS[row.id] }} />
        <strong>{row.label}</strong>
        <em>{row.accepted ? "Certified" : "Rejected"}</em>
      </label>
      <div className={styles.rowContent}>
        <ShapePreview row={row} />
        <dl>
          <div><dt>A–B width</dt><dd>{format(row.widthCm)} cm</dd></div>
          <div><dt>C–D depth</dt><dd>{format(row.depthCm)} cm</dd></div>
          <div><dt>Walked shape</dt><dd>{format(row.walkedCm)} cm</dd></div>
          <div><dt>WEAR tape</dt><dd>{format(row.tapeCm)} cm</dd></div>
        </dl>
      </div>
      <details>
        <summary>Exact protocols</summary>
        <p><strong>Mesh:</strong> {row.meshProtocol}</p>
        <p><strong>Tape:</strong> {row.protocol}</p>
      </details>
    </article>
  );
}

function ToggleCard({ checked, onToggle, title, value, detail }: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <label className={`${styles.toggleCard} ${checked ? styles.checkedCard : ""}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <b>{value}</b>
    </label>
  );
}

function ValueList({ values, selected, query, onToggle }: {
  values: WearEverythingValue[];
  selected: Set<string>;
  query: string;
  onToggle: (id: string) => void;
}) {
  const filtered = values.filter((value) => !query
    || value.label.toLowerCase().includes(query)
    || value.category.toLowerCase().includes(query)
    || value.key.toLowerCase().includes(query));
  const groups = Map.groupBy(filtered, (value) => value.category);
  return [...groups.entries()].map(([category, entries]) => (
    <section className={styles.valueGroup} key={category}>
      <h3>{category}<span>{entries.length}</span></h3>
      {entries.map((value) => (
        <label className={`${styles.valueCard} ${selected.has(value.id) ? styles.checkedCard : ""}`} key={value.id}>
          <input type="checkbox" checked={selected.has(value.id)} onChange={() => onToggle(value.id)} />
          <span className={styles.valueCopy}>
            <strong>{value.label}</strong>
            <SourcePill value={value} />
            {value.visualStatus === "recorded-value-only" ? (
              <small>Value is real. No certified visual path is attached to this card yet.</small>
            ) : null}
          </span>
          <b>{value.displayValue.toFixed(value.displayUnit === "kg" ? 1 : 2)} {value.displayUnit}</b>
        </label>
      ))}
    </section>
  ));
}
