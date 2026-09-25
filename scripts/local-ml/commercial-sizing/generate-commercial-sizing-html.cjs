#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { analyzeCommercialReport } = require('./commercial-sizing-analysis.cjs');
const { buildReportShareText } = require('./report-share-text.cjs');

function assertReport(report) {
  if (!report || report.schema !== 'CommercialSizingReportV1') {
    throw new Error('Expected CommercialSizingReportV1 input.');
  }
  if (!Array.isArray(report.decisions?.aiad) || report.decisions.aiad.length !== 100) {
    throw new Error('Expected exactly 100 Aiad decisions.');
  }
  if (!Array.isArray(report.decisions?.v8) || report.decisions.v8.length !== 100) {
    throw new Error('Expected exactly 100 V8 decisions.');
  }
  if (!Array.isArray(report.manifest?.people) || report.manifest.people.length !== 10) {
    throw new Error('Expected exactly 10 frozen people.');
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeJson(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function formatMetric(value, suffix = '') {
  return value === null || value === undefined ? 'N/A' : `${Number(value).toFixed(2)}${suffix}`;
}

function summaryCard(modelLabel, summary) {
  const severeTotal = summary.outcomes.severe.count + summary.outcomes.noRecommendation.count;
  return `
    <article class="model-card">
      <div class="model-card-head">
        <div><p class="eyebrow">${escapeHtml(modelLabel)}</p><h2>${summary.outcomes.exact.pct}% exact</h2></div>
        <span class="model-pill">100 decisions</span>
      </div>
      <div class="metric-grid">
        <div><strong>${summary.outcomes.exact.count}</strong><span>Exact</span></div>
        <div><strong>${summary.outcomes.adjacent.count}</strong><span>Adjacent</span></div>
        <div><strong>${summary.outcomes.withinOneSize.count}%</strong><span>Within one size</span></div>
        <div class="danger"><strong>${severeTotal}</strong><span>Commercial failures</span></div>
      </div>
      <div class="bar-line"><span style="width:${summary.outcomes.exact.pct}%" class="bar-exact"></span><span style="width:${summary.outcomes.adjacent.pct}%" class="bar-adjacent"></span><span style="width:${severeTotal}%" class="bar-severe"></span></div>
      <p class="card-note">${summary.outcomes.severe.count} were 2+ sizes wrong; ${summary.outcomes.noRecommendation.count} produced no recommendation.</p>
    </article>`;
}

function measurementRows(report) {
  const measures = ['waist', 'hips'];
  return measures.map((measure) => {
    const a = report.summaries.aiad.measurementStats[measure];
    const v = report.summaries.v8.measurementStats[measure];
    return `<tr>
      <th>${escapeHtml(measure === 'hips' ? 'Hip' : measure[0].toUpperCase() + measure.slice(1))}</th>
      <td>${formatMetric(a.maeCm, ' cm')}</td><td>${formatMetric(a.medianAbsoluteErrorCm, ' cm')}</td><td>${formatMetric(a.p90AbsoluteErrorCm, ' cm')}</td><td>${formatMetric(a.within1_27CmPct, '%')}</td><td>${formatMetric(a.within2_54CmPct, '%')}</td><td>${formatMetric(a.within4CmPct, '%')}</td><td>${formatMetric(a.worstAbsoluteErrorCm, ' cm')}</td>
      <td>${formatMetric(v.maeCm, ' cm')}</td><td>${formatMetric(v.medianAbsoluteErrorCm, ' cm')}</td><td>${formatMetric(v.p90AbsoluteErrorCm, ' cm')}</td><td>${formatMetric(v.within1_27CmPct, '%')}</td><td>${formatMetric(v.within2_54CmPct, '%')}</td><td>${formatMetric(v.within4CmPct, '%')}</td><td>${formatMetric(v.worstAbsoluteErrorCm, ' cm')}</td>
    </tr>`;
  }).join('');
}

function cohortRows(report) {
  return report.manifest.people.map((person) => `<tr>
    <td>${escapeHtml(person.scanId)}</td>
    <td>${escapeHtml(person.gender)}</td>
    <td>${escapeHtml(person.bmiBand)}</td>
    <td>${Number(person.bmi).toFixed(1)}</td>
    <td>${Number(person.actuals.waist).toFixed(1)} cm</td>
    <td>${Number(person.actuals.hips).toFixed(1)} cm</td>
  </tr>`).join('');
}

function bucketRows(aiadBuckets, v8Buckets) {
  return aiadBuckets.map((bucket, index) => {
    const v = v8Buckets[index];
    return `<tr><th>${escapeHtml(bucket.label)}</th><td>${bucket.exact} / ${bucket.count}</td><td>${formatMetric(bucket.exactPct, '%')}</td><td>${v.exact} / ${v.count}</td><td>${formatMetric(v.exactPct, '%')}</td></tr>`;
  }).join('');
}

function productChartAppendix(rows) {
  const range = value => !value ? 'N/A' : value.min === value.max
    ? String(value.min) : `${value.min}–${value.max}`;
  return rows.map(row => `<details class="product-chart">
    <summary>${escapeHtml(row.decisionId)} · ${escapeHtml(row.product.title)}</summary>
    <p><strong>Category:</strong> ${escapeHtml(row.product.category)} · <strong>Supplier:</strong> ${escapeHtml(row.product.supplier || 'Unknown')} · <strong>Product ID:</strong> ${escapeHtml(row.product.id)}</p>
    <p>${row.product.myaifittingUrl ? `<a href="${escapeHtml(row.product.myaifittingUrl)}" target="_blank" rel="noopener noreferrer">Open in MyAIFitting preview</a>` : 'MyAIFitting link unavailable'}${row.product.sourceChartUrl ? ` · <a href="${escapeHtml(row.product.sourceChartUrl)}" target="_blank" rel="noopener noreferrer">Original chart source</a>` : ''}</p>
    <p><strong>Material:</strong> ${escapeHtml(row.product.rawMaterial || 'Unknown')} · <strong>Stretch evidence:</strong> ${escapeHtml(row.product.stretchEvidence.join('; ') || 'Not recorded')}</p>
    <p><strong>Purchasable sizes at test time:</strong> ${escapeHtml(row.purchasableSizes.join(', '))} · <strong>Chart basis:</strong> ${escapeHtml(row.chart.basis)}</p>
    <div class="table-wrap"><table><thead><tr><th>Size</th><th>Waist (cm)</th><th>Hip (cm)</th></tr></thead><tbody>${row.chart.orderedSizes.map(size => { const values = row.chart.valuesBySizeCm[size]; return `<tr><th>${escapeHtml(size)}</th><td>${escapeHtml(range(values?.waist))}</td><td>${escapeHtml(range(values?.hips))}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="card-note">Saved chart used for this test · original unit: ${escapeHtml(row.chart.sourceUnit)} · SHA-256: ${escapeHtml(row.chart.chartSha256)}</p>
  </details>`).join('');
}

function buildCommercialSizingHtml(report, options = {}) {
  assertReport(report);
  const aiad = report.summaries.aiad;
  const v8 = report.summaries.v8;
  const analysis = analyzeCommercialReport(report);
  const safeSizing = analysis.models.aiad.safeSizing;
  const review = options.review || report.review;
  const productLinks = options.productLinks?.products || {};
  if (options.productLinks && options.productLinks.reportId !== report.reportId) throw new Error('Product links belong to a different report.');
  for (const row of report.decisions.aiad) {
    const link = productLinks[row.product.id];
    if (options.productLinks && (!link || new URL(link.url).origin !== 'https://preview.myaifitting.com')) throw new Error(`Missing or invalid MyAIFitting link for ${row.product.id}`);
    if (link?.sourceChartUrl && new URL(link.sourceChartUrl).protocol !== 'https:') throw new Error('Chart source must use HTTPS.');
  }
  const waistHip = values => values == null ? null : { waist: values.waist ?? null, hips: values.hips ?? null };
  const displayedDecisions = Object.fromEntries(['aiad', 'v8'].map(model => [model, report.decisions[model].map(row => ({
    ...row,
    product: { ...row.product, myaifittingUrl: productLinks[row.product.id]?.url || null, sourceChartUrl: productLinks[row.product.id]?.sourceChartUrl || null },
    actualTapeCm: waistHip(row.actualTapeCm),
    predictedTapeCm: waistHip(row.predictedTapeCm),
    signedErrorCm: waistHip(row.signedErrorCm),
    sigmaCm: waistHip(row.sigmaCm),
  }))]));
  const manifestHash = report.manifest.selectionSha256;
  const embedded = safeJson({
    reportId: report.reportId,
    manifestHash,
    review,
    analysis,
    decisions: displayedDecisions,
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="color-scheme" content="light">
  <title>Waist/Hip 100-Decision Commercial Validation · PrimeStyleAI</title>
  <style>
    :root{--ink:#17231f;--muted:#65716b;--line:#dbe4df;--paper:#fff;--wash:#f4f7f5;--green:#145c43;--green2:#2f8a68;--lime:#d8f5e7;--amber:#d18b24;--red:#b94747;--blue:#315f8d;--shadow:0 18px 50px rgba(21,52,40,.1)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:linear-gradient(180deg,#e9f2ed 0,#f6f8f7 280px,#edf2ef 100%);color:var(--ink);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15px;line-height:1.5}
    button,select,input{font:inherit}a{color:inherit}.shell{max-width:1520px;margin:0 auto;padding:30px 28px 80px}.hero{background:#102c22;color:#fff;border-radius:28px;padding:34px 38px;box-shadow:var(--shadow);position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:430px;height:430px;border-radius:50%;right:-150px;top:-230px;background:radial-gradient(circle,rgba(131,230,185,.36),transparent 66%)}
    .hero-grid{display:grid;grid-template-columns:1fr auto;gap:28px;position:relative;z-index:1}.eyebrow{margin:0 0 7px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;font-size:11px;color:#73d3aa}.hero h1{font-size:clamp(30px,4vw,56px);line-height:1.02;letter-spacing:-.045em;max-width:920px;margin:0}.hero-copy{max-width:900px;color:#d3e4dc;font-size:17px;margin:18px 0 0}.private-mark{border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.08);border-radius:18px;padding:15px 18px;min-width:190px;height:max-content}.private-mark strong,.private-mark span{display:block}.private-mark span{font-size:12px;color:#c5dbd1;margin-top:4px}
    .audit-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:rgba(255,255,255,.16);margin-top:30px;border:1px solid rgba(255,255,255,.14);border-radius:16px;overflow:hidden;position:relative;z-index:1}.audit-strip div{padding:12px 14px;background:rgba(0,0,0,.13)}.audit-strip span{display:block;color:#b9cec5;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.audit-strip strong{font-size:13px;word-break:break-word}.toolbar{display:flex;gap:10px;justify-content:flex-end;margin:18px 0}.btn{border:1px solid var(--line);background:#fff;border-radius:11px;padding:9px 13px;font-weight:750;cursor:pointer;color:var(--ink)}.btn:hover{border-color:#8dad9f;background:#f8fbf9}.section{margin-top:22px;background:rgba(255,255,255,.92);border:1px solid var(--line);border-radius:22px;padding:25px;box-shadow:0 8px 30px rgba(28,59,47,.05)}.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.section h2{margin:0;font-size:25px;letter-spacing:-.025em}.section-head p{margin:4px 0 0;color:var(--muted)}
    .warning{border-left:5px solid var(--amber);background:#fff7e8}.warning strong{display:block;font-size:18px;margin-bottom:6px}.warning ul{margin:0;padding-left:20px}.model-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.model-card{border:1px solid var(--line);border-radius:18px;padding:21px;background:linear-gradient(145deg,#fff,#f5faf7)}.model-card-head{display:flex;justify-content:space-between;align-items:flex-start}.model-card h2{font-size:30px}.model-pill{background:var(--lime);color:var(--green);font-size:12px;font-weight:800;border-radius:999px;padding:6px 10px}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.metric-grid div{border-radius:12px;background:#fff;border:1px solid var(--line);padding:12px}.metric-grid strong,.metric-grid span{display:block}.metric-grid strong{font-size:23px}.metric-grid span{font-size:11px;color:var(--muted)}.metric-grid .danger{background:#fff1f0;border-color:#efd0cd}.bar-line{height:11px;display:flex;border-radius:10px;overflow:hidden;background:#e4e9e6}.bar-line span{display:block;height:100%}.bar-exact{background:var(--green2)}.bar-adjacent{background:var(--amber)}.bar-severe{background:var(--red)}.card-note{font-size:12px;color:var(--muted);margin:9px 0 0}
    .confidence-alert{margin-top:17px;border:1px solid #edc7c3;background:#fff3f1;border-radius:15px;padding:16px 18px}.confidence-alert strong{color:#8d2929}.confidence-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:13px}.confidence-grid div{background:#fff;border:1px solid #edd9d6;padding:12px;border-radius:11px}.confidence-grid strong,.confidence-grid span{display:block}.confidence-grid span{font-size:12px;color:var(--muted)}
    .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fff}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:11px 12px;border-bottom:1px solid #e6ece8;white-space:nowrap}thead th{position:sticky;top:0;background:#edf4f0;color:#3d5148;font-size:11px;text-transform:uppercase;letter-spacing:.045em;z-index:2}tbody tr:last-child td,tbody tr:last-child th{border-bottom:0}tbody tr:hover{background:#f7faf8}.split{display:grid;grid-template-columns:1fr 1fr;gap:18px}.filters{display:grid;grid-template-columns:repeat(5,minmax(140px,1fr)) auto;gap:10px;margin-bottom:15px}.field label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:800;margin-bottom:5px}.field select,.field input{width:100%;border:1px solid #cdd9d3;border-radius:10px;padding:9px 10px;background:#fff;color:var(--ink)}.decision-table tbody tr{cursor:pointer}.result{font-size:11px;font-weight:850;border-radius:999px;padding:4px 8px;display:inline-block}.result-exact{background:#dff4e9;color:#176044}.result-adjacent{background:#fff1ce;color:#77530f}.result-severe,.result-none{background:#ffe4e1;color:#8a2828}.muted{color:var(--muted)}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.count{font-weight:800;color:var(--green)}
    dialog{width:min(920px,calc(100vw - 32px));max-height:88vh;border:0;border-radius:20px;padding:0;box-shadow:0 30px 100px rgba(0,0,0,.35)}dialog::backdrop{background:rgba(9,25,19,.64)}.dialog-head{position:sticky;top:0;background:#133d2e;color:#fff;padding:19px 22px;display:flex;justify-content:space-between;align-items:center;z-index:2}.dialog-head h2{margin:0;font-size:20px}.dialog-close{border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;border-radius:9px;padding:6px 9px;cursor:pointer}.dialog-body{padding:22px}.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.detail-grid div{border:1px solid var(--line);border-radius:11px;padding:11px}.detail-grid span,.detail-grid strong{display:block}.detail-grid span{color:var(--muted);font-size:11px}.detail-block{margin-top:17px}.detail-block h3{font-size:14px;margin:0 0 8px}.detail-block pre{white-space:pre-wrap;word-break:break-word;background:var(--wash);border-radius:12px;padding:13px;font-size:11px;max-height:240px;overflow:auto}
    .provenance{font-size:12px;color:#53615a}.provenance code{word-break:break-all}.footer{text-align:center;color:#718078;font-size:12px;margin-top:28px}.print-only{display:none}
    .product-chart{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-top:10px}.product-chart summary{cursor:pointer;font-weight:750}.product-chart p{font-size:13px;overflow-wrap:anywhere}.product-chart a{color:var(--green);font-weight:700}.share-status{align-self:center;color:var(--green);font-size:13px}.share-fallback{padding:24px}.share-fallback textarea{display:block;width:100%;min-height:50vh;margin:15px 0;font:12px ui-monospace,monospace}
    @media(max-width:980px){.hero-grid,.model-grid,.split{grid-template-columns:1fr}.audit-strip{grid-template-columns:1fr 1fr}.filters{grid-template-columns:1fr 1fr}.metric-grid{grid-template-columns:1fr 1fr}.confidence-grid,.detail-grid{grid-template-columns:1fr}.private-mark{max-width:260px}}
    @media(max-width:620px){.shell{padding:14px 10px 50px}.hero,.section{border-radius:17px;padding:20px}.audit-strip,.filters{grid-template-columns:1fr}.hero h1{font-size:35px}.toolbar{justify-content:flex-start;flex-wrap:wrap}}
    @media print{body{background:#fff}.shell{max-width:none;padding:0}.toolbar,.filters,.decision-table,.footer{display:none}.hero,.section{box-shadow:none;break-inside:avoid}.hero{color:#000;background:#fff;border:2px solid #142a21}.hero-copy,.audit-strip span{color:#333}.audit-strip div{background:#fff}.print-only{display:block}}
  </style>
</head>
<body>
<main class="shell">
  <header class="hero">
    <div class="hero-grid">
      <div><p class="eyebrow">PrimeStyleAI · Private Test Lab</p><h1>Waist/Hip 100-Decision Commercial Validation</h1><p class="hero-copy">A frozen 10-person × 10-product test comparing Aiad and V8 against the same recorded WEAR tapes and the same stocked product charts.</p></div>
      <div class="private-mark"><strong>Private research</strong><span>Not a fit or production-readiness claim</span></div>
    </div>
    <div class="audit-strip">
      <div><span>Report</span><strong>${escapeHtml(report.reportId)}</strong></div>
      <div><span>Cohort</span><strong>5 women · 5 men</strong></div>
      <div><span>Products</span><strong>100 unique</strong></div>
      <div><span>Apple / Depth Pro</span><strong>OFF · not run</strong></div>
      <div><span>Engineering conclusion</span><strong>${escapeHtml(review.conclusion)}</strong></div>
    </div>
  </header>
  <div class="toolbar"><span class="share-status" id="share-status" role="status" aria-live="polite"></span><button class="btn" id="share-chatgpt" type="button">Share with ChatGPT</button></div>

  <section class="section warning"><strong>Read this before judging the numbers</strong><ul>${report.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></section>

  <section class="section">
    <div class="section-head"><div><p class="eyebrow">Executive result</p><h2>Size-selection stability</h2><p>Severe commercial failures include both 2+ sizes wrong and no recommendation.</p></div></div>
    <p id="category-mix"><strong>100 products, waist/hip only:</strong> ${aiad.categoryMix.map(item => `${escapeHtml(item.category)}: ${item.count}`).join(' · ')}.</p>
    <div class="model-grid">${summaryCard('Aiad frozen 448 subset', aiad)}${summaryCard('Our model', v8)}</div>
    <div class="confidence-alert"><strong>The report’s Aiad-based confidence rule did not identify safe recommendations.</strong> High-confidence decisions performed worse than low-confidence decisions. This rule combines chart distance with Aiad uncertainty; it is not a calibrated probability of correct size.
      <div class="confidence-grid">
        <div><strong>${aiad.confidence.high.exactPct}% exact</strong><span>High · ${aiad.confidence.high.count} decisions · ${aiad.confidence.high.severeCount} serious misses</span></div>
        <div><strong>${aiad.confidence.medium.exactPct}% exact</strong><span>Medium · ${aiad.confidence.medium.count} decisions · ${aiad.confidence.medium.severeCount} serious misses</span></div>
        <div><strong>${aiad.confidence.low.exactPct}% exact</strong><span>Low · ${aiad.confidence.low.count} decisions · ${aiad.confidence.low.severeCount} serious misses</span></div>
      </div>
    </div>
  </section>

  <section class="section" id="safe-sizing">
    <div class="section-head"><div><p class="eyebrow">Safe sizing</p><h2>What if we only return High-confidence sizes?</h2><p>A confidence label can exist even when the size engine returns no recommendation. The table separates those cases.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Aiad confidence result</th><th>Observed result</th></tr></thead><tbody>
      <tr><th>Cases labelled High</th><td>${safeSizing.highLabelled} / ${safeSizing.decisions}</td></tr>
      <tr><th>High cases that returned a size</th><td>${safeSizing.highIssued} / ${safeSizing.decisions} (${formatMetric(safeSizing.highIssuedCoveragePct, '%')} coverage)</td></tr>
      <tr><th>Exact matches among High sizes actually returned</th><td>${safeSizing.highExact} / ${safeSizing.highIssued} (${formatMetric(safeSizing.highIssuedExactPct, '%')})</td></tr>
      <tr><th>High sizes wrong by two or more sizes</th><td>${safeSizing.highWrongByTwo} / ${safeSizing.highIssued}</td></tr>
      <tr><th>High cases with no size returned</th><td>${safeSizing.highUnavailable} / ${safeSizing.highLabelled}</td></tr>
      <tr><th>Two-or-more-size errors flagged Low</th><td>${safeSizing.lowWrongByTwo} / ${safeSizing.wrongByTwo} (${formatMetric(safeSizing.lowWrongByTwoCaughtPct, '%')} caught)</td></tr>
      <tr><th>All commercial failures flagged Low, including no size</th><td>${safeSizing.lowFailures} / ${safeSizing.failures} (${formatMetric(safeSizing.lowFailuresCaughtPct, '%')} caught)</td></tr>
    </tbody></table></div>
    <p><strong>Interpretation:</strong> The ${safeSizing.highIssued} returned High-confidence sizes include ${safeSizing.highWrongByTwo} serious size error. This small group does not establish reliable customer sizing. V8 has no per-person confidence output, so its confidence coverage is N/A.</p>
  </section>

  <section class="section">
    <div class="section-head"><div><p class="eyebrow">Tape diagnostics</p><h2>Waist and hip measurement error</h2><p>Measured across ten unique people. MAE is the average absolute error. P90 is the error at the 90th percentile.</p></div></div>
    <div class="table-wrap"><table id="measurement-summary"><thead><tr><th rowspan="2">Measure</th><th colspan="7">Aiad</th><th colspan="7">V8</th></tr><tr><th>MAE</th><th>Median</th><th>P90</th><th>≤1.27 cm</th><th>≤2.54 cm</th><th>≤4 cm</th><th>Worst</th><th>MAE</th><th>Median</th><th>P90</th><th>≤1.27 cm</th><th>≤2.54 cm</th><th>≤4 cm</th><th>Worst</th></tr></thead><tbody>${measurementRows(report)}</tbody></table></div>
    <p class="card-note">The percentage columns show how many people were within the stated error. Each person counts once.</p>
  </section>

  <section class="section">
    <div class="section-head"><div><p class="eyebrow">Decision sensitivity</p><h2>When does the AI choose the correct size?</h2><p>Each cell shows exact matches / all decisions in that group, followed by the correct-size percentage. No recommendation remains a failure in the denominator. Empty groups show N/A.</p></div></div>
    <div class="split">
      <div class="table-wrap"><table id="gap-accuracy"><thead><tr><th>Gap between sizes</th><th>Aiad exact / total</th><th>Aiad correct</th><th>V8 exact / total</th><th>V8 correct</th></tr></thead><tbody>${bucketRows(analysis.models.aiad.gapGroups, analysis.models.v8.gapGroups)}</tbody></table></div>
      <div class="table-wrap"><table id="boundary-accuracy"><thead><tr><th>Distance from size midpoint</th><th>Aiad exact / total</th><th>Aiad correct</th><th>V8 exact / total</th><th>V8 correct</th></tr></thead><tbody>${bucketRows(analysis.models.aiad.boundaryGroups, analysis.models.v8.boundaryGroups)}</tbody></table></div>
    </div>
    <p class="card-note">These groups use the frozen report’s nearest chart midpoint around the real-tape reference size. The midpoint is a diagnostic approximation, not the full sizing engine’s decision boundary. Group rates describe this sample and do not establish a customer confidence rule.</p>
  </section>

  <section class="section">
    <div class="section-head"><div><p class="eyebrow">Product charts</p><h2>Average gap between purchasable sizes</h2><p>Both models use the same product charts.</p></div></div>
    <div class="table-wrap"><table id="chart-spacing"><thead><tr><th>Measurement</th><th>Average gap</th><th>Products with usable gaps</th><th>Adjacent size pairs</th></tr></thead><tbody>${['waist', 'hips'].map(measure => { const value = analysis.chartSpacing[measure]; return `<tr><th>${measure === 'hips' ? 'Hip' : 'Waist'}</th><td>${formatMetric(value.averageCm, ' cm')}</td><td>${value.products} / 100</td><td>${value.adjacentPairs}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="card-note">Each product has equal weight: average its gaps between adjacent stocked size-chart centres, then average across products. Missing measurement pairs are excluded and their coverage is shown above.</p>
  </section>

  <section class="section warning" id="commercial-conclusion">
    <div class="section-head"><div><p class="eyebrow">Engineering conclusion</p><h2>Good enough for automatic customer sizing? ${escapeHtml(review.conclusion)}</h2></div></div>
    <p>${escapeHtml(review.rationale || 'A written engineering assessment has not been supplied.')}</p>
    <p><strong>High-confidence coverage:</strong> Aiad returned a High-labelled size for ${safeSizing.highIssued} / 100 decisions, with ${safeSizing.highExact} / ${safeSizing.highIssued} exact matches (${formatMetric(safeSizing.highIssuedExactPct, '%')}). Across all ${safeSizing.highLabelled} High-labelled cases, including no recommendation, exact accuracy was ${aiad.confidence.high.exactPct}%. A reliably safe percentage has not been established. V8 confidence is N/A.</p>
    <p><strong>Next steps:</strong> investigate size changes and unavailable recommendations, validate the chart interpretation, recalibrate confidence against correct-size outcomes, then run the planned purchase/keep test.</p>
    <p class="card-note">Assessment by ${escapeHtml(review.reviewer || 'Unassigned')} · ${escapeHtml(review.updatedAt || review.createdAt || 'Undated')}. This is an engineering assessment of this sample.</p>
  </section>

  <section class="section">
    <div class="section-head"><div><p class="eyebrow">Frozen cohort</p><h2>Ten WEAR people</h2><p>One person per sex from each BMI band; selection was frozen before AI outcomes were inspected.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Scan</th><th>Sex</th><th>BMI band</th><th>BMI</th><th>Recorded waist</th><th>Recorded hip</th></tr></thead><tbody>${cohortRows(report)}</tbody></table></div>
  </section>

  <section class="section" id="decisions">
    <div class="section-head"><div><p class="eyebrow">Decision explorer</p><h2>Search all 100 decisions</h2><p>Click a row for complete chart, boundary, material, uncertainty and provenance details.</p></div><div class="count" id="visible-count">100 rows</div></div>
    <div class="filters">
      <div class="field"><label for="model-filter">Model</label><select id="model-filter"><option value="aiad">Aiad</option><option value="v8">V8</option></select></div>
      <div class="field"><label for="category-filter">Category</label><select id="category-filter"><option value="all">All categories</option><option>Women’s pants</option><option>Women’s shorts</option><option>Women’s skirts</option><option>Men’s pants</option><option>Men’s shorts</option></select></div>
      <div class="field"><label for="result-filter">Result</label><select id="result-filter"><option value="all">All results</option><option>Exact</option><option>Adjacent</option><option>2+ Sizes Wrong</option><option>No Recommendation</option></select></div>
      <div class="field"><label for="confidence-filter">Confidence</label><select id="confidence-filter"><option value="all">All confidence</option><option>High</option><option>Medium</option><option>Low</option><option>N/A</option></select></div>
      <div class="field"><label for="search-filter">Search</label><input id="search-filter" type="search" placeholder="Person, product, size…"></div>
      <button class="btn" id="reset-filters" type="button">Reset</button>
    </div>
    <div class="table-wrap decision-table"><table><thead><tr><th>ID</th><th>Person</th><th>Product</th><th>Category</th><th>Actual W/H</th><th>Predicted W/H</th><th>Error W/H</th><th>Real size</th><th>AI size</th><th>Result</th><th>Confidence</th></tr></thead><tbody id="decision-body"></tbody></table></div>
  </section>

  <section class="section" id="product-charts">
    <div class="section-head"><div><p class="eyebrow">Products and size charts</p><h2>All 100 products</h2><p>Open a product below to read its saved waist/hip chart. MyAIFitting preview links may require sign-in. The chart and stock reflect the frozen test, so the current product page may differ. Share with ChatGPT copies every product and chart, including closed sections.</p></div></div>
    ${productChartAppendix(displayedDecisions.aiad)}
  </section>

  <section class="section provenance">
    <div class="section-head"><div><p class="eyebrow">Instructions & provenance</p><h2>What this report does—and does not—prove</h2></div></div>
    <p><strong>Correct size:</strong> ${escapeHtml(report.scope.correctSizeDefinition)}</p>
    <p><strong>Commercial question:</strong> ${escapeHtml(report.scope.commercialQuestion)}</p>
    <p><strong>Purchase/keep:</strong> ${escapeHtml(report.scope.purchaseKeepValidation)}</p>
    <p><strong>Manifest SHA-256:</strong> <code>${escapeHtml(manifestHash)}</code></p>
    <p><strong>Aiad model SHA-256:</strong> <code>${escapeHtml(report.sources.aiadReport.modelSha256)}</code></p>
    <p><strong>V8 model SHA-256:</strong> <code>${escapeHtml(report.sources.v8.modelSha256)}</code></p>
    <p><strong>Workbook template:</strong> unchanged; SHA-256 <code>${escapeHtml(report.sources.workbookTemplate.sha256)}</code></p>
    <p><strong>Reviewer conclusion:</strong> ${escapeHtml(review.conclusion)}. The dated assessment is stored separately from the unchanged original test data.</p>
  </section>
  <p class="footer">PrimeStyleAI private research output · ${escapeHtml(report.reportId)} · noindex / noarchive</p>
</main>

<dialog id="decision-dialog"><div class="dialog-head"><h2 id="dialog-title">Decision details</h2><button class="dialog-close" id="dialog-close" type="button">Close</button></div><div class="dialog-body" id="dialog-body"></div></dialog>
<dialog id="share-fallback" class="share-fallback"><h2>Copy the full report</h2><p>Press Command+C or Ctrl+C, then paste into ChatGPT.</p><textarea id="share-text" aria-label="Full report to copy" readonly></textarea><button class="btn" id="share-close" type="button">Close</button></dialog>
<script id="report-data" type="application/json">${embedded}</script>
<script>
(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('report-data').textContent);
  const $ = (id) => document.getElementById(id);
  const filters = { model: $('model-filter'), category: $('category-filter'), result: $('result-filter'), confidence: $('confidence-filter'), search: $('search-filter') };
  const body = $('decision-body');
  const buildShareText = ${buildReportShareText.toString()};
  let visibleRows = [];

  const fmt = (value) => value === null || value === undefined ? 'N/A' : Number(value).toFixed(1);
  const confidenceLabel = (row) => row.confidence && row.confidence.label ? row.confidence.label : 'N/A';
  const resultClass = (result) => result === 'Exact' ? 'result-exact' : result === 'Adjacent' ? 'result-adjacent' : result === 'No Recommendation' ? 'result-none' : 'result-severe';
  const addCell = (tr, text, className) => { const td = document.createElement('td'); td.textContent = text; if (className) td.className = className; tr.appendChild(td); return td; };

  function filtered() {
    const query = filters.search.value.trim().toLowerCase();
    return data.decisions[filters.model.value].filter((row) => {
      if (filters.category.value !== 'all' && row.product.category !== filters.category.value) return false;
      if (filters.result.value !== 'all' && row.result !== filters.result.value) return false;
      if (filters.confidence.value !== 'all' && confidenceLabel(row) !== filters.confidence.value) return false;
      if (!query) return true;
      return [row.decisionId,row.person.scanId,row.product.title,row.product.category,row.referenceSize,row.predictedSize,row.result,confidenceLabel(row)].join(' ').toLowerCase().includes(query);
    });
  }

  function render() {
    visibleRows = filtered();
    body.replaceChildren();
    visibleRows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.setAttribute('aria-label', 'Open details for ' + row.decisionId);
      addCell(tr,row.decisionId,'mono');
      addCell(tr,row.person.scanId);
      addCell(tr,row.product.title);
      addCell(tr,row.product.category);
      addCell(tr,fmt(row.actualTapeCm.waist)+' / '+fmt(row.actualTapeCm.hips));
      addCell(tr,fmt(row.predictedTapeCm.waist)+' / '+fmt(row.predictedTapeCm.hips));
      addCell(tr,fmt(row.signedErrorCm.waist)+' / '+fmt(row.signedErrorCm.hips));
      addCell(tr,row.referenceSize || 'None');
      addCell(tr,row.predictedSize || 'None');
      const resultCell = addCell(tr,'');
      const badge = document.createElement('span'); badge.className = 'result '+resultClass(row.result); badge.textContent = row.result; resultCell.appendChild(badge);
      addCell(tr,confidenceLabel(row));
      tr.addEventListener('click', () => openDetail(row));
      tr.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail(row); } });
      body.appendChild(tr);
    });
    $('visible-count').textContent = visibleRows.length + (visibleRows.length === 1 ? ' row' : ' rows');
  }

  function detailItem(label, value) {
    const div = document.createElement('div'); const span = document.createElement('span'); const strong = document.createElement('strong');
    span.textContent = label; strong.textContent = value; div.append(span,strong); return div;
  }

  function block(title, value) {
    const wrap = document.createElement('section'); wrap.className='detail-block'; const h=document.createElement('h3'); h.textContent=title; const pre=document.createElement('pre'); pre.textContent=typeof value==='string'?value:JSON.stringify(value,null,2); wrap.append(h,pre); return wrap;
  }

  function openDetail(row) {
    $('dialog-title').textContent = row.decisionId + ' · ' + row.person.scanId + ' · ' + row.product.title;
    const content = $('dialog-body'); content.replaceChildren();
    const grid = document.createElement('div'); grid.className='detail-grid';
    grid.append(
      detailItem('Model', row.model === 'v8' ? 'Our model' : 'Aiad'),
      detailItem('Reference → AI size', (row.referenceSize || 'None') + ' → ' + (row.predictedSize || 'None')),
      detailItem('Result', row.result),
      detailItem('Recorded waist / hip', fmt(row.actualTapeCm.waist) + ' / ' + fmt(row.actualTapeCm.hips) + ' cm'),
      detailItem('Predicted waist / hip', fmt(row.predictedTapeCm.waist) + ' / ' + fmt(row.predictedTapeCm.hips) + ' cm'),
      detailItem('Signed waist / hip error', fmt(row.signedErrorCm.waist) + ' / ' + fmt(row.signedErrorCm.hips) + ' cm'),
      detailItem('Chart steps', String(row.chartSteps)),
      detailItem('Confidence', confidenceLabel(row) + (row.confidence.ratio === null || row.confidence.ratio === undefined ? '' : ' · ' + Number(row.confidence.ratio).toFixed(2))),
      detailItem('Apple / Depth Pro', row.apple.status)
    );
    content.append(grid);
    if (row.product.myaifittingUrl) {
      const link = document.createElement('a'); link.href = row.product.myaifittingUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open in MyAIFitting preview'; content.append(link);
    }
    content.append(block('Product and material', {product:row.product,purchasableSizes:row.purchasableSizes,stretchEvidence:row.product.stretchEvidence}));
    content.append(block('Chart values in centimetres', {basis:row.chart.basis,relevantMeasurements:row.chart.relevantMeasurements,valuesBySizeCm:row.chart.valuesBySizeCm,chartSha256:row.chart.chartSha256}));
    content.append(block('Gap, boundary and uncertainty', {adjacentGap:row.adjacentGap,nearestBoundary:row.nearestBoundary,sigmaCm:row.sigmaCm,confidence:row.confidence,gapErrorRatio:row.gapErrorRatio}));
    content.append(block('Quality, keep/exchange and notes', {dataQualityFlag:row.dataQualityFlag,keepExchange:row.keepExchange,notes:row.notes}));
    $('decision-dialog').showModal();
  }

  async function shareWithChatGpt() {
    $('share-chatgpt').textContent = 'Share with ChatGPT';
    const text = buildShareText(document, data);
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch {}
    if (!copied) {
      const temporary = document.createElement('textarea'); temporary.value = text; temporary.style.position = 'fixed'; temporary.style.left = '-9999px'; document.body.appendChild(temporary); temporary.select();
      try { copied = document.execCommand('copy'); } catch {}
      temporary.remove();
    }
    if (copied) {
      $('share-chatgpt').textContent = '✓ Copied';
      $('share-status').textContent = 'Copied all text, tables and 100 product charts. Paste into ChatGPT.';
    } else {
      $('share-text').value = text; $('share-fallback').showModal(); $('share-text').focus(); $('share-text').select();
      $('share-status').textContent = 'Select and copy the full report in the window.';
    }
  }

  Object.values(filters).forEach((field) => field.addEventListener(field.tagName === 'INPUT' ? 'input' : 'change', render));
  $('reset-filters').addEventListener('click', () => { filters.model.value='aiad'; filters.category.value='all'; filters.result.value='all'; filters.confidence.value='all'; filters.search.value=''; render(); });
  $('share-chatgpt').addEventListener('click', shareWithChatGpt);
  $('share-close').addEventListener('click', () => $('share-fallback').close());
  $('dialog-close').addEventListener('click', () => $('decision-dialog').close());
  $('decision-dialog').addEventListener('click', (event) => { if (event.target === $('decision-dialog')) $('decision-dialog').close(); });
  render();
})();
</script>
</body>
</html>`;
}

function main() {
  const [, , reportArg, outputArg, reviewArg, productLinksArg] = process.argv;
  if (!reportArg || !outputArg) {
    throw new Error('Usage: node generate-commercial-sizing-html.cjs <report.json> <output.html>');
  }
  const reportPath = path.resolve(reportArg);
  const outputPath = path.resolve(outputArg);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const review = reviewArg ? JSON.parse(fs.readFileSync(path.resolve(reviewArg), 'utf8')) : undefined;
  if (review && (review.reportId !== report.reportId || review.reportSha256 !== crypto.createHash('sha256').update(fs.readFileSync(reportPath)).digest('hex')
    || !['YES', 'CONDITIONALLY', 'NO'].includes(review.conclusion) || !review.rationale?.trim())) {
    throw new Error('Review must contain a conclusion and rationale for this exact frozen report.');
  }
  const productLinks = productLinksArg ? JSON.parse(fs.readFileSync(path.resolve(productLinksArg), 'utf8')) : undefined;
  const html = buildCommercialSizingHtml(report, { review, productLinks });
  const sha256 = crypto.createHash('sha256').update(html).digest('hex');
  const checksumPath = path.join(path.dirname(outputPath), 'SHA256SUMS.txt');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, { encoding: 'utf8', flag: 'wx' });
  fs.writeFileSync(checksumPath, `${sha256}  ${path.basename(outputPath)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ outputPath, checksumPath, sha256, bytes: Buffer.byteLength(html), reportId: report.reportId }, null, 2)}\n`);
}

if (require.main === module) main();

module.exports = { assertReport, buildCommercialSizingHtml };
