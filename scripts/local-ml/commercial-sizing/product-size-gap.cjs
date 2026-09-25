'use strict';

function productSizeGap(chart, measurement) {
  const gaps = [];
  for (let i = 1; i < chart.orderedSizes.length; i++) {
    const first = chart.valuesBySizeCm[chart.orderedSizes[i - 1]]?.[measurement]?.center;
    const second = chart.valuesBySizeCm[chart.orderedSizes[i]]?.[measurement]?.center;
    if (Number.isFinite(first) && Number.isFinite(second)) gaps.push(Math.abs(second - first));
  }
  return {
    meanCm: gaps.length ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : null,
    adjacentPairs: gaps.length,
  };
}

module.exports = { productSizeGap };
