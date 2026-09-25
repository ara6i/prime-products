'use strict';

const { finite, pct, round, RESULT } = require('./commercial-sizing-core.cjs');

const GAP_GROUPS = [
  ['≤2 cm', value => value <= 2],
  ['>2–4 cm', value => value > 2 && value <= 4],
  ['>4–6 cm', value => value > 4 && value <= 6],
  ['>6 cm', value => value > 6],
];
const BOUNDARY_GROUPS = [
  ['≤1 cm', value => value <= 1],
  ['>1–2 cm', value => value > 1 && value <= 2],
  ['>2–3 cm', value => value > 2 && value <= 3],
  ['>3–4 cm', value => value > 3 && value <= 4],
  ['>4 cm', value => value > 4],
];

function accuracyGroups(rows, readValue, groups) {
  const definitions = [...groups, ['Unavailable', value => !finite(value)]];
  return definitions.map(([label, test], index) => {
    const selected = rows.filter(row => {
      const value = readValue(row);
      return index === groups.length ? !finite(value) : finite(value) && test(value);
    });
    const exact = selected.filter(row => row.result === RESULT.exact).length;
    return { label, count: selected.length, exact, exactPct: pct(exact, selected.length) };
  });
}

function averageChartSpacing(rows) {
  const products = new Map();
  for (const row of rows) {
    if (products.has(row.product.id)) {
      if (JSON.stringify(products.get(row.product.id)) !== JSON.stringify(row.chart)) {
        throw new Error(`Conflicting frozen charts for ${row.product.id}`);
      }
    } else products.set(row.product.id, row.chart);
  }
  return Object.fromEntries(['waist', 'hips'].map(measurement => {
    const productMeans = [];
    let pairs = 0;
    for (const chart of products.values()) {
      const gaps = [];
      for (let i = 1; i < chart.orderedSizes.length; i += 1) {
        const a = chart.valuesBySizeCm[chart.orderedSizes[i - 1]]?.[measurement]?.center;
        const b = chart.valuesBySizeCm[chart.orderedSizes[i]]?.[measurement]?.center;
        if (finite(a) && finite(b)) gaps.push(Math.abs(b - a));
      }
      if (gaps.length) {
        productMeans.push(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
        pairs += gaps.length;
      }
    }
    return [measurement, {
      averageCm: productMeans.length ? round(productMeans.reduce((sum, mean) => sum + mean, 0) / productMeans.length) : null,
      products: productMeans.length,
      adjacentPairs: pairs,
    }];
  }));
}

function safeSizingSummary(rows) {
  if (!rows.some(row => row.confidence?.label !== 'N/A')) return null;
  const high = rows.filter(row => row.confidence?.label === 'High');
  const issuedHigh = high.filter(row => row.result !== RESULT.unavailable && row.predictedSize);
  const highExact = issuedHigh.filter(row => row.result === RESULT.exact).length;
  const wrongByTwo = rows.filter(row => row.result === RESULT.severe);
  const failures = rows.filter(row => [RESULT.severe, RESULT.unavailable].includes(row.result));
  const lowWrongByTwo = wrongByTwo.filter(row => row.confidence?.label === 'Low').length;
  const lowFailures = failures.filter(row => row.confidence?.label === 'Low').length;
  return {
    decisions: rows.length,
    highLabelled: high.length,
    highIssued: issuedHigh.length,
    highIssuedCoveragePct: pct(issuedHigh.length, rows.length),
    highExact,
    highIssuedExactPct: pct(highExact, issuedHigh.length),
    highWrongByTwo: issuedHigh.filter(row => row.result === RESULT.severe).length,
    highUnavailable: high.filter(row => row.result === RESULT.unavailable).length,
    wrongByTwo: wrongByTwo.length,
    lowWrongByTwo,
    lowWrongByTwoCaughtPct: pct(lowWrongByTwo, wrongByTwo.length),
    failures: failures.length,
    lowFailures,
    lowFailuresCaughtPct: pct(lowFailures, failures.length),
  };
}

function analyzeCommercialReport(report) {
  return {
    schema: 'commercial-sizing-supplement-v1',
    reportId: report.reportId,
    chartSpacing: averageChartSpacing(report.decisions.aiad),
    models: Object.fromEntries(['aiad', 'v8'].map(model => [model, {
      safeSizing: safeSizingSummary(report.decisions[model]),
      gapGroups: accuracyGroups(report.decisions[model], row => row.adjacentGap?.cm, GAP_GROUPS),
      boundaryGroups: accuracyGroups(report.decisions[model], row => row.nearestBoundary?.distanceCm, BOUNDARY_GROUPS),
    }])),
  };
}

module.exports = { accuracyGroups, averageChartSpacing, safeSizingSummary, analyzeCommercialReport, GAP_GROUPS, BOUNDARY_GROUPS };
