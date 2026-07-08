"use client";

import { useState } from "react";

type Gender = "male" | "female";
type Category = "tops" | "bottoms" | "dresses" | "shoes";

interface Field {
  key: string;
  label: string;
  example: number;
  unit: string;
}

const FIELDS_BY_CONTEXT: Record<Gender, Record<Category, Field[]>> = {
  male: {
    tops: [
      { key: "chest", label: "Chest", example: 104, unit: "cm" },
      { key: "waist", label: "Waist", example: 84, unit: "cm" },
      { key: "shoulderWidth", label: "Shoulder Width", example: 46, unit: "cm" },
      { key: "sleeveLength", label: "Sleeve Length", example: 65, unit: "cm" },
      { key: "neckCircumference", label: "Neck", example: 40, unit: "cm" },
    ],
    bottoms: [
      { key: "waist", label: "Waist", example: 84, unit: "cm" },
      { key: "hips", label: "Hips", example: 96, unit: "cm" },
      { key: "inseam", label: "Inseam", example: 82, unit: "cm" },
    ],
    dresses: [],
    shoes: [
      { key: "footLengthCm", label: "Foot Length", example: 27.5, unit: "cm" },
    ],
  },
  female: {
    tops: [
      { key: "bust", label: "Bust", example: 92, unit: "cm" },
      { key: "waist", label: "Waist", example: 72, unit: "cm" },
      { key: "shoulderWidth", label: "Shoulder Width", example: 38, unit: "cm" },
      { key: "sleeveLength", label: "Sleeve Length", example: 58, unit: "cm" },
    ],
    bottoms: [
      { key: "waist", label: "Waist", example: 72, unit: "cm" },
      { key: "hips", label: "Hips", example: 98, unit: "cm" },
      { key: "inseam", label: "Inseam", example: 76, unit: "cm" },
    ],
    dresses: [
      { key: "bust", label: "Bust", example: 92, unit: "cm" },
      { key: "waist", label: "Waist", example: 72, unit: "cm" },
      { key: "hips", label: "Hips", example: 98, unit: "cm" },
    ],
    shoes: [
      { key: "footLengthCm", label: "Foot Length", example: 24.5, unit: "cm" },
    ],
  },
};

const CATEGORY_LABELS: Record<Category, string> = {
  tops: "Tops / Shirts / Jackets",
  bottoms: "Pants / Jeans / Skirts",
  dresses: "Dresses / Jumpsuits",
  shoes: "Shoes / Footwear",
};

export function MeasurementFieldsDemo() {
  const [gender, setGender] = useState<Gender>("male");
  const [category, setCategory] = useState<Category>("tops");

  const fields = FIELDS_BY_CONTEXT[gender][category];
  const categories = gender === "male"
    ? (["tops", "bottoms", "shoes"] as Category[])
    : (["tops", "bottoms", "dresses", "shoes"] as Category[]);

  const jsonPayload = JSON.stringify(
    {
      method: "exact",
      measurements: {
        gender,
        ...Object.fromEntries(fields.map((f) => [f.key, f.example])),
      },
      product: {
        title: "Your Product Name",
        variants: [{ title: "S" }, { title: "M" }, { title: "L" }],
      },
    },
    null,
    2
  );

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-customer-border bg-customer-card lg:mt-[1vw]">
      <div className="border-b border-customer-border px-5 py-4 lg:px-[1vw] lg:py-[0.8vw]">
        <h4 className="mb-3 text-sm font-semibold text-text-primary lg:mb-[0.5vw] lg:text-[0.9vw]">
          Which measurements should I send?
        </h4>
        <div className="flex flex-wrap gap-3 lg:gap-[0.5vw]">
          <div className="flex gap-0 overflow-hidden rounded-lg border border-customer-border">
            {(["male", "female"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGender(g);
                  if (g === "male" && category === "dresses") setCategory("tops");
                }}
                className={`px-4 py-2 lg:px-[0.8vw] lg:py-[0.3vw] text-xs lg:text-[0.7vw] font-semibold transition-all ${
                  gender === g
                    ? "bg-[#2154EF] text-white"
                    : "bg-transparent text-text-body hover:text-text-primary"
                }`}
              >
                {g === "male" ? "Men's" : "Women's"}
              </button>
            ))}
          </div>
          <div className="flex gap-0 overflow-hidden rounded-lg border border-customer-border">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-2 lg:px-[0.6vw] lg:py-[0.3vw] text-xs lg:text-[0.7vw] font-medium transition-all whitespace-nowrap ${
                  category === c
                    ? "bg-[#2154EF] text-white"
                    : "bg-transparent text-text-body hover:text-text-primary"
                }`}
              >
                {c === "tops"
                  ? "Tops"
                  : c === "bottoms"
                  ? "Bottoms"
                  : c === "dresses"
                  ? "Dresses"
                  : "Shoes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-customer-border px-5 py-4 lg:px-[1vw] lg:py-[0.8vw]">
        <p className="mb-3 text-xs text-customer-muted lg:mb-[0.5vw] lg:text-[0.7vw]">
          {gender === "male" ? "Men's" : "Women's"} — {CATEGORY_LABELS[category]}
        </p>
        {fields.length === 0 ? (
          <p className="text-sm italic text-customer-muted">
            Dresses category is only available for Women&apos;s sizing.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-[0.5vw]">
            {fields.map((f) => (
              <div
                key={f.key}
                className="rounded-lg border border-customer-border bg-customer-soft p-3 lg:p-[0.6vw]"
              >
                <div className="mb-1 text-[10px] uppercase tracking-wider text-customer-muted lg:text-[0.6vw]">
                  {f.label}
                </div>
                <div className="text-lg lg:text-[1.1vw] font-bold text-[#2154EF]">
                  {f.example}
                  <span className="ml-1 text-xs font-normal text-customer-muted lg:text-[0.7vw]">
                    {f.unit}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-text-body lg:text-[0.6vw]">
                  measurements.{f.key}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <pre className="max-h-[300px] overflow-x-auto p-5 font-mono text-[11px] leading-relaxed text-text-body sm:text-[12px] lg:max-h-[20vw] lg:p-[1vw] lg:text-[0.75vw]">
          <code>{jsonPayload}</code>
        </pre>
        <div className="absolute right-3 top-3 rounded bg-customer-soft px-2 py-1 font-mono text-[10px] text-customer-muted">
          Request body
        </div>
      </div>
    </div>
  );
}
