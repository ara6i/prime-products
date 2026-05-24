"use client";

import { CheckCircle2, Footprints, Glasses, Ruler, Table2, UserRound } from "lucide-react";
import { Button } from "@/app/shared/components/ui/button";
import { cn } from "@/app/shared/lib/utils";
import type { useTryOnSizing } from "../hooks/useTryOnSizing";
import {
  CATEGORY_OPTIONS,
  SHOE_BRANDS,
  isBodyBasicCategory,
  isFaceCategory,
  isHeadCategory,
  isShoeCategory,
} from "../lib/sizingUtils";
import type { TryOnProductCategory } from "../lib/types";

type SizingState = ReturnType<typeof useTryOnSizing>;

interface SizingSetupPanelProps {
  sizing: SizingState;
  disabled: boolean;
  onBuild: () => void;
}

export function SizingSetupPanel({ sizing, disabled, onBuild }: SizingSetupPanelProps) {
  const { product, user, updateProduct, updateUser, setCategory, parsedSizeGuide, shoe, status, errorMessage } = sizing;
  const isBusy = status === "sizing" || status === "previewing";
  const bodyBasic = isBodyBasicCategory(product.category);
  const parsedRowCount = parsedSizeGuide
    ? parsedSizeGuide.rows.length + Object.values(parsedSizeGuide.sections ?? {}).reduce((sum, section) => sum + section.rows.length, 0)
    : 0;
  const parsedSectionCount = parsedSizeGuide ? Object.keys(parsedSizeGuide.sections ?? {}).length : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-brand-blue-pale p-2 text-brand-blue">
              <Table2 className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Product setup</h3>
          </div>
          <span className={cn("text-xs", parsedSizeGuide ? "text-green-700" : "text-red-700")}>
            {parsedSizeGuide
              ? `${parsedRowCount} size rows parsed${parsedSectionCount ? ` / ${parsedSectionCount} sections` : ""}`
              : "Chart needs fixing"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Category
            <select
              value={product.category}
              disabled={disabled || isBusy}
              onChange={(event) => setCategory(event.target.value as TryOnProductCategory)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-text-primary"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <TextInput
            label="Product title"
            value={product.title}
            disabled={disabled || isBusy}
            onChange={(value) => updateProduct("title", value)}
          />
          <TextInput
            label="Material"
            value={product.material}
            disabled={disabled || isBusy}
            onChange={(value) => updateProduct("material", value)}
          />
        </div>

        <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Description
          <input
            value={product.description}
            disabled={disabled || isBusy}
            onChange={(event) => updateProduct("description", event.target.value)}
            placeholder="Optional product notes for prompt context"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-text-primary"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Manual size chart
          <textarea
            value={product.sizeChartText}
            disabled={disabled || isBusy}
            onChange={(event) => updateProduct("sizeChartText", event.target.value)}
            rows={8}
            spellCheck={false}
            className="resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-text-primary"
          />
        </label>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-brand-blue-pale p-2 text-brand-blue">
              {isShoeCategory(product.category) ? (
                <Footprints className="size-4" />
              ) : isFaceCategory(product.category) || isHeadCategory(product.category) ? (
                <Glasses className="size-4" />
              ) : (
                <UserRound className="size-4" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-text-primary">User sizing</h3>
          </div>
          {status === "ready" && <CheckCircle2 className="size-4 text-green-600" />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumberInput
            label="Height ft"
            value={user.heightFeet}
            disabled={disabled || isBusy}
            onChange={(value) => updateUser("heightFeet", value)}
          />
          <NumberInput
            label="Height in"
            value={user.heightInches}
            disabled={disabled || isBusy}
            onChange={(value) => updateUser("heightInches", value)}
          />
          <NumberInput label="Weight lbs" value={user.weight} disabled={disabled || isBusy} onChange={(value) => updateUser("weight", value)} />
        </div>

        {product.category === "apparel" && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Gender
              <select
                value={user.gender}
                disabled={disabled || isBusy}
                onChange={(event) => updateUser("gender", event.target.value as "male" | "female")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-text-primary"
              >
                <option value="male">Man</option>
                <option value="female">Woman</option>
              </select>
            </label>
            <NumberInput label="Age" value={user.age} disabled={disabled || isBusy} onChange={(value) => updateUser("age", value)} />
          </div>
        )}

        {product.category === "apparel" && user.gender === "female" && (
          <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3">
            <SelectInput
              label="Region"
              value={user.braRegion}
              disabled={disabled || isBusy}
              options={["US", "UK", "EU", "FR", "IT", "JP", "KR", "AU"]}
              onChange={(value) => updateUser("braRegion", value as typeof user.braRegion)}
            />
            <NumberInput label="Band" value={user.bandSize} disabled={disabled || isBusy} onChange={(value) => updateUser("bandSize", value)} />
            <TextInput label="Cup" value={user.cupSize} disabled={disabled || isBusy} onChange={(value) => updateUser("cupSize", value)} />
          </div>
        )}

        {isShoeCategory(product.category) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <SelectInput
              label="Brand"
              value={user.shoeBrand}
              disabled={disabled || isBusy}
              options={SHOE_BRANDS}
              onChange={(value) => updateUser("shoeBrand", value)}
            />
            <SelectInput
              label="Size system"
              value={user.shoeSystem}
              disabled={disabled || isBusy}
              options={["US_M", "US_W", "UK", "EU"]}
              onChange={(value) => updateUser("shoeSystem", value as typeof user.shoeSystem)}
            />
            <NumberInput label="Familiar size" value={user.shoeSize} disabled={disabled || isBusy} onChange={(value) => updateUser("shoeSize", value)} />
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-text-secondary">
              <span className="block font-medium text-text-primary">Derived foot</span>
              {shoe ? `${shoe.footLengthCm} cm · US ${shoe.shoeUS} · UK ${shoe.shoeUK} · EU ${shoe.shoeEU}` : "Enter a valid size"}
            </div>
          </div>
        )}

        {isFaceCategory(product.category) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumberInput label="Face width mm" value={user.faceWidthMm} disabled={disabled || isBusy} onChange={(value) => updateUser("faceWidthMm", value)} />
            <NumberInput label="Bridge mm" value={user.bridgeWidthMm} disabled={disabled || isBusy} onChange={(value) => updateUser("bridgeWidthMm", value)} />
            <NumberInput label="Temple mm" value={user.templeLengthMm} disabled={disabled || isBusy} onChange={(value) => updateUser("templeLengthMm", value)} />
            <NumberInput label="PD mm" value={user.pdMm} disabled={disabled || isBusy} onChange={(value) => updateUser("pdMm", value)} />
            <NumberInput label="Lens width mm" value={user.lensWidthMm} disabled={disabled || isBusy} onChange={(value) => updateUser("lensWidthMm", value)} />
            <NumberInput label="Lens height mm" value={user.lensHeightMm} disabled={disabled || isBusy} onChange={(value) => updateUser("lensHeightMm", value)} />
          </div>
        )}

        {isHeadCategory(product.category) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumberInput label="Head circumference cm" value={user.headCircumferenceCm} disabled={disabled || isBusy} onChange={(value) => updateUser("headCircumferenceCm", value)} />
            <NumberInput label="Head width cm" value={user.headWidthCm} disabled={disabled || isBusy} onChange={(value) => updateUser("headWidthCm", value)} />
          </div>
        )}

        {bodyBasic && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-text-secondary">
            This accessory route uses only height and weight for scale, then sends category placement rules to the prompt.
          </p>
        )}

        <Button type="button" onClick={onBuild} disabled={disabled || isBusy} className="mt-4 w-full text-sm">
          <Ruler className="size-4" />
          {isBusy ? (status === "sizing" ? "Running AI sizing..." : "Building prompt...") : "Build sizing + prompt"}
        </Button>
        {errorMessage && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
      </section>
    </div>
  );
}

function TextInput(props: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
      {props.label}
      <input
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-text-primary"
      />
    </label>
  );
}

function NumberInput(props: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
      {props.label}
      <input
        type="number"
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-text-primary"
      />
    </label>
  );
}

function SelectInput(props: {
  label: string;
  value: string;
  disabled: boolean;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
      {props.label}
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-text-primary"
      >
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
