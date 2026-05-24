"use client";

import { Calculator } from "lucide-react";
import { FORMULA_GROUPS } from "../lib/sizingUtils";

export function FormulaReferencePanel() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-md bg-brand-blue-pale p-2 text-brand-blue">
          <Calculator className="size-4" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary">Simple formula reference</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {FORMULA_GROUPS.map((group) => (
          <div key={group.title} className="rounded-lg bg-gray-50 p-3">
            <h4 className="text-xs font-semibold uppercase text-text-primary">{group.title}</h4>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-secondary">
              {group.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
