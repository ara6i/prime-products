import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CommercialSizingConclusion, CommercialSizingReportV1, CommercialSizingReviewV1 } from "@/app/try-on-test/wear-photo-test/commercialSizingTypes";

const DEFAULT_ROOT = "/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/waist-hip-commercial-validation";
export const COMMERCIAL_WORKBOOK = "PrimeStyleAI_100_Product_Sizing_Validation_Completed.xlsx";

function reportRoot() {
  return process.env.WEAR_COMMERCIAL_REPORT_ROOT?.trim() || DEFAULT_ROOT;
}

async function sha256File(file: string) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function reportDirectories() {
  const root = reportRoot();
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join(root, entry.name)).sort().reverse();
}

async function verifyArtifact(directory: string, fileName: string, expected: string) {
  const file = path.join(directory, fileName);
  if (!existsSync(file) || !(await stat(file)).isFile() || await sha256File(file) !== expected) {
    throw new Error(`The immutable commercial artifact failed checksum verification: ${fileName}`);
  }
  return file;
}

export async function loadLatestCommercialReport() {
  for (const directory of await reportDirectories()) {
    const indexPath = path.join(directory, "artifact-index.json");
    const reportPath = path.join(directory, "report.json");
    if (!existsSync(indexPath) || !existsSync(reportPath)) continue;
    const index = JSON.parse(await readFile(indexPath, "utf8")) as { schema?: string; reportId?: string; files?: Record<string, string> };
    if (index.schema !== "commercial-sizing-artifact-index-v1" || !index.files?.["report.json"] || !index.files?.[COMMERCIAL_WORKBOOK]) continue;
    await verifyArtifact(directory, "report.json", index.files["report.json"]);
    await verifyArtifact(directory, "manifest.json", index.files["manifest.json"]!);
    const workbookPath = await verifyArtifact(directory, COMMERCIAL_WORKBOOK, index.files[COMMERCIAL_WORKBOOK]);
    const report = JSON.parse(await readFile(reportPath, "utf8")) as CommercialSizingReportV1;
    if (report.schema !== "CommercialSizingReportV1" || report.reportId !== index.reportId || report.decisions.aiad.length !== 100 || report.decisions.v8.length !== 100) {
      throw new Error("The commercial report schema or 100-decision denominator is invalid.");
    }
    const manifestHash = await sha256File(path.join(directory, report.manifest.fileName));
    if (manifestHash !== report.manifest.fileSha256) throw new Error("The report no longer matches its frozen manifest.");
    const review = await loadLatestReview(directory, report.reportId);
    return { directory, report: { ...report, review }, workbookPath };
  }
  return null;
}

async function loadLatestReview(directory: string, reportId: string): Promise<CommercialSizingReviewV1> {
  const entries = await readdir(directory);
  const files = [
    ...entries.filter((file) => /^review-[0-9TZ]+-[a-f0-9]+\.json$/.test(file)).sort().reverse(),
    ...(entries.includes("review-initial.json") ? ["review-initial.json"] : []),
  ];
  for (const file of files) {
    const value = JSON.parse(await readFile(path.join(directory, file), "utf8")) as CommercialSizingReviewV1 & { schema?: string; reportId?: string; createdAt?: string };
    if (value.schema !== "commercial-sizing-review-v1" || value.reportId !== reportId) continue;
    return {
      conclusion: value.conclusion,
      rationale: value.rationale,
      updatedAt: value.updatedAt ?? value.createdAt ?? null,
      reviewer: value.reviewer,
    };
  }
  return { conclusion: "Unanswered", rationale: "", updatedAt: null, reviewer: null };
}

export async function saveCommercialReview(input: { conclusion: CommercialSizingConclusion; rationale: string; reviewer?: string | null }) {
  if (!["YES", "CONDITIONALLY", "NO"].includes(input.conclusion)) throw new Error("Choose YES, CONDITIONALLY, or NO.");
  const rationale = input.rationale.trim();
  if (rationale.length < 10 || rationale.length > 2000) throw new Error("Add a clear rationale between 10 and 2,000 characters.");
  const loaded = await loadLatestCommercialReport();
  if (!loaded) throw new Error("No finalized commercial report is installed on the WEAR USB.");
  const createdAt = new Date().toISOString();
  const review = {
    schema: "commercial-sizing-review-v1",
    reportId: loaded.report.reportId,
    reportSha256: await sha256File(path.join(loaded.directory, "report.json")),
    conclusion: input.conclusion,
    rationale,
    reviewer: input.reviewer?.trim().slice(0, 120) || "Test Lab reviewer",
    createdAt,
    updatedAt: createdAt,
  };
  const stamp = createdAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const file = path.join(loaded.directory, `review-${stamp}-${randomBytes(3).toString("hex")}.json`);
  await writeFile(file, `${JSON.stringify(review, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return review;
}
