'use strict';

const crypto = require('node:crypto');

const RESULT = Object.freeze({
  exact: 'Exact',
  adjacent: 'Adjacent',
  severe: '2+ Sizes Wrong',
  unavailable: 'No Recommendation',
});

const CONFIDENCE = Object.freeze({ high: 'High', medium: 'Medium', low: 'Low', na: 'N/A' });
const MEASURES = Object.freeze(['waist', 'hips', 'chest', 'thigh']);

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function positive(value) {
  return finite(value) && value > 0;
}

function round(value, digits = 4) {
  if (!finite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function bmiFor(heightCm, weightKg) {
  return positive(heightCm) && positive(weightKg) ? weightKg / ((heightCm / 100) ** 2) : null;
}

function bmiBand(bmi) {
  if (!positive(bmi)) return null;
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  if (bmi < 35) return 'obesity-i';
  return 'obesity-ii-plus';
}

function toCm(value, unit) {
  if (!finite(value)) return null;
  if (unit === 'cm') return value;
  if (unit === 'in') return value * 2.54;
  throw new Error(`Unsupported measurement unit: ${String(unit)}`);
}

function normalizeRangeToCm(range, unit) {
  if (!range || !finite(range.min) || !finite(range.max) || range.min > range.max) return null;
  const min = toCm(range.min, unit);
  const max = toCm(range.max, unit);
  return { min: round(min), max: round(max), center: round((min + max) / 2) };
}

function classifyResult(referenceIndex, predictionIndex, predictionReady) {
  if (!predictionReady || !Number.isInteger(predictionIndex) || predictionIndex < 0) {
    return { result: RESULT.unavailable, chartSteps: null };
  }
  if (!Number.isInteger(referenceIndex) || referenceIndex < 0) {
    throw new Error('A frozen decision must have an ordered real-tape reference size.');
  }
  const chartSteps = predictionIndex - referenceIndex;
  const absolute = Math.abs(chartSteps);
  if (absolute === 0) return { result: RESULT.exact, chartSteps };
  if (absolute === 1) return { result: RESULT.adjacent, chartSteps };
  return { result: RESULT.severe, chartSteps };
}

function boundaryCandidates({ orderedSizes, referenceIndex, chartBySizeCm, predicted }) {
  if (!Array.isArray(orderedSizes) || !Number.isInteger(referenceIndex) || referenceIndex < 0) return [];
  const referenceLabel = orderedSizes[referenceIndex];
  const reference = chartBySizeCm?.[referenceLabel];
  if (!reference) return [];
  const neighbours = [referenceIndex - 1, referenceIndex + 1].filter(index => index >= 0 && index < orderedSizes.length);
  const candidates = [];
  for (const neighbourIndex of neighbours) {
    const neighbourLabel = orderedSizes[neighbourIndex];
    const neighbour = chartBySizeCm?.[neighbourLabel];
    const direction = neighbourIndex > referenceIndex ? 'larger' : 'smaller';
    for (const measurement of ['waist', 'hips']) {
      const referenceRange = reference?.[measurement];
      const neighbourRange = neighbour?.[measurement];
      const predictedTape = predicted?.[measurement];
      if (!referenceRange || !neighbourRange || !finite(predictedTape)) continue;
      const facingReferenceEdge = direction === 'larger' ? referenceRange.max : referenceRange.min;
      const facingNeighbourEdge = direction === 'larger' ? neighbourRange.min : neighbourRange.max;
      const boundaryCm = (facingReferenceEdge + facingNeighbourEdge) / 2;
      const adjacentGapCm = Math.abs(neighbourRange.center - referenceRange.center);
      candidates.push({
        measurement,
        neighbourSize: neighbourLabel,
        neighbourIndex,
        direction,
        boundaryCm: round(boundaryCm),
        predictedTapeCm: round(predictedTape),
        boundaryDistanceCm: round(Math.abs(predictedTape - boundaryCm)),
        adjacentGapCm: round(adjacentGapCm),
        rangesOverlap: direction === 'larger'
          ? referenceRange.max > neighbourRange.min
          : neighbourRange.max > referenceRange.min,
      });
    }
  }
  return candidates.sort((a, b) => a.boundaryDistanceCm - b.boundaryDistanceCm
    || a.measurement.localeCompare(b.measurement)
    || a.neighbourIndex - b.neighbourIndex);
}

function nearestBoundary(input) {
  return boundaryCandidates(input)[0] ?? null;
}

function gapErrorRatio(adjacentGapCm, absoluteErrorCm) {
  if (!finite(adjacentGapCm) || adjacentGapCm < 0 || !finite(absoluteErrorCm) || absoluteErrorCm < 0) return null;
  if (absoluteErrorCm === 0) return { value: null, display: '∞', infinite: true };
  const value = adjacentGapCm / absoluteErrorCm;
  return { value: round(value), display: round(value, 2).toFixed(2), infinite: false };
}

function confidenceFor({ boundaryDistanceCm, sigmaCm, qualityWarning = false, model }) {
  if (model === 'v8') return { label: CONFIDENCE.na, ratio: null, reason: 'V8 has no per-person uncertainty output.' };
  if (qualityWarning) return { label: CONFIDENCE.low, ratio: null, reason: 'A data-quality warning forces Low confidence.' };
  if (!finite(boundaryDistanceCm) || boundaryDistanceCm < 0 || !positive(sigmaCm)) {
    return { label: CONFIDENCE.low, ratio: null, reason: 'Boundary distance or Aiad sigma is unavailable.' };
  }
  const ratio = boundaryDistanceCm / sigmaCm;
  if (ratio >= 2) return { label: CONFIDENCE.high, ratio: round(ratio), reason: 'Boundary distance ÷ Aiad sigma is at least 2.' };
  if (ratio >= 1) return { label: CONFIDENCE.medium, ratio: round(ratio), reason: 'Boundary distance ÷ Aiad sigma is between 1 and 2.' };
  return { label: CONFIDENCE.low, ratio: round(ratio), reason: 'Boundary distance ÷ Aiad sigma is below 1.' };
}

function quantile(values, q) {
  const clean = values.filter(finite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const position = (clean.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, clean.length - 1);
  return clean[lower] + (clean[upper] - clean[lower]) * (position - lower);
}

function pct(numerator, denominator) {
  return denominator ? round((100 * numerator) / denominator, 2) : null;
}

function measurementStats(predictionRows, actualRows, measurement) {
  const errors = [];
  for (const [scanId, actual] of actualRows.entries()) {
    const predicted = predictionRows.get(scanId)?.[measurement];
    const truth = actual?.[measurement];
    if (finite(predicted) && positive(truth)) errors.push(Math.abs(predicted - truth));
  }
  if (!errors.length) {
    return { status: 'N/A', count: 0, maeCm: null, medianAbsoluteErrorCm: null, p90AbsoluteErrorCm: null,
      within1_27CmPct: null, within2_54CmPct: null, within4CmPct: null, worstAbsoluteErrorCm: null };
  }
  return {
    status: 'available',
    count: errors.length,
    maeCm: round(errors.reduce((sum, value) => sum + value, 0) / errors.length),
    medianAbsoluteErrorCm: round(quantile(errors, 0.5)),
    p90AbsoluteErrorCm: round(quantile(errors, 0.9)),
    within1_27CmPct: pct(errors.filter(value => value <= 1.27).length, errors.length),
    within2_54CmPct: pct(errors.filter(value => value <= 2.54).length, errors.length),
    within4CmPct: pct(errors.filter(value => value <= 4).length, errors.length),
    worstAbsoluteErrorCm: round(Math.max(...errors)),
  };
}

function bucketize(values, definitions) {
  const clean = values.filter(finite);
  return definitions.map(definition => {
    const count = clean.filter(definition.test).length;
    return { id: definition.id, label: definition.label, count, pct: pct(count, clean.length) };
  });
}

function summaryForModel(decisions, predictionRows, actualRows, model, expectedDecisions = 100) {
  if (!Number.isInteger(expectedDecisions) || expectedDecisions < 0 || !Array.isArray(decisions) || decisions.length !== expectedDecisions) {
    throw new Error(`${model} must contain exactly ${expectedDecisions} commercial decisions.`);
  }
  const count = result => decisions.filter(row => row.result === result).length;
  const exact = count(RESULT.exact);
  const adjacent = count(RESULT.adjacent);
  const severe = count(RESULT.severe);
  const noRecommendation = count(RESULT.unavailable);
  const withinOne = exact + adjacent;
  const categoryMix = Object.entries(decisions.reduce((acc, row) => {
    acc[row.product.category] = (acc[row.product.category] || 0) + 1;
    return acc;
  }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryCount]) => ({ category, count: categoryCount, pct: pct(categoryCount, decisions.length) }));
  const confidenceRows = label => decisions.filter(row => row.confidence.label === label);
  const confidenceSummary = label => {
    const rows = confidenceRows(label);
    return { count: rows.length, coveragePct: pct(rows.length, decisions.length), exactPct: pct(rows.filter(row => row.result === RESULT.exact).length, rows.length),
      withinOneSizePct: pct(rows.filter(row => [RESULT.exact, RESULT.adjacent].includes(row.result)).length, rows.length),
      severeCount: rows.filter(row => [RESULT.severe, RESULT.unavailable].includes(row.result)).length };
  };
  const gapValues = decisions.map(row => row.adjacentGap?.cm).filter(finite);
  const boundaryValues = decisions.map(row => row.nearestBoundary?.distanceCm).filter(finite);
  const stats = Object.fromEntries(MEASURES.map(measurement => [measurement, measurementStats(predictionRows, actualRows, measurement)]));
  return {
    model,
    denominator: decisions.length,
    outcomes: {
      exact: { count: exact, pct: pct(exact, decisions.length) },
      adjacent: { count: adjacent, pct: pct(adjacent, decisions.length) },
      withinOneSize: { count: withinOne, pct: pct(withinOne, decisions.length) },
      severe: { count: severe, pct: pct(severe, decisions.length) },
      noRecommendation: { count: noRecommendation, pct: pct(noRecommendation, decisions.length) },
    },
    categoryMix,
    confidence: model === 'aiad' ? {
      high: confidenceSummary(CONFIDENCE.high),
      medium: confidenceSummary(CONFIDENCE.medium),
      low: confidenceSummary(CONFIDENCE.low),
      seriousMissesCaughtByLowConfidence: decisions.filter(row => row.confidence.label === CONFIDENCE.low && [RESULT.severe, RESULT.unavailable].includes(row.result)).length,
    } : { status: 'N/A', reason: 'V8 has no per-person uncertainty output.' },
    gapBuckets: bucketize(gapValues, [
      { id: 'le-2', label: '≤2 cm', test: value => value <= 2 },
      { id: 'gt-2-le-4', label: '>2–4 cm', test: value => value > 2 && value <= 4 },
      { id: 'gt-4-le-6', label: '>4–6 cm', test: value => value > 4 && value <= 6 },
      { id: 'gt-6', label: '>6 cm', test: value => value > 6 },
    ]),
    boundaryBuckets: bucketize(boundaryValues, [
      { id: 'le-1', label: '≤1 cm', test: value => value <= 1 },
      { id: 'gt-1-le-2', label: '>1–2 cm', test: value => value > 1 && value <= 2 },
      { id: 'gt-2-le-3', label: '>2–3 cm', test: value => value > 2 && value <= 3 },
      { id: 'gt-3-le-4', label: '>3–4 cm', test: value => value > 3 && value <= 4 },
      { id: 'gt-4', label: '>4 cm', test: value => value > 4 },
    ]),
    measurementStats: stats,
    chartSpacing: { waist: 'reported per decision', hips: 'reported per decision', chest: 'N/A', thigh: 'N/A' },
  };
}

function csvCell(value) {
  const raw = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const protectedValue = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

module.exports = {
  RESULT,
  CONFIDENCE,
  MEASURES,
  finite,
  positive,
  round,
  stableStringify,
  sha256,
  bmiFor,
  bmiBand,
  toCm,
  normalizeRangeToCm,
  classifyResult,
  boundaryCandidates,
  nearestBoundary,
  gapErrorRatio,
  confidenceFor,
  quantile,
  pct,
  measurementStats,
  bucketize,
  summaryForModel,
  csvCell,
};
