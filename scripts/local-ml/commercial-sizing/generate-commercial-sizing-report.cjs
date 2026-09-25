#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const {
  RESULT,
  finite,
  positive,
  round,
  stableStringify,
  sha256,
  bmiFor,
  bmiBand,
  normalizeRangeToCm,
  classifyResult,
  nearestBoundary,
  gapErrorRatio,
  confidenceFor,
  summaryForModel,
  csvCell,
} = require('./commercial-sizing-core.cjs');
const { createV8CpuRunner } = require('./v8-cpu-inference.cjs');

const FRONTEND_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = process.env.WEAR_SIZE_IMPACT_BACKEND_ROOT || path.resolve(FRONTEND_ROOT, '../primeStyleAI-backend');
const backendRequire = createRequire(path.join(BACKEND_ROOT, 'package.json'));
const { MongoClient } = backendRequire('mongodb');
const dotenv = backendRequire('dotenv');
const benchmark = backendRequire('./scripts/benchmarks/aiad-catalog-size-impact-lib.cjs');
const catalog = backendRequire('./scripts/benchmarks/model-product-size-catalog-lib.cjs');

const THREAD_OUTPUT_ROOT = path.join(FRONTEND_ROOT, 'outputs', '01a0214b-1af5-77c1-be2a-778f8c182d28');
const AIAD_REPORT_PATH = process.env.WEAR_AIAD_BENCHMARK_PATH
  || '/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/aiad-size-impact-20260831/inputs/shane-confidence-adapter-benchmark-448-20260901.json';
const COHORT_ROOT = process.env.WEAR_AIAD_COHORT_ROOT
  || '/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/aiad-size-impact-20260831/cohort';
const COHORT_INDEX_PATH = path.join(COHORT_ROOT, '.local-ml', 'wear-sdk-heldout', 'index.json');
const V8_MODEL_ROOT = process.env.WEAR_V8_MODEL_DIR
  || '/Volumes/PrimeStorage/PrimeStyleAI-model-artifacts/legacy/wear3d-waist-hips-v8-fresh-mask-h100';
const TEMPLATE_PATH = '/Users/arashsn/Desktop/PrimeStyleAI_100_Product_Sizing_Validation_Template.xlsx';
const SEED = 'waist-hip-commercial-100-20260901-v1';
const DATABASE = 'primestyleai_test_lab';
const SCOPE = { userId: 'myaifitting-ai-stylist-test' };
const COUNTRY = 'US';
const CANDIDATES_PER_GROUP = 600;
const REQUIRED_GROUPS = ['female-pants', 'female-shorts', 'female-skirts', 'male-pants', 'male-shorts'];
const BMI_BANDS = ['underweight', 'normal', 'overweight', 'obesity-i', 'obesity-ii-plus'];
const PER_PERSON_QUOTAS = {
  female: { 'female-pants': 4, 'female-shorts': 3, 'female-skirts': 3 },
  male: { 'male-pants': 6, 'male-shorts': 4 },
};
const EXPECTED_CATEGORY_QUOTAS = {
  'female-pants': 20,
  'female-shorts': 15,
  'female-skirts': 15,
  'male-pants': 30,
  'male-shorts': 20,
};
const CATEGORY_LABELS = {
  'female-pants': "Women’s pants",
  'female-shorts': "Women’s shorts",
  'female-skirts': "Women’s skirts",
  'male-pants': "Men’s pants",
  'male-shorts': "Men’s shorts",
};
const METADATA_FIELDS = ['styleRagId', 'source', 'sourceProductId', 'title', 'gender', 'slot', 'garmentType', 'category', 'parentCategory', 'subcategory', 'productType', 'tags', 'styleTags'];
const PRODUCT_FIELDS = [
  'userId', 'source', 'sourceProductId', 'styleRagId', 'title', 'brand', 'merchantName', 'gender', 'slot',
  'garmentType', 'category', 'parentCategory', 'subcategory', 'productType', 'tags', 'styleTags', 'occasionTags',
  'coverageTags', 'setComponents', 'description', 'color', 'material', 'fitTags', 'price', 'currency', 'imageUrl',
  'imageUrls', 'enrichedImageUrl', 'sizeGuide', 'sizeGuideStatus', 'sizeGuideQa', 'availableSizes', 'sizes',
  'availability', 'inventoryQuantity', 'hiddenFromCatalog', 'aiStylistRagReady', 'qualityStatus', 'enrichmentConfidence',
  'eligibilityKeys', 'sourceFreshness', 'updatedAt', 'variants.id', 'variants.name', 'variants.color', 'variants.available',
  'variants.sizes.name', 'variants.sizes.sourceVariantId', 'variants.sizes.availability', 'variants.sizes.inventory', 'variants.sizes.price',
  'raw.supplierProvider', 'raw.supplierLifecycleState', 'raw.purchaseDisabled', 'raw.aiStylistCompleteFormalSet', 'raw.sizeChartEvidence.snippets',
];

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function jsonCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function projection(fields) {
  return Object.fromEntries(fields.map(field => [field, 1]));
}

function writeNew(file, value) {
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}

function outputDirectoryFromArgs() {
  const index = process.argv.indexOf('--output');
  if (index >= 0 && process.argv[index + 1]) return path.resolve(process.argv[index + 1]);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return path.join(THREAD_OUTPUT_ROOT, `commercial-validation-build-${stamp}`);
}

function validateInputFiles() {
  for (const file of [AIAD_REPORT_PATH, COHORT_INDEX_PATH, path.join(V8_MODEL_ROOT, 'model.onnx'), path.join(V8_MODEL_ROOT, 'runtime.json'), TEMPLATE_PATH]) {
    if (!fs.existsSync(file)) throw new Error(`Required frozen input is unavailable: ${file}`);
  }
}

function sourceHashesUnchanged(policy) {
  for (const [file, hash] of Object.entries(policy.hashes)) {
    const current = sha256File(path.join(BACKEND_ROOT, file));
    if (current !== hash) throw new Error(`Sizing policy changed while the report was running: ${file}`);
  }
}

function serializableQuery(query) {
  return JSON.parse(JSON.stringify(query, (_key, value) => value instanceof RegExp
    ? { $regex: value.source, $options: value.flags }
    : value));
}

async function loadProductPools(policy, mongoUri) {
  const client = new MongoClient(mongoUri, {
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 120_000,
  });
  try {
    await client.connect();
    const collection = client.db(DATABASE).collection('style_rag_products');
    const query = benchmark.hostValue({ $and: [
      policy.catalog.displayReadyCatalogQuery(SCOPE),
      { eligibilityKeys: policy.eligibility.catalogCountryEligibilityKey(COUNTRY) },
      { gender: { $in: ['female', 'male'] }, slot: 'bottom' },
    ] });
    const metadata = await collection.find(query, {
      projection: { _id: 0, ...projection(METADATA_FIELDS) },
      maxTimeMS: 60_000,
      batchSize: 1000,
    }).limit(50_001).toArray();
    if (metadata.length > 50_000) throw new Error('Catalog qualification safety bound exceeded.');
    const groups = catalog.GROUPS.filter(group => REQUIRED_GROUPS.includes(group.id));
    const ordered = Object.fromEntries(groups.map(group => [
      group.id,
      catalog.orderedCandidates(metadata, group, SEED).slice(0, CANDIDATES_PER_GROUP),
    ]));
    const candidateIds = [...new Set(Object.values(ordered).flat().map(product => product.styleRagId))];
    const products = await collection.find({ $and: [query, { styleRagId: { $in: candidateIds } }] }, {
      projection: { _id: 0, ...projection(PRODUCT_FIELDS) },
      maxTimeMS: 120_000,
      batchSize: 250,
    }).toArray();
    const byId = new Map(products.map(product => [product.styleRagId, jsonCopy(product)]));
    const pools = new Map();
    const audit = [];
    for (const group of groups) {
      const candidates = ordered[group.id].map(row => byId.get(row.styleRagId)).filter(Boolean);
      const staticEligible = [];
      const exclusions = {};
      for (const product of candidates) {
        const inspection = benchmark.inspectProduct(product, policy);
        const chartWarnings = benchmark.chartValueWarnings(product, policy);
        const issues = [
          ...inspection.issues,
          ...chartWarnings.map(() => 'SUSPICIOUS_CHART_VALUE'),
          ...(inspection.tapeFields.length && inspection.tapeFields.every(field => ['waist', 'hips'].includes(field)) ? [] : ['NOT_WAIST_HIP_ONLY']),
          ...(inspection.orderedLabels.length >= 2 && inspection.stockSizes.length >= 2 ? [] : ['FEWER_THAN_TWO_ORDERED_PURCHASABLE_SIZES']),
        ];
        let chart = null;
        if (!issues.length) {
          try { chart = chartSnapshot(product, inspection, policy); }
          catch { issues.push('NORMALIZED_CHART_HAS_FEWER_THAN_TWO_ORDERED_SIZES'); }
        }
        if (issues.length) {
          for (const issue of new Set(issues)) exclusions[issue] = (exclusions[issue] || 0) + 1;
          continue;
        }
        staticEligible.push({ product, inspection, chart });
      }
      pools.set(group.id, staticEligible);
      audit.push({ groupId: group.id, population: ordered[group.id].length, staticEligible: staticEligible.length, exclusions });
    }
    return {
      pools,
      audit,
      catalogPopulation: metadata.length,
      candidateProductCount: products.length,
      candidatePoolSha256: sha256(stableStringify(Object.fromEntries([...pools].map(([groupId, rows]) => [groupId, rows.map(row => row.product)])))),
      query: serializableQuery(query),
    };
  } finally {
    await client.close();
  }
}

function chartSnapshot(product, inspection, policy) {
  const projected = policy.recommendation.projectProductSizeGuide(product.sizeGuide, 'cm');
  const tables = projected.sections && Object.keys(projected.sections).length > 1
    ? Object.entries(projected.sections)
    : [['main', projected]];
  const chartBySizeCm = {};
  const sourceRows = [];
  const unitForColumn = header => {
    if (/(?:\bcm\b|_cm|centimet)/i.test(header)) return 'cm';
    if (/(?:\bin\b|_in|inch)/i.test(header)) return 'in';
    if (['cm', 'in'].includes(projected.unit)) return projected.unit;
    if (['cm', 'in'].includes(product.sizeGuide.unit)) return product.sizeGuide.unit;
    throw new Error(`Qualified chart has no resolvable unit: ${product.styleRagId}`);
  };
  for (const [sectionName, table] of tables) {
    const sizeColumn = policy.deterministic.findSizeColIndex(table.headers);
    const fieldMap = policy.deterministic.buildHeaderFieldMap(table.headers);
    for (const row of table.rows) {
      const sourceLabel = String(row[sizeColumn] || '').trim();
      const stockedLabel = policy.recommendation.purchasableSize(sourceLabel, inspection.stockSizes);
      if (!stockedLabel) continue;
      const values = {};
      for (const [column, field] of Object.entries(fieldMap)) {
        const tape = benchmark.FIELD_TO_TAPE[field];
        if (!['waist', 'hips'].includes(tape)) continue;
        const parsed = policy.deterministic.parseRange(String(row[column] || ''));
        if (!parsed || !positive(parsed.min) || !positive(parsed.max)) continue;
        values[tape] = normalizeRangeToCm(parsed, unitForColumn(String(table.headers[column] || '')));
      }
      if (!Object.keys(values).length) continue;
      chartBySizeCm[stockedLabel] = { ...(chartBySizeCm[stockedLabel] || {}), ...values };
      sourceRows.push({ section: sectionName, sourceLabel, stockedLabel, values });
    }
  }
  const orderedSizes = inspection.orderedLabels.map(label => policy.recommendation.purchasableSize(label, inspection.stockSizes))
    .filter(Boolean).filter((label, index, all) => all.indexOf(label) === index && chartBySizeCm[label]);
  if (orderedSizes.length < 2) throw new Error(`Qualified product lost its ordered chart: ${product.styleRagId}`);
  return {
    sourceUnit: product.sizeGuide.unit || 'unknown',
    normalizedUnit: 'cm',
    basis: inspection.basis,
    sourceTitle: product.sizeGuide.title || null,
    chartSha256: inspection.chartSha256,
    relevantMeasurements: [...new Set(Object.values(chartBySizeCm).flatMap(values => Object.keys(values)))].sort(),
    orderedSizes,
    valuesBySizeCm: chartBySizeCm,
    sourceRows,
  };
}

function stretchEvidence(product) {
  const candidates = [
    product.material,
    ...(product.fitTags || []),
    ...(product.tags || []),
    product.description,
  ].filter(Boolean).map(String);
  const evidence = candidates.filter(value => /stretch|elastic|spandex|elastane|lycra/i.test(value));
  return [...new Set(evidence)].slice(0, 5);
}

function indexForSize(label, orderedSizes, policy) {
  if (!label) return -1;
  return orderedSizes.findIndex(size => policy.recommendation.purchasableSize(label, [size]));
}

async function referenceReadyRows(person, rows, groupId, policy) {
  const products = rows.filter(row => row.inspection.tapeFields.every(field => positive(person.actuals[field]))).map(row => row.product);
  const recommendations = await policy.recommend(
    products,
    benchmark.profileFor({ heightCm: person.heightCm, actuals: person.actuals }, 'actuals'),
    person.gender,
    SCOPE,
  );
  const recommendationById = new Map(recommendations.map(row => [row.styleRagId, row]));
  return rows.flatMap(row => {
    if (!products.some(product => product.styleRagId === row.product.styleRagId)) return [];
    const decision = benchmark.validDecision(recommendationById.get(row.product.styleRagId), row.inspection, policy);
    if (!decision.ready) return [];
    const chart = row.chart;
    const referenceSizeIndex = indexForSize(decision.label, chart.orderedSizes, policy);
    return referenceSizeIndex < 0 ? [] : [{ ...row, groupId, decision, chart, referenceSizeIndex }];
  });
}

async function selectPeopleAndAssignments({ report, cohortIndex, pools, policy }) {
  const cohortByScanId = new Map(cohortIndex.people.map(person => [person.scanId, person]));
  const selectedPeople = [];
  const readyByPerson = new Map();
  for (const gender of ['female', 'male']) {
    for (const band of BMI_BANDS) {
      const candidates = report.rows.filter(row => row.ok && row.gender === gender
        && bmiBand(bmiFor(row.heightCm, row.weightKg)) === band
        && cohortByScanId.has(row.scanId)
        && positive(row.actuals?.waist) && positive(row.actuals?.hips))
        .map(row => ({
          scanId: row.scanId,
          subjectId: row.subjectId,
          gender: row.gender,
          heightCm: row.heightCm,
          weightKg: row.weightKg,
          bmi: bmiFor(row.heightCm, row.weightKg),
          bmiBand: band,
          actuals: { waist: row.actuals.waist, hips: row.actuals.hips, chest: row.actuals.chest ?? null, thigh: row.actuals.thigh ?? null },
          imagePath: cohortByScanId.get(row.scanId).imagePath,
          selectionHash: sha256(`${SEED}:person:${gender}:${band}:${row.scanId}`),
        })).sort((a, b) => a.selectionHash.localeCompare(b.selectionHash) || a.scanId.localeCompare(b.scanId));
      let chosen = null;
      for (const candidate of candidates) {
        const ready = {};
        let qualifies = true;
        for (const [groupId, requested] of Object.entries(PER_PERSON_QUOTAS[gender])) {
          ready[groupId] = await referenceReadyRows(candidate, pools.get(groupId), groupId, policy);
          if (ready[groupId].length < requested) qualifies = false;
        }
        if (qualifies) {
          chosen = candidate;
          readyByPerson.set(candidate.scanId, ready);
          break;
        }
      }
      if (!chosen) throw new Error(`No ${gender} ${band} participant has ten stocked real-tape references in the deterministic product pool.`);
      selectedPeople.push(chosen);
    }
  }
  const assignments = [];
  const usedProducts = new Set();
  let decisionNumber = 1;
  for (const person of selectedPeople) {
    for (const [groupId, requested] of Object.entries(PER_PERSON_QUOTAS[person.gender])) {
      const candidates = readyByPerson.get(person.scanId)[groupId].map(row => ({
        ...row,
        assignmentHash: sha256(`${SEED}:product:${person.scanId}:${groupId}:${row.product.styleRagId}`),
      })).sort((a, b) => a.assignmentHash.localeCompare(b.assignmentHash) || a.product.styleRagId.localeCompare(b.product.styleRagId));
      const chosen = [];
      for (const candidate of candidates) {
        if (usedProducts.has(candidate.product.styleRagId)) continue;
        chosen.push(candidate);
        usedProducts.add(candidate.product.styleRagId);
        if (chosen.length === requested) break;
      }
      if (chosen.length !== requested) throw new Error(`Could not assign ${requested} unique ${groupId} products to ${person.scanId}.`);
      for (const row of chosen) {
        assignments.push({
          decisionId: `D${String(decisionNumber++).padStart(3, '0')}`,
          personScanId: person.scanId,
          groupId,
          category: CATEGORY_LABELS[groupId],
          product: row.product,
          inspection: row.inspection,
          chart: row.chart,
          referenceSize: row.decision.label,
          referenceSizeIndex: row.referenceSizeIndex,
          assignmentHash: row.assignmentHash,
        });
      }
    }
  }
  return { selectedPeople, assignments };
}

function manifestProduct(assignment) {
  return {
    decisionId: assignment.decisionId,
    personScanId: assignment.personScanId,
    groupId: assignment.groupId,
    category: assignment.category,
    product: jsonCopy(assignment.product),
    qualification: {
      issues: assignment.inspection.issues,
      chartWarnings: [],
      tapeFields: assignment.inspection.tapeFields,
      orderedLabels: assignment.inspection.orderedLabels,
      stockedSizes: assignment.inspection.stockSizes,
      basis: assignment.inspection.basis,
    },
    chart: assignment.chart,
    realTapeReferenceSize: assignment.referenceSize,
    realTapeReferenceSizeIndex: assignment.referenceSizeIndex,
    assignmentHash: assignment.assignmentHash,
  };
}

function validateManifestSelection(selection) {
  const people = selection.people;
  const assignments = selection.assignments;
  if (people.length !== 10 || people.filter(person => person.gender === 'female').length !== 5 || people.filter(person => person.gender === 'male').length !== 5) {
    throw new Error('Manifest must contain exactly five women and five men.');
  }
  for (const gender of ['female', 'male']) for (const band of BMI_BANDS) {
    if (people.filter(person => person.gender === gender && person.bmiBand === band).length !== 1) throw new Error(`Manifest BMI quota failed: ${gender}/${band}.`);
  }
  if (assignments.length !== 100 || new Set(assignments.map(row => row.product.styleRagId)).size !== 100) throw new Error('Manifest must contain 100 unique products.');
  for (const person of people) if (assignments.filter(row => row.personScanId === person.scanId).length !== 10) throw new Error(`${person.scanId} must have ten products.`);
  for (const [groupId, expected] of Object.entries(EXPECTED_CATEGORY_QUOTAS)) {
    if (assignments.filter(row => row.groupId === groupId).length !== expected) throw new Error(`Category quota failed: ${groupId}.`);
  }
  if (assignments.some(row => !row.realTapeReferenceSize || row.qualification.tapeFields.some(field => !['waist', 'hips'].includes(field)))) {
    throw new Error('Every frozen product must have a stocked waist/hip real-tape reference.');
  }
}

async function predictedDecisionsForPerson(person, assignments, predictions, policy) {
  const products = assignments.map(row => row.product);
  const recommendations = await policy.recommend(
    products,
    benchmark.profileFor({ heightCm: person.heightCm, predicted: predictions }, 'predicted'),
    person.gender,
    SCOPE,
  );
  return new Map(recommendations.map(row => [row.styleRagId, row]));
}

function decisionRow({ model, person, assignment, predictions, sigma, recommendation, policy }) {
  const prediction = benchmark.validDecision(recommendation, assignment.inspection, policy);
  const predictionIndex = prediction.ready ? indexForSize(prediction.label, assignment.chart.orderedSizes, policy) : -1;
  const classified = classifyResult(assignment.referenceSizeIndex, predictionIndex, prediction.ready && predictionIndex >= 0);
  const errors = Object.fromEntries(['waist', 'hips', 'chest', 'thigh'].map(measurement => [
    measurement,
    finite(predictions?.[measurement]) && positive(person.actuals?.[measurement]) ? round(predictions[measurement] - person.actuals[measurement]) : null,
  ]));
  const boundary = nearestBoundary({
    orderedSizes: assignment.chart.orderedSizes,
    referenceIndex: assignment.referenceSizeIndex,
    chartBySizeCm: assignment.chart.valuesBySizeCm,
    predicted: predictions,
  });
  const flags = [];
  if (!boundary) flags.push('NO_ADJACENT_WAIST_HIP_BOUNDARY');
  if (assignment.chart.basis === 'unconfirmed') flags.push('UNCONFIRMED_CHART_BASIS');
  if (prediction.ready && predictionIndex < 0) flags.push('PREDICTED_SIZE_NOT_IN_ORDERED_STOCK');
  const relevantSigma = boundary ? sigma?.[boundary.measurement] : null;
  const confidence = confidenceFor({
    model,
    boundaryDistanceCm: boundary?.boundaryDistanceCm ?? null,
    sigmaCm: relevantSigma,
    qualityWarning: flags.length > 0,
  });
  const ratio = boundary ? gapErrorRatio(boundary.adjacentGapCm, Math.abs(errors[boundary.measurement] ?? NaN)) : null;
  const product = assignment.product;
  const supplier = product.raw?.supplierProvider || product.merchantName || product.brand || null;
  const predictedSize = prediction.ready && predictionIndex >= 0 ? prediction.label : null;
  return {
    schema: 'CommercialSizingDecisionV1',
    decisionId: assignment.decisionId,
    model,
    manifestPersonProductKey: `${person.scanId}:${product.styleRagId}`,
    person: {
      scanId: person.scanId,
      subjectId: person.subjectId,
      gender: person.gender,
      heightCm: person.heightCm,
      weightKg: person.weightKg,
      bmi: round(person.bmi, 2),
      bmiBand: person.bmiBand,
    },
    product: {
      id: product.styleRagId,
      sourceProductId: product.sourceProductId || null,
      title: product.title,
      category: assignment.category,
      groupId: assignment.groupId,
      supplier,
      brand: product.brand || null,
      imageUrl: product.imageUrl || null,
      rawMaterial: product.material || null,
      stretchEvidence: stretchEvidence(product),
    },
    purchasableSizes: assignment.chart.orderedSizes,
    chart: assignment.chart,
    actualTapeCm: person.actuals,
    predictedTapeCm: {
      waist: finite(predictions?.waist) ? round(predictions.waist) : null,
      hips: finite(predictions?.hips) ? round(predictions.hips) : null,
      chest: finite(predictions?.chest) ? round(predictions.chest) : null,
      thigh: finite(predictions?.thigh) ? round(predictions.thigh) : null,
    },
    signedErrorCm: errors,
    sigmaCm: model === 'aiad' ? {
      waist: finite(sigma?.waist) ? round(sigma.waist) : null,
      hips: finite(sigma?.hips) ? round(sigma.hips) : null,
      chest: finite(sigma?.chest) ? round(sigma.chest) : null,
      thigh: finite(sigma?.thigh) ? round(sigma.thigh) : null,
    } : null,
    referenceSize: assignment.referenceSize,
    predictedSize,
    referenceSizeIndex: assignment.referenceSizeIndex,
    predictedSizeIndex: predictionIndex >= 0 ? predictionIndex : null,
    chartSteps: classified.chartSteps,
    result: classified.result,
    adjacentGap: boundary ? { cm: boundary.adjacentGapCm, measurement: boundary.measurement, neighbourSize: boundary.neighbourSize, direction: boundary.direction } : null,
    nearestBoundary: boundary ? {
      distanceCm: boundary.boundaryDistanceCm,
      boundaryCm: boundary.boundaryCm,
      measurement: boundary.measurement,
      neighbourSize: boundary.neighbourSize,
      direction: boundary.direction,
      predictedTapeCm: boundary.predictedTapeCm,
      rangesOverlap: boundary.rangesOverlap,
    } : null,
    confidence: { ...confidence, sigmaCm: finite(relevantSigma) ? round(relevantSigma) : null },
    gapErrorRatio: ratio,
    apple: { status: 'OFF / not run', version: null, changedModelTape: false },
    dataQualityFlag: flags.length ? flags : ['None'],
    keepExchange: { outcome: 'Unknown', keepRateContribution: null },
    notes: [
      'Reference size is the current sizing policy’s stocked result from recorded WEAR tape; it is not observed garment fit.',
      assignment.chart.basis === 'garment-described-in-source'
        ? 'Supplier chart is described as garment/product measurements.'
        : 'Supplier chart measurement basis is not certified as a body-size chart.',
      model === 'v8' ? 'New CPU inference on the same ten clean WEAR renders; no old V8 448 result was reused.' : 'Aiad prediction and sigma came from the frozen 448-person report.',
    ],
  };
}

async function scoreModel({ model, people, assignments, predictionsByScanId, sigmaByScanId, policy }) {
  const decisions = [];
  for (const person of people) {
    const personAssignments = assignments.filter(row => row.personScanId === person.scanId);
    const predictions = predictionsByScanId.get(person.scanId);
    if (!predictions) throw new Error(`${model} is missing predictions for ${person.scanId}.`);
    const recommendations = await predictedDecisionsForPerson(person, personAssignments, predictions, policy);
    for (const assignment of personAssignments) {
      decisions.push(decisionRow({
        model,
        person,
        assignment,
        predictions,
        sigma: sigmaByScanId?.get(person.scanId) || null,
        recommendation: recommendations.get(assignment.product.styleRagId),
        policy,
      }));
    }
  }
  return decisions.sort((a, b) => a.decisionId.localeCompare(b.decisionId));
}

function decisionsCsv(decisions) {
  const columns = [
    ['decision_id', row => row.decisionId], ['model', row => row.model], ['person_scan_id', row => row.person.scanId],
    ['subject_id', row => row.person.subjectId], ['gender', row => row.person.gender], ['bmi', row => row.person.bmi], ['bmi_band', row => row.person.bmiBand],
    ['product_id', row => row.product.id], ['source_product_id', row => row.product.sourceProductId], ['product_title', row => row.product.title],
    ['category', row => row.product.category], ['supplier', row => row.product.supplier], ['brand', row => row.product.brand],
    ['purchasable_sizes', row => row.purchasableSizes], ['chart_basis', row => row.chart.basis], ['chart_values_cm', row => row.chart.valuesBySizeCm],
    ['raw_material', row => row.product.rawMaterial], ['stretch_evidence', row => row.product.stretchEvidence],
    ['true_waist_cm', row => row.actualTapeCm.waist], ['predicted_waist_cm', row => row.predictedTapeCm.waist], ['waist_signed_error_cm', row => row.signedErrorCm.waist], ['waist_sigma_cm', row => row.sigmaCm?.waist],
    ['true_hips_cm', row => row.actualTapeCm.hips], ['predicted_hips_cm', row => row.predictedTapeCm.hips], ['hips_signed_error_cm', row => row.signedErrorCm.hips], ['hips_sigma_cm', row => row.sigmaCm?.hips],
    ['true_chest_cm', row => row.actualTapeCm.chest], ['predicted_chest_cm', row => row.predictedTapeCm.chest], ['chest_signed_error_cm', row => row.signedErrorCm.chest], ['chest_sigma_cm', row => row.sigmaCm?.chest],
    ['true_thigh_cm', row => row.actualTapeCm.thigh], ['predicted_thigh_cm', row => row.predictedTapeCm.thigh], ['thigh_signed_error_cm', row => row.signedErrorCm.thigh], ['thigh_sigma_cm', row => row.sigmaCm?.thigh],
    ['reference_size', row => row.referenceSize], ['predicted_size', row => row.predictedSize], ['reference_size_index', row => row.referenceSizeIndex], ['predicted_size_index', row => row.predictedSizeIndex],
    ['result', row => row.result], ['chart_steps', row => row.chartSteps], ['adjacent_gap_cm', row => row.adjacentGap?.cm], ['gap_measurement', row => row.adjacentGap?.measurement],
    ['nearest_boundary_distance_cm', row => row.nearestBoundary?.distanceCm], ['nearest_boundary_cm', row => row.nearestBoundary?.boundaryCm], ['boundary_measurement', row => row.nearestBoundary?.measurement],
    ['boundary_neighbour_size', row => row.nearestBoundary?.neighbourSize], ['boundary_direction', row => row.nearestBoundary?.direction], ['confidence', row => row.confidence.label],
    ['confidence_ratio', row => row.confidence.ratio], ['gap_error_ratio', row => row.gapErrorRatio?.display], ['apple_status', row => row.apple.status], ['apple_version', row => row.apple.version],
    ['data_quality_flag', row => row.dataQualityFlag], ['keep_exchange', row => row.keepExchange.outcome], ['notes', row => row.notes],
  ];
  return `${columns.map(([header]) => csvCell(header)).join(',')}\n${decisions.map(row => columns.map(([, read]) => csvCell(read(row))).join(',')).join('\n')}\n`;
}

function validateCompletedReport(report) {
  const { people, assignments } = report.manifest;
  validateManifestSelection({ people, assignments });
  for (const model of ['aiad', 'v8']) {
    const rows = report.decisions[model];
    if (rows.length !== 100 || new Set(rows.map(row => row.decisionId)).size !== 100) throw new Error(`${model} report must reconcile to 100 unique decisions.`);
    if (report.summaries[model].denominator !== 100) throw new Error(`${model} headline denominator is not 100.`);
    for (const row of rows) {
      const frozen = assignments.find(item => item.decisionId === row.decisionId);
      if (!frozen || frozen.personScanId !== row.person.scanId || frozen.product.styleRagId !== row.product.id || frozen.realTapeReferenceSize !== row.referenceSize) {
        throw new Error(`${model} changed the frozen person, product or reference size for ${row.decisionId}.`);
      }
    }
  }
  const aiadKeys = report.decisions.aiad.map(row => row.manifestPersonProductKey).join('|');
  const v8Keys = report.decisions.v8.map(row => row.manifestPersonProductKey).join('|');
  if (aiadKeys !== v8Keys) throw new Error('Aiad and V8 did not use the identical frozen manifest.');
}

async function main() {
  validateInputFiles();
  const outputDirectory = outputDirectoryFromArgs();
  if (!outputDirectory.startsWith(`${THREAD_OUTPUT_ROOT}${path.sep}`)) throw new Error(`Build output must stay under ${THREAD_OUTPUT_ROOT}.`);
  fs.mkdirSync(THREAD_OUTPUT_ROOT, { recursive: true, mode: 0o700 });
  fs.mkdirSync(outputDirectory, { mode: 0o700 });
  const env = dotenv.parse(fs.readFileSync(path.join(BACKEND_ROOT, '.env')));
  const mongoUri = env.MONGO_URI || env.MONGODB_URI;
  if (!mongoUri) throw new Error('Read-only catalog configuration is unavailable.');
  const policy = benchmark.loadLivePolicy();
  const reportBytes = fs.readFileSync(AIAD_REPORT_PATH);
  const aiadReport = JSON.parse(reportBytes);
  benchmark.validatePredictionReport(aiadReport);
  const cohortBytes = fs.readFileSync(COHORT_INDEX_PATH);
  const cohortIndex = JSON.parse(cohortBytes);
  if (cohortIndex.personCount !== 448 || cohortIndex.people?.length !== 448 || new Set(cohortIndex.people.map(person => person.scanId)).size !== 448) {
    throw new Error('The clean WEAR cohort is not the fixed 448-person index.');
  }
  const v8 = await createV8CpuRunner({ frontendRoot: FRONTEND_ROOT, modelRoot: V8_MODEL_ROOT });
  const productPool = await loadProductPools(policy, mongoUri);
  const { selectedPeople, assignments } = await selectPeopleAndAssignments({ report: aiadReport, cohortIndex, pools: productPool.pools, policy });
  const selection = {
    seed: SEED,
    protocol: {
      people: 'Within each sex and BMI band, SHA-256 order is used. The first participant with complete recorded waist/hip tape, a clean-render input, and enough real-tape stocked references is selected.',
      products: 'The first 600 fixed-seed candidates per category are read from the current display-ready US Test Lab catalog. Products are filtered only by numeric waist/hip charts, ordered stocked sizes, chart review, and recorded-tape reference coverage. Aiad/V8 outcomes are not inspected until after this manifest is written and hashed.',
      topUps: 'Top-ups use only chart validity, uniqueness, category quota and recorded-tape stocked coverage; prediction error never participates.',
    },
    constraints: {
      people: 10,
      decisions: 100,
      peoplePerSex: { female: 5, male: 5 },
      bmiBandsPerSex: BMI_BANDS,
      productsPerPerson: 10,
      categoryQuotas: EXPECTED_CATEGORY_QUOTAS,
      excludedChartFields: ['chest', 'underbust', 'neck', 'thigh'],
    },
    sources: {
      aiadReport: { sha256: sha256(reportBytes), schema: aiadReport.schema, modelSha256: aiadReport.modelSha256, preprocessing: aiadReport.preprocessing, people: aiadReport.rows.length },
      cohortIndex: { sha256: sha256(cohortBytes), people: cohortIndex.people.length, view: cohortIndex.canonicalView || 'front-50' },
      v8: v8.metadata,
      catalog: {
        database: DATABASE,
        collection: 'style_rag_products',
        country: COUNTRY,
        scope: SCOPE,
        candidatesPerGroup: CANDIDATES_PER_GROUP,
        population: productPool.catalogPopulation,
        loadedCandidateProducts: productPool.candidateProductCount,
        candidatePoolSha256: productPool.candidatePoolSha256,
        audit: productPool.audit,
        query: productPool.query,
      },
      sizingPolicyHashes: policy.hashes,
      workbookTemplate: { fileName: path.basename(TEMPLATE_PATH), sha256: sha256File(TEMPLATE_PATH), modified: false },
    },
    people: selectedPeople.map(person => {
      const { imagePath: _imagePath, ...frozenPerson } = person;
      return { ...frozenPerson, bmi: round(person.bmi, 4) };
    }),
    assignments: assignments.map(manifestProduct),
  };
  validateManifestSelection(selection);
  const selectionSha256 = sha256(stableStringify(selection));
  const frozenAt = new Date().toISOString();
  const manifest = {
    schema: 'commercial-sizing-manifest-v1',
    frozenAt,
    selectionSha256,
    predictionOutcomesInspectedBeforeFreeze: false,
    selection,
  };
  const manifestPath = path.join(outputDirectory, 'manifest.json');
  writeNew(manifestPath, manifest);
  const manifestBytes = fs.readFileSync(manifestPath);
  const frozenManifest = JSON.parse(manifestBytes);
  if (sha256(stableStringify(frozenManifest.selection)) !== frozenManifest.selectionSha256) throw new Error('Frozen manifest hash verification failed before scoring.');
  writeNew(path.join(outputDirectory, 'manifest.sha256'), `${sha256(manifestBytes)}  manifest.json\n`);

  // Prediction values are read only after the person/product manifest has been
  // written and hash-verified above.
  const aiadRows = new Map(aiadReport.rows.map(row => [row.scanId, row]));
  const aiadPredictions = new Map(selectedPeople.map(person => [person.scanId, aiadRows.get(person.scanId).predicted]));
  const aiadSigma = new Map(selectedPeople.map(person => [person.scanId, aiadRows.get(person.scanId).sigma]));
  const v8InferenceRows = [];
  for (const person of selectedPeople) {
    const imagePath = path.resolve(COHORT_ROOT, person.imagePath);
    if (!imagePath.startsWith(`${path.resolve(COHORT_ROOT)}${path.sep}`) || !fs.existsSync(imagePath)) throw new Error(`Invalid clean-render path for ${person.scanId}.`);
    v8InferenceRows.push(await v8.predict(person, imagePath));
  }
  const v8Inference = {
    schema: 'commercial-sizing-v8-cpu-inference-v1',
    createdAt: new Date().toISOString(),
    manifestSelectionSha256: selectionSha256,
    model: v8.metadata,
    people: selectedPeople.length,
    rows: v8InferenceRows,
  };
  writeNew(path.join(outputDirectory, 'v8-cpu-inference.json'), v8Inference);
  const v8Predictions = new Map(v8InferenceRows.map(row => [row.scanId, row.predicted]));
  const aiadDecisions = await scoreModel({ model: 'aiad', people: selectedPeople, assignments, predictionsByScanId: aiadPredictions, sigmaByScanId: aiadSigma, policy });
  const v8Decisions = await scoreModel({ model: 'v8', people: selectedPeople, assignments, predictionsByScanId: v8Predictions, sigmaByScanId: null, policy });
  const actualRows = new Map(selectedPeople.map(person => [person.scanId, person.actuals]));
  const reportId = `waist-hip-commercial-100-${frozenAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`;
  const completed = {
    schema: 'CommercialSizingReportV1',
    reportId,
    createdAt: new Date().toISOString(),
    privateTestLabOnly: true,
    manifest: {
      fileName: 'manifest.json',
      fileSha256: sha256(manifestBytes),
      selectionSha256,
      people: selection.people,
      assignments: selection.assignments.map(row => ({
        decisionId: row.decisionId,
        personScanId: row.personScanId,
        groupId: row.groupId,
        category: row.category,
        product: { styleRagId: row.product.styleRagId, title: row.product.title },
        qualification: row.qualification,
        realTapeReferenceSize: row.realTapeReferenceSize,
      })),
    },
    sources: {
      ...selection.sources,
      apple: { status: 'OFF / not run', version: null, reason: 'Frozen WEAR clean-render test; Apple Vision and Depth Pro are not part of either model tape output.' },
    },
    scope: {
      description: '10 WEAR people × 10 unique waist/hip-driven products; 100 size decisions per model.',
      commercialQuestion: 'Does model tape error change the current policy’s stocked size compared with recorded WEAR tape?',
      correctSizeDefinition: 'The current sizing policy’s stocked result using recorded WEAR tape. This is not physical-garment fit.',
      purchaseKeepValidation: 'Not run; keep/exchange is Unknown and keep rate is N/A.',
    },
    warnings: [
      'Supplier charts are described as garment/product measurements and are not certified body-size charts.',
      'Clean WEAR front renders are not normal customer phone photos.',
      'This validates model-induced size-selection stability, not garment fit, comfort, purchase or keep rate.',
      'A later 15-person purchase/keep test is still required.',
      'V8 is a new CPU inference on the selected ten people; its old 448 result file was not installed or reused.',
    ],
    summaries: {
      aiad: summaryForModel(aiadDecisions, aiadPredictions, actualRows, 'aiad'),
      v8: summaryForModel(v8Decisions, v8Predictions, actualRows, 'v8'),
    },
    decisions: { aiad: aiadDecisions, v8: v8Decisions },
    review: { conclusion: 'Unanswered', rationale: '', updatedAt: null, reviewer: null },
  };
  validateCompletedReport(completed);
  sourceHashesUnchanged(policy);
  if (sha256(fs.readFileSync(manifestPath)) !== completed.manifest.fileSha256) throw new Error('Manifest changed during scoring.');
  writeNew(path.join(outputDirectory, 'report.json'), completed);
  writeNew(path.join(outputDirectory, 'decisions.csv'), decisionsCsv([...aiadDecisions, ...v8Decisions]));
  writeNew(path.join(outputDirectory, 'review-initial.json'), {
    schema: 'commercial-sizing-review-v1',
    reportId,
    reportSha256: sha256(`${JSON.stringify(completed, null, 2)}\n`),
    conclusion: 'Unanswered',
    rationale: '',
    reviewer: null,
    createdAt: new Date().toISOString(),
  });
  const buildHashes = Object.fromEntries(['manifest.json', 'manifest.sha256', 'v8-cpu-inference.json', 'report.json', 'decisions.csv', 'review-initial.json']
    .map(file => [file, sha256File(path.join(outputDirectory, file))]));
  writeNew(path.join(outputDirectory, 'build-hashes.json'), { schema: 'commercial-sizing-build-hashes-v1', reportId, files: buildHashes });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    outputDirectory,
    reportId,
    manifestSelectionSha256: selectionSha256,
    people: selectedPeople.map(person => ({ scanId: person.scanId, gender: person.gender, bmiBand: person.bmiBand, bmi: round(person.bmi, 2) })),
    categoryQuotas: EXPECTED_CATEGORY_QUOTAS,
    summaries: completed.summaries,
    next: 'Create and verify completed.xlsx with @oai/artifact-tool, then run finalize-commercial-sizing-artifacts.cjs.',
  }, null, 2)}\n`);
}

if (require.main === module) main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

module.exports = {
  chartSnapshot,
  stretchEvidence,
  referenceReadyRows,
  scoreModel,
  validateManifestSelection,
  validateCompletedReport,
  decisionsCsv,
};
