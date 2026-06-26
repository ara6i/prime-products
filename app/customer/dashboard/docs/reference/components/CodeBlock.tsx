"use client";

import { useState, useCallback, useMemo } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { CodeExample } from "../types";

// ── Lightweight syntax tokenizer ────────────────────────────

interface Token {
  type: "keyword" | "string" | "comment" | "number" | "plain";
  value: string;
}

const KEYWORDS = new Set([
  "const", "let", "var", "function", "async", "await", "return", "import", "from",
  "export", "default", "if", "else", "for", "while", "new", "class", "try", "catch",
  "throw", "typeof", "true", "false", "null", "undefined", "void", "break", "continue",
  "switch", "case", "yield", "of", "in", "def", "print", "with", "as",
  "None", "True", "False", "not", "and", "or", "elif", "except", "finally", "raise",
]);

function tokenize(code: string, language: string): Token[][] {
  return code.split("\n").map((line) => {
    const tokens: Token[] = [];
    let i = 0;

    while (i < line.length) {
      // Comments
      if ((language === "javascript" || language === "typescript" || language === "json") && line.slice(i, i + 2) === "//") {
        tokens.push({ type: "comment", value: line.slice(i) });
        break;
      }
      if ((language === "python" || language === "bash" || language === "sh") && line[i] === "#") {
        tokens.push({ type: "comment", value: line.slice(i) });
        break;
      }

      // Strings
      if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
        const quote = line[i]!;
        let j = i + 1;
        while (j < line.length && line[j] !== quote) {
          if (line[j] === "\\") j++;
          j++;
        }
        tokens.push({ type: "string", value: line.slice(i, j + 1) });
        i = j + 1;
        continue;
      }

      // Numbers
      if (/\d/.test(line[i]!) && (i === 0 || /[\s,(\[:=]/.test(line[i - 1]!))) {
        let j = i;
        while (j < line.length && /[\d.]/.test(line[j]!)) j++;
        tokens.push({ type: "number", value: line.slice(i, j) });
        i = j;
        continue;
      }

      // Words
      if (/[a-zA-Z_$]/.test(line[i]!)) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j]!)) j++;
        const word = line.slice(i, j);
        tokens.push({ type: KEYWORDS.has(word) ? "keyword" : "plain", value: word });
        i = j;
        continue;
      }

      tokens.push({ type: "plain", value: line[i]! });
      i++;
    }

    return tokens;
  });
}

const TOKEN_COLORS: Record<Token["type"], string> = {
  keyword: "text-[#8AB4FF]",
  string: "text-[#A7E3A0]",
  comment: "text-gray-500 italic",
  number: "text-[#F5B97F]",
  plain: "text-gray-100",
};

// ── Copy button ─────────────────────────────────────────────

function CopyButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  }, [code]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors",
        className
      )}
      aria-label="Copy code"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ── Code rendering ──────────────────────────────────────────

function CodeBody({ code, language }: { code: string; language: string }) {
  const lines = useMemo(() => tokenize(code, language), [code, language]);

  return (
    <div className="overflow-x-auto">
      <pre className="px-5 py-4 text-[14px] leading-[1.6] font-mono">
        <code>
          {lines.map((lineTokens, lineIdx) => (
            <div key={lineIdx} className="min-h-[1.6em]">
              {lineTokens.map((token, tokenIdx) => (
                <span key={tokenIdx} className={TOKEN_COLORS[token.type]}>
                  {token.value}
                </span>
              ))}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

// ── Single code block ───────────────────────────────────────

export function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language: string;
  filename?: string;
}) {
  const trimmed = code.trim();

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-800 bg-[#0E1116]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1A1D24] border-b border-gray-800">
        <span className="text-[12px] font-mono text-gray-400">
          {filename ?? language}
        </span>
        <CopyButton code={trimmed} />
      </div>
      <CodeBody code={trimmed} language={language} />
    </div>
  );
}

// ── Tabbed code block ───────────────────────────────────────

export function TabbedCodeBlock({ examples }: { examples: CodeExample[] }) {
  const [activeLabel, setActiveLabel] = useState(examples[0]?.label ?? "");
  const active = examples.find((e) => e.label === activeLabel) ?? examples[0];

  if (!active) return null;

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-800 bg-[#0E1116]">
      <div className="flex items-center justify-between bg-[#1A1D24] border-b border-gray-800 pr-2">
        <div className="flex items-end gap-0 overflow-x-auto">
          {examples.map((ex) => {
            const isActive = ex.label === active.label;
            return (
              <button
                key={ex.label}
                type="button"
                onClick={() => setActiveLabel(ex.label)}
                className={cn(
                  "px-3 py-2 text-[12px] font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "text-white bg-[#0E1116] border-b-2 border-[#2154EF] -mb-px"
                    : "text-gray-400 hover:text-gray-200"
                )}
              >
                {ex.label}
              </button>
            );
          })}
        </div>
        <CopyButton code={active.code.trim()} />
      </div>
      <CodeBody code={active.code.trim()} language={active.language} />
    </div>
  );
}
