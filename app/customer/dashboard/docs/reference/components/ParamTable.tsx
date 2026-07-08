"use client";

import type { ParamDef } from "../types";

interface ParamTableProps {
  title: string;
  params: ParamDef[];
}

export function ParamTable({ title, params }: ParamTableProps) {
  return (
    <div className="my-6">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-customer-muted">
        {title}
      </h4>

      <div>
        {params.map((p, idx) => (
          <div
            key={p.name}
            className={
              idx === 0
                ? "pt-0"
                : "mt-4 border-t border-customer-border pt-4"
            }
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <code className="font-mono text-[14px] font-semibold text-text-primary">
                {p.name}
              </code>
              <span className="rounded bg-customer-soft px-1.5 py-0.5 font-mono text-xs text-text-body">
                {p.type}
              </span>
              {p.required && (
                <span className="text-[#C02626] text-xs font-medium">required</span>
              )}
            </div>
            <p className="text-[14px] leading-[1.6] text-text-body">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
