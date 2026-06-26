"use client";

import type { ParamDef } from "../types";

interface ParamTableProps {
  title: string;
  params: ParamDef[];
}

export function ParamTable({ title, params }: ParamTableProps) {
  return (
    <div className="my-6">
      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </h4>

      <div>
        {params.map((p, idx) => (
          <div
            key={p.name}
            className={
              idx === 0
                ? "pt-0"
                : "border-t border-gray-100 pt-4 mt-4"
            }
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <code className="font-mono font-semibold text-[14px] text-gray-900">
                {p.name}
              </code>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 font-mono">
                {p.type}
              </span>
              {p.required && (
                <span className="text-[#C02626] text-xs font-medium">required</span>
              )}
            </div>
            <p className="text-[14px] leading-[1.6] text-gray-600">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
