"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Camera, ChevronDown, ExternalLink, Ruler, ShoppingBag, UserRound } from "lucide-react";
import type { AdminProfileUserRaw, ProfileUserListItem } from "../types";

const BODY_MEASUREMENT_ORDER = [
  "height",
  "weight",
  "chest",
  "shoulderWidth",
  "waist",
  "hips",
  "sleeveLength",
  "inseam",
  "neckCircumference",
  "headCircumference",
  "thighCircumference",
  "wristCircumference",
  "footLengthCm",
  "bust",
];

const MEASUREMENT_LABELS: Record<string, string> = {
  height: "Height",
  weight: "Weight",
  chest: "Chest",
  bust: "Bust",
  waist: "Waist",
  hips: "Hips",
  shoulderWidth: "Shoulder width",
  sleeveLength: "Sleeve length",
  inseam: "Inseam",
  neckCircumference: "Neck",
  headCircumference: "Head",
  thighCircumference: "Thigh",
  wristCircumference: "Wrist",
  footLengthCm: "Foot length",
};

interface UserProfileDetailPageProps {
  item: ProfileUserListItem;
}

type LengthUnit = "cm" | "in";

function hasValue(value: string | number | null | undefined): boolean {
  return value !== null && value !== undefined && value !== "";
}

function missing(value: string | null | undefined, fallback = "Missing"): string {
  return value?.trim() || fallback;
}

function formatDate(value: string | null): string {
  if (!value) return "Missing";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Missing";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isMale(raw: AdminProfileUserRaw): boolean {
  return raw.gender?.toLowerCase() === "male";
}

function measurementUnit(raw: AdminProfileUserRaw, key: string): string {
  if (key === "height") return raw.heightUnit || raw.sizingUnit || "";
  if (key === "weight") return raw.weightUnit || "";
  if (key === "footLengthCm") return "cm";
  return raw.measurementsUnit || raw.sizingUnit || "cm";
}

function normalizeUnit(unit: string | null | undefined): LengthUnit {
  const value = unit?.toLowerCase().trim();
  return value === "in" || value === "inch" || value === "inches" ? "in" : "cm";
}

function lengthValueInCm(raw: AdminProfileUserRaw, key: string, value: number): number {
  const sourceUnit = normalizeUnit(measurementUnit(raw, key));
  return sourceUnit === "in" ? value * 2.54 : value;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatLengthMeasurement(raw: AdminProfileUserRaw, key: string, value: number, displayUnit: LengthUnit): string {
  const cm = lengthValueInCm(raw, key, value);
  const converted = displayUnit === "cm" ? cm : cm / 2.54;
  return `${formatNumber(converted)} ${displayUnit}`;
}

function formatWeight(raw: AdminProfileUserRaw, value: number): string {
  const unit = raw.weightUnit || "";
  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
}

function measurementEntries(raw: AdminProfileUserRaw, displayUnit: LengthUnit): Array<{ key: string; label: string; value: string }> {
  const values: Record<string, number> = { ...(raw.measurements || {}) };
  if (typeof raw.height === "number") values.height = raw.height;
  if (typeof raw.weight === "number") values.weight = raw.weight;

  if (isMale(raw)) {
    delete values.bust;
  }

  return Object.entries(values)
    .filter(([, value]) => Number.isFinite(value))
    .sort(([a], [b]) => {
      const ai = BODY_MEASUREMENT_ORDER.indexOf(a);
      const bi = BODY_MEASUREMENT_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b);
    })
    .map(([key, value]) => ({
      key,
      label: MEASUREMENT_LABELS[key] || key,
      value: key === "weight" ? formatWeight(raw, value) : formatLengthMeasurement(raw, key, value, displayUnit),
    }));
}

function shoeValue(raw: AdminProfileUserRaw): string | null {
  const shoes = [
    raw.shoeEU ? `EU ${raw.shoeEU}` : null,
    raw.shoeUS ? `US ${raw.shoeUS}` : null,
    raw.shoeUK ? `UK ${raw.shoeUK}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return shoes || null;
}

function braValue(raw: AdminProfileUserRaw): string | null {
  if (isMale(raw)) return null;
  const value = [raw.bandSize, raw.cupSize, raw.braSizeRegion].filter(Boolean).join(" ");
  return value || null;
}

function Row({ label, value, href }: { label: string; value: string; href?: string | null }) {
  const valueClass = href ? "text-brand-blue hover:text-brand-blue/80" : "text-text-primary";
  return (
    <div className="grid grid-cols-[minmax(110px,0.42fr)_minmax(0,1fr)] gap-4 px-4 py-3 text-sm">
      <dt className="text-customer-muted">{label}</dt>
      <dd className="min-w-0 font-semibold">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className={`inline-flex max-w-full items-center gap-1.5 break-words ${valueClass}`}>
            <span className="min-w-0 break-words">{value}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        ) : (
          <span className={valueClass}>{value}</span>
        )}
      </dd>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Ruler; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-customer-border px-4 py-3">
      <Icon className="h-4 w-4 text-brand-blue" />
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-5 text-sm text-customer-muted">{text}</div>;
}

export function UserProfileDetailPage({ item }: UserProfileDetailPageProps) {
  const raw = item.raw;
  const [displayUnit, setDisplayUnit] = useState<LengthUnit>("cm");
  const measurements = measurementEntries(raw, displayUnit);
  const shoe = shoeValue(raw);
  const bra = braValue(raw);
  const measurementRows = [
    ...measurements,
    ...(shoe ? [{ key: "shoes", label: "Shoes", value: shoe }] : []),
    ...(bra ? [{ key: "bra", label: "Bra", value: bra }] : []),
  ];
  const storeLabel = raw.storeName || raw.storeDomain || "Store not captured";
  const originLabel = item.originLabel === "Not captured" ? "Website not captured" : item.originLabel;
  const photoLabel = item.photoUrl ? "Profile photo" : raw.photoStored ? "Stored without preview" : "No profile photo saved";
  const missingItems = [
    item.photoUrl ? null : "photo",
    raw.storeName || raw.storeDomain ? null : "store",
    item.originLabel !== "Not captured" ? null : "website",
    measurementRows.length ? null : "measurements",
    raw.topSizes.length ? null : "generated sizes",
  ].filter((value): value is string => Boolean(value));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 rounded-lg border border-customer-border px-3 py-2 text-sm font-semibold text-text-body hover:border-brand-blue/50 hover:text-brand-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Users
        </Link>
        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${item.sourceTone}`}>{item.sourceLabel}</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
          <div className="bg-customer-soft p-4">
            <div className="overflow-hidden rounded-lg border border-customer-border bg-customer-card">
              <div className="relative aspect-[4/5]">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.profileLabel} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center text-customer-muted">
                    <Camera className="h-8 w-8" />
                    <p className="text-sm font-semibold">{photoLabel}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1 p-4">
            <h1 className="break-words text-2xl font-semibold leading-tight text-text-primary">{item.profileLabel}</h1>
            <p className="break-words text-sm text-customer-muted">{item.accountLabel}</p>
          </div>

          <dl className="divide-y divide-customer-border border-t border-customer-border">
            <Row label="Customer of" value={storeLabel} />
            <Row label="Website" value={originLabel} href={raw.originUrl} />
            <Row label="Source" value={item.sourceLabel} />
            {raw.gender ? <Row label="Gender" value={raw.gender} /> : null}
            {typeof raw.age === "number" ? <Row label="Age" value={`${raw.age}`} /> : null}
            <Row label="Last seen" value={formatDate(raw.lastSeenAt || raw.updatedAt)} />
          </dl>
        </aside>

        <div className="space-y-5">
          {missingItems.length ? (
            <div className="rounded-[var(--radius-customer-card)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Missing: {missingItems.join(", ")}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-customer-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-brand-blue" />
                <h2 className="text-sm font-semibold text-text-primary">Measurements</h2>
              </div>
              <div className="inline-flex rounded-lg border border-customer-border bg-customer-soft p-0.5">
                {(["cm", "in"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setDisplayUnit(unit)}
                    className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
                      displayUnit === unit ? "bg-customer-card text-brand-blue shadow-sm" : "text-customer-muted hover:text-text-primary"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
            {measurementRows.length ? (
              <dl className="grid divide-y divide-customer-border md:grid-cols-2 md:divide-x md:divide-y-0">
                {measurementRows.map((measurement) => (
                  <Row key={measurement.key} label={measurement.label} value={measurement.value} />
                ))}
              </dl>
            ) : (
              <EmptyState text="No body measurements saved for this profile yet." />
            )}
          </section>

          <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
            <SectionHeader icon={ShoppingBag} title="Generated sizes" />
            {raw.topSizes.length ? (
              <div className="divide-y divide-customer-border">
                {raw.topSizes.map((size, index) => (
                  <div key={`${size.size}-${index}`} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm">
                    <span className="text-customer-muted">{index + 1}</span>
                    <span className="font-semibold text-text-primary">{size.size}</span>
                    <span className="rounded-full bg-customer-soft px-2.5 py-1 text-xs font-semibold text-text-body">{size.count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No generated size history saved for this profile yet." />
            )}
          </section>

          <details className="group overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-text-primary">
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4 text-brand-blue" />
                Technical details
              </span>
              <ChevronDown className="h-4 w-4 text-customer-muted transition group-open:rotate-180" />
            </summary>
            <dl className="divide-y divide-customer-border border-t border-customer-border">
              <Row label="Device" value={item.deviceLabel} />
              <Row label="Country" value={item.countryLabel} />
              <Row label="Created" value={formatDate(raw.createdAt)} />
              <Row label="First seen" value={formatDate(raw.firstSeenAt)} />
              <Row label="Profile ID" value={missing(raw.profileId)} />
              <Row label="User ID" value={missing(raw.userId)} />
              <Row label="Session" value={missing(raw.sessionId)} />
            </dl>
          </details>
        </div>
      </div>
    </section>
  );
}
