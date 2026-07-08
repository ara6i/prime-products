"use client";

import { cn } from "@/app/shared/lib/utils";
import { Lock } from "lucide-react";
import { ParamTable } from "./ParamTable";
import { TabbedCodeBlock, CodeBlock } from "./CodeBlock";
import type { ParamDef, CodeExample } from "../types";

interface EndpointBlockProps {
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  path: string;
  description: string;
  auth?: boolean;
  bodyParams?: ParamDef[];
  queryParams?: ParamDef[];
  pathParams?: ParamDef[];
  codeExamples?: CodeExample[];
  responseExample?: string;
  responseStatus?: number;
  children?: React.ReactNode;
}

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-[#2154EF]/10 text-[#2154EF] border-[#2154EF]/20",
  POST: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  PUT: "bg-amber-500/12 text-amber-500 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  PATCH: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function EndpointBlock({
  method,
  path,
  description,
  auth = true,
  bodyParams,
  queryParams,
  pathParams,
  codeExamples,
  responseExample,
  responseStatus = 200,
  children,
}: EndpointBlockProps) {
  return (
    <div className="my-6 space-y-4">
      {/* Endpoint pill */}
      <div className="flex items-center gap-3 rounded-lg border border-customer-border bg-customer-soft px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border font-mono",
            METHOD_STYLES[method]
          )}
        >
          {method}
        </span>
        <code className="flex-1 truncate font-mono text-[14px] text-text-primary">{path}</code>
        {auth && (
          <span className="flex items-center gap-1 text-[12px] text-customer-muted">
            <Lock className="size-3" />
            Auth
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[16px] leading-[1.7] text-text-body">{description}</p>

      {children}

      {pathParams && pathParams.length > 0 && (
        <ParamTable title="Path Parameters" params={pathParams} />
      )}
      {queryParams && queryParams.length > 0 && (
        <ParamTable title="Query Parameters" params={queryParams} />
      )}
      {bodyParams && bodyParams.length > 0 && (
        <ParamTable title="Request Body" params={bodyParams} />
      )}

      {codeExamples && codeExamples.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-customer-muted">
            Example Request
          </h4>
          <TabbedCodeBlock examples={codeExamples} />
        </div>
      )}

      {responseExample && (
        <div className="mt-6">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-customer-muted">
            Response{" "}
            <span className="font-mono text-customer-success-text">{responseStatus}</span>
          </h4>
          <CodeBlock code={responseExample} language="json" />
        </div>
      )}
    </div>
  );
}
