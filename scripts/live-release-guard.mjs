#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ZERO_SHA = /^0{40}$/;

const blockedPathRules = [
  {
    id: "admin-ui",
    pattern: /^app\/admin(?:\/|$)/,
    reason: "Admin dashboard source must not ride along with public live releases.",
  },
  {
    id: "admin-api",
    pattern: /^app\/api\/admin(?:\/|$)/,
    reason: "Admin APIs must not ride along with public live releases.",
  },
  {
    id: "test-lab-ui",
    pattern: /^app\/test-lab(?:\/|$)/,
    reason: "Test lab UI belongs on the test server only.",
  },
  {
    id: "test-lab-api",
    pattern: /^app\/api\/test-lab(?:\/|$)/,
    reason: "Test lab APIs belong on the test server only.",
  },
  {
    id: "try-on-test-ui",
    pattern: /^app\/try-on-test(?:\/|$)/,
    reason: "Try-on test, capacity lab, sizing lab, and PDP Studio stay off public live releases.",
  },
  {
    id: "try-on-test-api",
    pattern: /^app\/api\/try-on-test(?:\/|$)/,
    reason: "Try-on test APIs stay off public live releases.",
  },
  {
    id: "style-rag-api",
    pattern: /^app\/api\/style(?:\/|$)/,
    reason: "Experimental style/RAG APIs are not approved for public live releases.",
  },
  {
    id: "local-agent-state",
    pattern: /^(?:\.codex|\.cursor|\.mcp(?:\.json)?)(?:\/|$)/,
    reason: "Local agent/editor state must never be released.",
  },
  {
    id: "logs",
    pattern: /(?:^|\/)[^/]+\.log$/,
    reason: "Local logs must never be released.",
  },
  {
    id: "data-extracts",
    pattern: /^data-extracts(?:\/|$)/,
    reason: "Data extracts/import workbooks stay out of public live releases.",
  },
  {
    id: "root-local-media",
    pattern: /^[^/]+\.(?:gif|jpe?g|mov|mp4|png|webp)$/i,
    reason: "Root-level local media files are not production assets.",
  },
  {
    id: "migration-seed-import",
    pattern: /^(?:migrations|seeds|scripts\/(?:backfill|import|migrate|migration|seed))/,
    reason: "Migration, seed, import, and backfill work must be reviewed and run separately.",
  },
];

const blockedContentRules = [
  {
    id: "style-match-endpoint",
    pattern: /\/api\/v1\/style\/match|\/api\/style\/match/,
    reason: "Style-match/RAG endpoint calls are not approved for public live releases.",
  },
  {
    id: "style-match-client",
    pattern: /\bgetStyleMatches\b|\bstyleMatch(?:Product|Outfits?|Items?)\b|\bStyleMatch(?:Product|Outfits?|Items?)\b/,
    reason: "Style-match/RAG client state is not approved for public live releases.",
  },
  {
    id: "stylist-products-rag",
    pattern: /\bstylist_products\b|\bstyle-match\b/i,
    reason: "Stylist RAG projection work is not approved for public live releases.",
  },
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base") {
      args.base = argv[index + 1];
      index += 1;
    } else if (arg === "--head") {
      args.head = argv[index + 1];
      index += 1;
    } else if (arg === "--range") {
      args.range = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function refExists(ref) {
  if (!ref || ZERO_SHA.test(ref)) return false;
  try {
    git(["rev-parse", "--verify", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function defaultBaseFor(head) {
  if (process.env.LIVE_RELEASE_BASE) return process.env.LIVE_RELEASE_BASE;
  if (process.env.GITHUB_EVENT_BEFORE) return process.env.GITHUB_EVENT_BEFORE;
  if (refExists("origin/main")) return "origin/main";
  if (refExists(`${head}^`)) return `${head}^`;
  return "";
}

function resolveRange(args) {
  if (args.range) return args.range;

  const hasExplicitRefs = Boolean(
    args.base ||
      args.head ||
      process.env.LIVE_RELEASE_BASE ||
      process.env.LIVE_RELEASE_HEAD ||
      process.env.GITHUB_EVENT_BEFORE ||
      process.env.GITHUB_SHA
  );

  if (!hasExplicitRefs && refExists("origin/main")) {
    return "origin/main";
  }

  const head = args.head || process.env.LIVE_RELEASE_HEAD || process.env.GITHUB_SHA || "HEAD";
  let base = args.base || defaultBaseFor(head);

  if (!refExists(base)) {
    if (refExists(`${head}^`)) {
      base = `${head}^`;
    } else {
      throw new Error(`Cannot resolve live-release guard base ref: ${base || "(empty)"}`);
    }
  }

  if (!refExists(head)) {
    throw new Error(`Cannot resolve live-release guard head ref: ${head}`);
  }

  return `${base}..${head}`;
}

function parseChangedFiles(nameStatusOutput) {
  if (!nameStatusOutput) return [];

  return nameStatusOutput
    .split("\n")
    .flatMap((line) => {
      const fields = line.split("\t").filter(Boolean);
      if (fields.length < 2) return [];

      const status = fields[0];
      const paths = fields.slice(1);

      if (status.startsWith("R") || status.startsWith("C")) {
        return paths;
      }

      return [paths[0]];
    })
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, "/"));
}

function shouldScanContent(file) {
  if (!file.startsWith("app/") && !file.startsWith("src/") && !file.startsWith("lib/")) {
    return false;
  }
  return /\.(?:cjs|cts|js|jsx|json|mjs|mts|ts|tsx)$/.test(file);
}

function checkPaths(files) {
  const violations = [];

  for (const file of files) {
    for (const rule of blockedPathRules) {
      if (rule.pattern.test(file)) {
        violations.push({ file, id: rule.id, reason: rule.reason });
      }
    }
  }

  return violations;
}

function checkContent(files) {
  const violations = [];

  for (const file of files) {
    if (!shouldScanContent(file) || !existsSync(file)) continue;

    const content = readFileSync(file, "utf8");
    for (const rule of blockedContentRules) {
      if (rule.pattern.test(content)) {
        violations.push({ file, id: rule.id, reason: rule.reason });
      }
    }
  }

  return violations;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const range = resolveRange(args);
  const nameStatus = git(["diff", "--name-status", "--find-renames", range]);
  const changedFiles = Array.from(new Set(parseChangedFiles(nameStatus)));

  if (changedFiles.length === 0) {
    console.log(`Live release guard passed: no changed files in ${range}.`);
    return;
  }

  const violations = [...checkPaths(changedFiles), ...checkContent(changedFiles)];

  if (violations.length > 0) {
    console.error("Live release guard failed.");
    console.error(`Checked range: ${range}`);
    console.error("");
    for (const violation of violations) {
      console.error(`- [${violation.id}] ${violation.file}`);
      console.error(`  ${violation.reason}`);
    }
    console.error("");
    console.error("This candidate may still go to the test server, but it must not deploy to public live as-is.");
    process.exit(1);
  }

  console.log(`Live release guard passed for ${changedFiles.length} changed file(s).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
