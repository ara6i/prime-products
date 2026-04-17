"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Ruler, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sheet,
  SheetContent,
} from "@/app/shared/components/ui/sheet";
import { cn } from "@/app/shared/lib/utils";
import type { DemoSizeGuide, DemoSizeGuideSection, DemoSizeGuideRegion } from "../../types";

interface Props {
  guide: DemoSizeGuide;
  open: boolean;
  onClose: () => void;
}

type Unit = "cm" | "in";

const CM_PER_IN = 2.54;

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n % 1 === 0) return n.toString();
  return n.toFixed(1);
}

/** Convert numeric tokens inside a string ("96", "96-100", "56.5", "63+") */
function convertValueUnits(raw: string, from: Unit, to: Unit): string {
  if (from === to) return raw;
  const factor = to === "in" ? 1 / CM_PER_IN : CM_PER_IN;
  return raw.replace(/(\d+(?:\.\d+)?)/g, (m) => {
    const n = parseFloat(m);
    return Number.isNaN(n) ? m : formatNumber(n * factor);
  });
}

function normalizeSourceUnit(raw: string | undefined): Unit | null {
  if (!raw) return null;
  const u = raw.toLowerCase().trim();
  if (u === "cm" || u === "centimeter" || u === "centimeters") return "cm";
  if (u === "in" || u === "inch" || u === "inches" || u === '"') return "in";
  return null;
}

/* ── Animated region dropdown ── */

function RegionSelect({
  regions,
  value,
  onChange,
}: {
  regions: DemoSizeGuideRegion[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeLabel = regions.find((r) => r.code === value)?.label ?? "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 pl-3.5 pr-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-surface-light text-text-body border border-border-light hover:border-brand-blue focus:border-brand-blue focus:outline-none transition-colors"
      >
        {activeLabel}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-text-hint transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute top-full mt-2 left-0 z-[60] min-w-[148px] bg-white border border-border-light rounded-xl shadow-xl overflow-hidden py-1"
          >
            {regions.map((r) => (
              <button
                key={r.code}
                onClick={() => { onChange(r.code); setOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3.5 py-2 text-xs font-medium text-left transition-colors",
                  value === r.code
                    ? "text-brand-blue bg-brand-blue/5"
                    : "text-text-body hover:bg-surface-light"
                )}
              >
                {r.label}
                {value === r.code && <Check className="h-3 w-3 text-brand-blue flex-shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Size table (unchanged logic) ── */

function SizeTable({
  section,
  unit,
  sourceUnit,
  regionColumns,
  allRegionColumns,
  regionPrimaryColumn,
}: {
  section: DemoSizeGuideSection;
  unit: Unit;
  sourceUnit: Unit | null;
  regionColumns: string[] | null;
  allRegionColumns: Set<string>;
  regionPrimaryColumn?: string | null;
}) {
  const rowKeys = Object.keys(section.rows[0] || {});
  const labelKey =
    (regionPrimaryColumn && rowKeys.includes(regionPrimaryColumn))
      ? regionPrimaryColumn
      : rowKeys.find(
          (k) =>
            k.toLowerCase() === "standard" ||
            k.toLowerCase() === "size" ||
            k.toLowerCase() === "length" ||
            k.toLowerCase() === "fit"
        ) ||
        rowKeys[0] ||
        "Size";

  const allColKeys = rowKeys.filter((k) => k !== labelKey);

  const regionFiltered = regionColumns
    ? allColKeys.filter((k) => regionColumns.includes(k) || !allRegionColumns.has(k))
    : allColKeys;

  const colKeys = regionFiltered.filter((k) => {
    const lower = k.toLowerCase();
    const hasInch = lower.includes("(in)") || lower.endsWith(" in");
    const hasCm = lower.includes("(cm)") || lower.endsWith(" cm");

    if (hasInch) {
      const baseName = lower.replace(/\s*\(in\)\s*/, "").replace(/\s+in$/, "").trim();
      const cmExists = regionFiltered.some((other) => {
        const ol = other.toLowerCase();
        return ol !== lower && ol.includes(baseName) && (ol.includes("(cm)") || ol.endsWith(" cm"));
      });
      return cmExists ? unit === "in" : true;
    }
    if (hasCm) {
      const baseName = lower.replace(/\s*\(cm\)\s*/, "").replace(/\s+cm$/, "").trim();
      const inExists = regionFiltered.some((other) => {
        const ol = other.toLowerCase();
        return ol !== lower && ol.includes(baseName) && (ol.includes("(in)") || ol.endsWith(" in"));
      });
      return inExists ? unit === "cm" : true;
    }
    return true;
  });

  const displayHeader = (key: string): string =>
    key.replace(/\s*\((cm|in)\)\s*$/i, "").trim();

  /** True when the column header carries an explicit unit suffix — in that
   *  case the value is already in the correct unit and must not be re-converted. */
  const columnHasExplicitUnit = (key: string): boolean => {
    const lower = key.toLowerCase();
    return (
      lower.includes("(cm)") ||
      lower.includes("(in)") ||
      lower.endsWith(" cm") ||
      lower.endsWith(" in")
    );
  };

  const displayValue = (val: string | undefined, key: string): string => {
    if (!val) return "\u2014";
    if (!sourceUnit || sourceUnit === unit) return val;
    if (columnHasExplicitUnit(key)) return val;
    return convertValueUnits(val, sourceUnit, unit);
  };

  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-text-primary mb-2">{section.name}</h3>
      {section.description && (
        <p className="text-xs text-text-hint mb-2">{section.description}</p>
      )}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left py-2.5 pr-3 text-xs text-brand-blue font-semibold uppercase tracking-wider">
                {labelKey}
              </th>
              {colKeys.map((key) => (
                <th
                  key={key}
                  className="text-left py-2.5 px-2.5 text-xs text-text-hint font-medium uppercase tracking-wider whitespace-nowrap"
                >
                  {displayHeader(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border-light ${i % 2 === 0 ? "bg-brand-blue/5" : ""}`}
              >
                <td className="py-2.5 pr-3 text-sm font-semibold text-text-primary whitespace-nowrap">
                  {row[labelKey]}
                </td>
                {colKeys.map((key) => (
                  <td key={key} className="py-2.5 px-2.5 text-sm text-text-hint whitespace-nowrap">
                    {displayValue(row[key], key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {section.note && (
        <p className="text-xs text-text-caption mt-1.5 italic">{section.note}</p>
      )}
    </div>
  );
}

/* ── Main drawer ── */

export function SizeGuideModal({ guide, open, onClose }: Props) {
  const [unit, setUnit] = useState<Unit>("cm");
  const [regionCode, setRegionCode] = useState<string>(
    () => guide.regions?.[0]?.code || ""
  );

  useEffect(() => {
    if (open) setRegionCode(guide.regions?.[0]?.code || "");
  }, [open, guide]);

  const hasSections = guide.sections && guide.sections.length > 0;
  const hasFlatTable = guide.headers && guide.rows && guide.rows.length > 0;
  const hasRegions = guide.regions && guide.regions.length > 0;
  const showUnitToggle = !guide.noUnitToggle;
  const sourceUnit = normalizeSourceUnit(guide.unit);

  const activeRegion: DemoSizeGuideRegion | null = hasRegions
    ? guide.regions!.find((r) => r.code === regionCode) || guide.regions![0] || null
    : null;
  const activeRegionColumns: string[] | null = activeRegion ? activeRegion.columns : null;
  const regionPrimaryColumn: string | null = activeRegion?.columns?.[0] ?? null;

  const allRegionColumns = new Set<string>();
  if (hasRegions) {
    for (const r of guide.regions!) {
      for (const c of r.columns) allRegionColumns.add(c);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="bg-black/40 backdrop-blur-sm"
        className="p-0 gap-0 w-full sm:w-[480px] lg:w-[520px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
              <Ruler className="h-4 w-4 text-brand-blue" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-text-primary leading-tight">
                {guide.title}
              </h2>
              {guide.subtitle && (
                <p className="text-xs text-text-hint mt-0.5">{guide.subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-hint hover:text-text-primary hover:bg-surface-light transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Controls — region + unit */}
        {(hasRegions || showUnitToggle) && (
          <div className="flex flex-wrap items-center gap-2.5 px-5 pt-3.5 pb-2 flex-shrink-0">
            {hasRegions && (
              <RegionSelect
                regions={guide.regions!}
                value={regionCode}
                onChange={setRegionCode}
              />
            )}
            {showUnitToggle && (
              <div className="flex gap-1 p-0.5 bg-surface-light rounded-full border border-border-light">
                {(["cm", "in"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={cn(
                      "px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200",
                      unit === u
                        ? "bg-brand-blue text-white shadow-sm"
                        : "text-text-hint hover:text-text-body"
                    )}
                  >
                    {u === "cm" ? "CM" : "Inches"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
          {hasSections &&
            guide.sections!.map((section, i) => (
              <SizeTable
                key={i}
                section={section}
                unit={unit}
                sourceUnit={sourceUnit}
                regionColumns={activeRegionColumns}
                allRegionColumns={allRegionColumns}
                regionPrimaryColumn={regionPrimaryColumn}
              />
            ))}

          {!hasSections && hasFlatTable && (
            <SizeTable
              section={{ name: "", headers: guide.headers!, rows: guide.rows! }}
              unit={unit}
              sourceUnit={sourceUnit}
              regionColumns={activeRegionColumns}
              allRegionColumns={allRegionColumns}
              regionPrimaryColumn={regionPrimaryColumn}
            />
          )}

          {guide.unit && (
            <p className="text-xs text-text-caption mt-1">
              All measurements in {unit === "cm" ? "centimeters" : "inches"}
            </p>
          )}

          {guide.fitTerms && guide.fitTerms.length > 0 && (
            <div className="mt-5 p-4 bg-surface-light border border-border-light rounded-xl">
              <h4 className="text-xs font-semibold text-text-primary mb-2.5 uppercase tracking-wider">
                Fit Terms
              </h4>
              <div className="space-y-2">
                {guide.fitTerms.map((ft, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-sm text-text-primary font-semibold whitespace-nowrap">
                      {ft.name}:
                    </span>
                    <span className="text-sm text-text-hint">{ft.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guide.howToMeasure && guide.howToMeasure.length > 0 && (
            <div className="mt-4 p-4 bg-surface-light border border-border-light rounded-xl">
              <h4 className="text-xs font-semibold text-text-primary mb-2.5 uppercase tracking-wider">
                How to Measure
              </h4>
              <ul className="space-y-2">
                {guide.howToMeasure.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-text-hint leading-relaxed"
                  >
                    <span className="w-4 h-4 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {guide.guideImages && guide.guideImages.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-text-primary mb-2.5 uppercase tracking-wider">
                Measurement Guide
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {guide.guideImages.map((img, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="rounded-xl overflow-hidden bg-surface-light border border-border-light">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    <span className="text-xs text-text-hint text-center font-medium">{img.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}
