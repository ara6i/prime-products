import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const componentDirectory = path.join(
  projectRoot,
  "app/partner-landing/influencer/components",
);
const componentFiles = (await fs.readdir(componentDirectory))
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => path.join(componentDirectory, name));
const sourceFiles = [
  ...componentFiles,
  path.join(
    projectRoot,
    "app/partner-landing/influencer/data/influencerLandingContent.ts",
  ),
  path.join(
    projectRoot,
    "app/partner-landing/influencer/components/influencerHeroMedia.ts",
  ),
  path.join(
    projectRoot,
    "app/partner-landing/services/creatorProfileValidation.ts",
  ),
  path.join(projectRoot, "app/partner-landing/services/partnerInterestService.ts"),
  path.join(projectRoot, "app/api/creator-profiles/validate/route.ts"),
  path.join(projectRoot, "app/legal-content/components/LegalEditorialPage.tsx"),
  path.join(projectRoot, "app/legal-content/data/policyPages.ts"),
  path.join(projectRoot, "app/landing/data/footerPolicyLinks.ts"),
];

const outputDirectory = path.join(
  projectRoot,
  "app/partner-landing/i18n/translations",
);
const targets = {
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  "pt-BR": "pt",
  ja: "ja",
  "zh-CN": "zh-CN",
  ko: "ko",
  ar: "ar",
};
const translatablePropertyNames = new Set([
  "annotation",
  "badge",
  "body",
  "campaign",
  "contactBody",
  "contactTitle",
  "day",
  "description",
  "effectiveDate",
  "eyebrow",
  "label",
  "lastUpdated",
  "location",
  "name",
  "note",
  "primaryCta",
  "quickNotes",
  "secondaryCta",
  "step",
  "title",
  "titleAccent",
  "titleLead",
]);
const alwaysCollectFiles = new Set([
  "policyPages.ts",
  "creatorProfileValidation.ts",
  "partnerInterestService.ts",
  "route.ts",
]);
const strings = new Set();

function addString(value, force = false) {
  if (typeof value !== "string") return;
  const normalized = value.trim();
  if (!normalized || !/[A-Za-z]/.test(normalized)) return;
  if (normalized === "use client" || normalized === "use server") return;
  if (/^(?:https?:|mailto:|@\/|\.\.?\/|\/)/i.test(normalized)) return;
  if (/\.(?:avif|gif|jpe?g|mp4|png|svg|webm|webp)$/i.test(normalized)) return;
  if (/^[#.\[]/.test(normalized)) return;
  if (!force && /^[a-z][a-z\d_-]*$/i.test(normalized) && normalized === normalized.toLowerCase()) {
    return;
  }
  strings.add(normalized);
}

function propertyName(node) {
  if (!ts.isPropertyAssignment(node.parent)) return undefined;
  const name = node.parent.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

for (const sourcePath of sourceFiles) {
  const sourceText = await fs.readFile(sourcePath, "utf8");
  const source = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const basename = path.basename(sourcePath);

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "t" &&
      node.arguments[0] &&
      (ts.isStringLiteral(node.arguments[0]) ||
        ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
    ) {
      addString(node.arguments[0].text, true);
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      if (
        ts.isImportDeclaration(parent) ||
        ts.isExportDeclaration(parent) ||
        (ts.isExpressionStatement(parent) && parent.expression === node)
      ) {
        ts.forEachChild(node, visit);
        return;
      }

      const key = propertyName(node);
      if (
        translatablePropertyNames.has(key ?? "") ||
        alwaysCollectFiles.has(basename)
      ) {
        addString(node.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

const sourceStrings = [...strings].sort((left, right) => left.localeCompare(right));
const delimiter = "<<<PSAI_TRANSLATION_SPLIT>>>";

function createBatches(values, maximumCharacters = 3500) {
  const batches = [];
  let current = [];
  let currentLength = 0;

  for (const value of values) {
    const nextLength = currentLength + value.length + delimiter.length + 2;
    if (current.length && nextLength > maximumCharacters) {
      batches.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(value);
    currentLength += value.length + delimiter.length + 2;
  }

  if (current.length) batches.push(current);
  return batches;
}

async function translateText(value, target) {
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const rpcId = "MkEWBc";
    const rpcPayload = JSON.stringify([[value, "en", target, true], [null]]);
    const body = new URLSearchParams({
      "f.req": JSON.stringify([[[rpcId, rpcPayload, null, "generic"]]]),
    });
    const response = await fetch(
      `https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=${rpcId}&source-path=%2F&hl=en&rt=c`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body,
      },
    );
    if (response.ok) {
      try {
        const responseText = await response.text();
        const frameLine = responseText
          .split(/\r?\n/)
          .find((line) => line.startsWith("[["));
        if (!frameLine) {
          throw new Error("Translation response did not contain an RPC frame.");
        }
        const frame = JSON.parse(frameLine);
        const payload = JSON.parse(frame[0][2]);
        const translated = payload[1][0]
          .flatMap((block) => (block?.[5] ?? []).map((segment) => segment[0]))
          .join("");
        if (!translated) {
          throw new Error("Translation response did not contain translated text.");
        }
        return translated;
      } catch (error) {
        if (attempt === 6) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(
            `${reason} Source text: ${value.slice(0, 240)}`,
          );
        }
        const delay = Math.min(30_000, 2_000 * 2 ** attempt);
        process.stdout.write(
          `\nTranslation response was incomplete; retrying in ${delay / 1000}s…\n`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 6) {
      throw new Error(`Translation request failed with HTTP ${response.status}.`);
    }
    const delay = Math.min(60_000, 10_000 * 2 ** attempt);
    process.stdout.write(`\nHTTP ${response.status}; retrying in ${delay / 1000}s…\n`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Translation request exhausted its retry budget.");
}

async function translateBatch(batch, target) {
  const joined = batch.join(`\n${delimiter}\n`);
  const translated = await translateText(joined, target);
  const parts = translated
    .split(delimiter)
    .map((part) => part.replace(/^\s+|\s+$/g, ""));

  if (parts.length === batch.length) return parts;

  const recovered = [];
  for (const value of batch) {
    recovered.push(await translateText(value, target));
  }
  return recovered;
}

function restoreTemplateTokens(source, translated) {
  const sourceTokens = [...source.matchAll(/\{[^{}]+\}/g)].map(
    (match) => match[0],
  );
  if (!sourceTokens.length) return translated;

  const translatedTokens = [...translated.matchAll(/\{[^{}]+\}/g)].map(
    (match) => match[0],
  );
  if (sourceTokens.length !== translatedTokens.length) {
    throw new Error(
      `Translation changed the number of template tokens for: ${source}`,
    );
  }

  let tokenIndex = 0;
  return translated.replace(/\{[^{}]+\}/g, () => sourceTokens[tokenIndex++]);
}

await fs.mkdir(outputDirectory, { recursive: true });
const batches = createBatches(sourceStrings);
console.log(
  `Translating ${sourceStrings.length} creator and legal strings in ${batches.length} batches per language.`,
);

for (const [locale, target] of Object.entries(targets)) {
  const outputPath = path.join(outputDirectory, `${locale}.json`);
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(outputPath, "utf8"));
  } catch {
    existing = {};
  }

  // Preserve completed entries in checkpoints so an interrupted generation
  // run can resume without truncating the remainder of the locale catalog.
  const dictionary = { ...existing };
  let translatedCount = 0;
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const missing = batch.filter((value) => !existing[value]);
    let translatedValues = [];
    if (missing.length) {
      translatedValues = await translateBatch(missing, target);
      translatedCount += missing.length;
    }
    let translatedIndex = 0;
    for (const value of batch) {
      const translatedValue =
        existing[value] ?? translatedValues[translatedIndex++] ?? value;
      dictionary[value] = restoreTemplateTokens(value, translatedValue);
    }
    await fs.writeFile(
      outputPath,
      `${JSON.stringify(dictionary, null, 2)}\n`,
      "utf8",
    );
    if (missing.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    process.stdout.write(
      `\r${locale}: batch ${index + 1}/${batches.length} (${translatedCount} new)`,
    );
  }

  const orderedDictionary = Object.fromEntries(
    sourceStrings.map((value) => [value, dictionary[value]]),
  );
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(orderedDictionary, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `\n${locale}: ${Object.keys(orderedDictionary).length} strings saved.\n`,
  );
}
