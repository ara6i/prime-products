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
  POST: "bg-green-100 text-green-700 border-green-200",
  PUT: "bg-yellow-100 text-yellow-700 border-yellow-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
  PATCH: "bg-purple-100 text-purple-700 border-purple-200",
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
      <div className="flex items-center gap-3 border border-gray-200 bg-gray-50 rounded-lg px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border font-mono",
            METHOD_STYLES[method]
          )}
        >
          {method}
        </span>
        <code className="text-[14px] font-mono text-gray-900 flex-1 truncate">{path}</code>
        {auth && (
          <span className="flex items-center gap-1 text-[12px] text-gray-500">
            <Lock className="size-3" />
            Auth
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[16px] leading-[1.7] text-gray-700">{description}</p>

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
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Example Request
          </h4>
          <TabbedCodeBlock examples={codeExamples} />
        </div>
      )}

      {responseExample && (
        <div className="mt-6">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Response{" "}
            <span className="text-green-600 font-mono">{responseStatus}</span>
          </h4>
          <CodeBlock code={responseExample} language="json" />
        </div>
      )}
    </div>
  );
}
