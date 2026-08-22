#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../..');
const manifestPath = path.join(root, '.local-ml/v6r5-apple-pose/render-manifest-all.jsonl');
const scanId = process.argv[2] || 'IT-4002-A';
const outputPath = process.argv[3] || path.join(root, `.local-ml/reports/wear-v7-training-example-${scanId}.png`);
const recordLine = execFileSync('rg', ['-m', '1', scanId, manifestPath], {
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
});
const record = JSON.parse(recordLine.trim());

if (record.role !== 'train' || record.view_id !== 'front-50') {
  throw new Error(`${scanId} is not a training front-50 record`);
}

const imagePath = record.image.replace('/opt/primestyle/v6/rendered/', path.join(root, '.local-ml/v6r5-apple-pose/rendered/'));
if (!fs.existsSync(imagePath)) throw new Error(`Training image missing: ${imagePath}`);

const canvasWidth = 1200;
const canvasHeight = 768;
const photoWidth = 576;
const photoHeight = 768;
const rowOrder = ['neck', 'chest', 'underbust', 'waist', 'hips'];
const rowLabels = { neck: 'Neck', chest: 'Chest', underbust: 'Under-bust', waist: 'Natural waist', hips: 'Hips' };
const colors = { neck: '#a78bfa', chest: '#38bdf8', underbust: '#fb923c', waist: '#facc15', hips: '#34d399' };

const esc = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
const rows = rowOrder.map((key) => ({ key, ...(record.rows[key] || {}) })).filter((row) => row.accepted);

const photoLines = rows.map((row) => {
  const x1 = row.left_x_norm * photoWidth;
  const x2 = row.right_x_norm * photoWidth;
  const y = row.y_norm * photoHeight;
  return `<line x1="${x1.toFixed(2)}" y1="${y.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${colors[row.key]}" stroke-width="8" stroke-linecap="round"/>\n` +
    `<rect x="${(x2 + 10).toFixed(2)}" y="${(y - 17).toFixed(2)}" width="${row.key === 'underbust' ? 118 : 104}" height="28" rx="7" fill="#020617" fill-opacity="0.9"/>\n` +
    `<text x="${(x2 + 18).toFixed(2)}" y="${(y + 4).toFixed(2)}" font-size="18" font-weight="700" fill="${colors[row.key]}">${esc(rowLabels[row.key])}</text>`;
}).join('\n');

const tableRows = rows.map((row, index) => {
  const y = 265 + index * 78;
  const width = Number(row.mesh_width_mm) / 10;
  const depth = Number(row.mesh_depth_mm) / 10;
  const tape = Number(row.measurement_circumference_mm) / 10;
  return `<circle cx="625" cy="${y - 7}" r="7" fill="${colors[row.key]}"/>\n` +
    `<text x="642" y="${y}" font-size="23" font-weight="750" fill="#f8fafc">${esc(rowLabels[row.key])}</text>\n` +
    `<text x="642" y="${y + 28}" font-size="18" fill="#cbd5e1">row y ${(row.y_norm * 256).toFixed(1)} px · left ${(row.left_x_norm * 192).toFixed(1)} · right ${(row.right_x_norm * 192).toFixed(1)}</text>\n` +
    `<text x="642" y="${y + 53}" font-size="18" fill="#94a3b8">WEAR mesh width ${width.toFixed(1)} cm · depth ${depth.toFixed(1)} cm · tape label ${tape.toFixed(1)} cm</text>`;
}).join('\n');

const svg = Buffer.from(`
<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="576" width="624" height="768" fill="#0f172a"/>
  ${photoLines}
  <text x="616" y="58" font-size="16" font-weight="800" letter-spacing="2" fill="#22d3ee">REAL V7 TRAINING TEACHER</text>
  <text x="616" y="100" font-size="32" font-weight="800" fill="#f8fafc">${esc(record.scan_id)} · front-50</text>
  <text x="616" y="135" font-size="21" fill="#cbd5e1">TRAIN split · ${esc(record.gender)} · ${record.height_cm.toFixed(1)} cm · ${record.weight_kg.toFixed(1)} kg</text>
  <rect x="616" y="162" width="548" height="67" rx="12" fill="#083344" stroke="#22d3ee" stroke-width="1.5"/>
  <text x="636" y="188" font-size="18" font-weight="750" fill="#67e8f9">MODEL INPUT</text>
  <text x="636" y="214" font-size="17" fill="#cffafe">RGB + profile + each row's y / left / right position</text>
  ${tableRows}
  <rect x="616" y="677" width="548" height="66" rx="12" fill="#3f1d0b" stroke="#fb923c" stroke-width="1.5"/>
  <text x="636" y="703" font-size="18" font-weight="750" fill="#fdba74">TARGET TO LEARN</text>
  <text x="636" y="729" font-size="17" fill="#ffedd5">WEAR depth, 32-point body shape, circumference/tape label</text>
  <text x="18" y="742" font-size="17" font-weight="700" fill="#e2e8f0">Exact projected WEAR 3D teacher rows · 192 × 256 enlarged 3×</text>
</svg>`);

async function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const enlargedTeacher = await sharp(imagePath).resize(photoWidth, photoHeight, { fit: 'fill' }).png().toBuffer();
  await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 4, background: '#020617' } })
    .composite([
      { input: enlargedTeacher, left: 0, top: 0, blend: 'over' },
      { input: svg, left: 0, top: 0, blend: 'over' },
    ])
    .png()
    .toFile(outputPath);
  console.log(JSON.stringify({ outputPath, scanId: record.scan_id, role: record.role, rows: rows.map((row) => row.key) }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
