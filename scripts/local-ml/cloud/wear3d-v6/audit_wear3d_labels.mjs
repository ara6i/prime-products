#!/usr/bin/env node
/** Audit WEAR v6 labels and build a visual contact sheet before training. */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const CORE_ROWS = ["neck", "chest", "waist", "hips"];
const ROW_ORDER = ["neck", "chest", "underbust", "waist", "hips"];
const COLORS = {
  neck: "#a855f7",
  chest: "#ef4444",
  underbust: "#f59e0b",
  waist: "#06b6d4",
  hips: "#22c55e",
};

function args() {
  const result = { samples: 24, strict: false };
  for (let index = 2; index < process.argv.length; index += 1) {
    const token = process.argv[index];
    if (token === "--strict") result.strict = true;
    else if (token === "--manifest") result.manifest = process.argv[++index];
    else if (token === "--output-dir") result.outputDir = process.argv[++index];
    else if (token === "--contact-sheet-samples") result.samples = Number(process.argv[++index]);
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!result.manifest || !result.outputDir) throw new Error("--manifest and --output-dir are required");
  return result;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function xml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function auditRecord(record) {
  const errors = [];
  if (record.error) return [`pipeline-error:${record.error}`];
  const rows = record.rows ?? {};
  for (const name of CORE_ROWS) if (!rows[name]?.accepted) errors.push(`missing-${name}`);
  const ordered = [];
  for (const name of ROW_ORDER) {
    const row = rows[name];
    if (!row?.accepted) continue;
    const y = finite(row.y_norm);
    const left = finite(row.wear_edge_left_x_norm);
    const right = finite(row.wear_edge_right_x_norm);
    if (y === null || y < 0 || y > 1) errors.push(`bad-${name}-y`);
    else ordered.push(y);
    if (left === null || right === null || left < 0 || left >= right || right > 1) errors.push(`bad-${name}-edges`);
  }
  if (ordered.some((value, index) => index > 0 && value < ordered[index - 1])) errors.push("row-order");
  return errors;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

async function tileSvg(record, xOffset, yOffset, width = 384, height = 512) {
  const image = await fs.readFile(record.image);
  const imageUri = `data:image/png;base64,${image.toString("base64")}`;
  const parts = [
    `<g transform="translate(${xOffset} ${yOffset})">`,
    `<rect width="614" height="512" fill="#0b1020"/>`,
    `<image href="${imageUri}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>`,
  ];
  for (const name of ROW_ORDER) {
    const row = record.rows?.[name];
    if (!row?.accepted) continue;
    const y = Math.round(Number(row.y_norm) * (height - 1));
    const left = Math.round(Number(row.wear_edge_left_x_norm) * (width - 1));
    const right = Math.round(Number(row.wear_edge_right_x_norm) * (width - 1));
    parts.push(`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#fff" stroke-width="5"/>`);
    parts.push(`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${COLORS[name]}" stroke-width="3"/>`);
    parts.push(`<text x="${Math.max(3, left)}" y="${Math.max(12, y - 5)}" fill="${COLORS[name]}" font-size="12" font-family="sans-serif">${name}</text>`);
  }
  parts.push(`<text x="396" y="22" fill="#fff" font-size="13" font-family="sans-serif">${xml(record.sample_id)}</text>`);
  parts.push(`<text x="396" y="42" fill="#cbd5e1" font-size="11" font-family="sans-serif">role: ${xml(record.role)}</text>`);
  let yText = 70;
  for (const name of ROW_ORDER) {
    const row = record.rows?.[name];
    if (!row?.accepted) continue;
    const tape = finite(row.measurement_circumference_mm);
    const depth = finite(row.mesh_depth_mm);
    const delta = finite(row.perimeter_delta_to_measurement_pct);
    parts.push(`<text x="396" y="${yText}" fill="${COLORS[name]}" font-size="12" font-family="sans-serif">${name}</text>`);
    parts.push(`<text x="396" y="${yText + 17}" fill="#e2e8f0" font-size="11" font-family="sans-serif">tape ${tape ? (tape / 10).toFixed(1) : "?"} cm · depth ${depth ? (depth / 10).toFixed(1) : "?"} cm</text>`);
    parts.push(`<text x="396" y="${yText + 34}" fill="${delta !== null && delta > 12 ? "#fca5a5" : "#86efac"}" font-size="11" font-family="sans-serif">mesh/tape delta ${delta === null ? "n/a" : `${delta.toFixed(1)}%`}</text>`);
    yText += 62;
  }
  parts.push("</g>");
  return parts.join("");
}

async function main() {
  const options = args();
  const raw = await fs.readFile(options.manifest, "utf8");
  const records = raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  if (!records.length) throw new Error("manifest is empty");
  await fs.mkdir(options.outputDir, { recursive: true });

  const sampleErrors = {};
  const rolesBySubject = new Map();
  const viewsBySubject = new Map();
  for (const record of records) {
    const errors = auditRecord(record);
    if (errors.length) sampleErrors[record.sample_id] = errors;
    const roles = rolesBySubject.get(record.subject_id) ?? new Set();
    roles.add(record.role);
    rolesBySubject.set(record.subject_id, roles);
    const views = viewsBySubject.get(record.subject_id) ?? [];
    views.push(record);
    viewsBySubject.set(record.subject_id, views);
  }
  const splitLeaks = [...rolesBySubject].filter(([, roles]) => roles.size > 1).map(([subject]) => subject).sort();
  const widthCvs = [];
  for (const views of viewsBySubject.values()) {
    if (views.length < 2) continue;
    for (const name of ROW_ORDER) {
      const values = views.map((record) => finite(record.rows?.[name]?.apple_corrected_width_cm)).filter((value) => value > 0);
      if (values.length < 2) continue;
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
      widthCvs.push(Math.sqrt(variance) / mean);
    }
  }
  const rowTotals = {};
  for (const name of ROW_ORDER) {
    const accepted = records.map((record) => record.rows?.[name]).filter((row) => row?.accepted);
    rowTotals[name] = {
      accepted: accepted.length,
      depth_targets: accepted.filter((row) => row.geometry_target_valid).length,
      perimeter_consistent: accepted.filter((row) => row.perimeter_consistent_with_tape).length,
    };
  }

  const selected = records.filter((record) => record.image).slice(0, Math.max(1, options.samples));
  if (!selected.length) throw new Error("manifest contains no rendered images");
  const columns = Math.min(3, selected.length);
  const rows = Math.ceil(selected.length / columns);
  const tiles = [];
  for (let index = 0; index < selected.length; index += 1) {
    tiles.push(await tileSvg(selected[index], (index % columns) * 614, Math.floor(index / columns) * 512));
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * 614}" height="${rows * 512}">${tiles.join("")}</svg>`;
  const contactSheet = path.join(options.outputDir, "label-contact-sheet.jpg");
  await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(contactSheet);

  const summary = {
    schema_version: 1,
    manifest: options.manifest,
    records: records.length,
    subjects: viewsBySubject.size,
    roles: Object.fromEntries(["train", "validation", "test"].map((role) => [role, [...rolesBySubject.values()].filter((roles) => roles.has(role)).length])),
    sample_errors: sampleErrors,
    split_leaks: splitLeaks,
    row_totals: rowTotals,
    camera_width_cv_p95: percentile(widthCvs, 0.95),
    contact_sheet: contactSheet,
    passed: !Object.keys(sampleErrors).length && !splitLeaks.length,
  };
  await fs.writeFile(path.join(options.outputDir, "audit-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (options.strict && !summary.passed) process.exitCode = 2;
}

await main();
