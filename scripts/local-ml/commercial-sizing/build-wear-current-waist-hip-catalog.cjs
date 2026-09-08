#!/usr/bin/env node
'use strict';

// Read-only snapshot builder for the WEAR selector. It does not update product,
// inventory, supplier, customer, or sizing records.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PRODUCT_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = process.env.WEAR_SIZE_IMPACT_BACKEND_ROOT
  || path.resolve(PRODUCT_ROOT, '../primeStyleAI-backend');
const { MongoClient } = require(path.join(BACKEND_ROOT, 'node_modules/mongodb'));
const dotenv = require(path.join(BACKEND_ROOT, 'node_modules/dotenv'));
const {
  loadLivePolicy,
  inspectProduct,
  chartValueWarnings,
  hostValue,
} = require(path.join(BACKEND_ROOT, 'scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));

const SCHEMA = 'wear-current-waist-hip-catalog-v1';
const DATABASE = 'primestyleai_test_lab';
const COUNTRY = 'US';
const SCOPE = { userId: 'myaifitting-ai-stylist-test' };
const DEFAULT_TARGET = path.join(
  PRODUCT_ROOT,
  '.local-ml',
  'wear-side-selector',
  'size-guide',
  'catalog-20260908.json',
);
const FIELDS = [
  'userId', 'source', 'sourceProductId', 'styleRagId', 'title', 'brand', 'merchantName', 'gender', 'slot',
  'garmentType', 'category', 'parentCategory', 'subcategory', 'productType', 'tags', 'styleTags', 'occasionTags',
  'coverageTags', 'setComponents', 'description', 'color', 'material', 'fitTags', 'price', 'currency', 'imageUrl',
  'sizeGuide', 'sizeGuideStatus', 'sizeGuideQa', 'availableSizes', 'sizes', 'availability', 'inventoryQuantity',
  'hiddenFromCatalog', 'aiStylistRagReady', 'qualityStatus', 'enrichmentConfidence', 'eligibilityKeys',
  'sourceFreshness', 'updatedAt', 'variants.id', 'variants.name', 'variants.color', 'variants.available',
  'variants.sizes.name', 'variants.sizes.sourceVariantId', 'variants.sizes.availability',
  'variants.sizes.inventory', 'variants.sizes.price', 'raw.supplierProvider',
  'raw.supplierLifecycleState', 'raw.purchaseDisabled', 'raw.aiStylistCompleteFormalSet',
  'raw.sizeChartEvidence.snippets',
];

const projection = Object.fromEntries(FIELDS.map((field) => [field, 1]));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

async function build(target = DEFAULT_TARGET) {
  if (fs.existsSync(target)) throw new Error(`Snapshot already exists: ${target}. Choose a new versioned path.`);
  const env = dotenv.parse(fs.readFileSync(path.join(BACKEND_ROOT, '.env')));
  const uri = env.MONGO_URI || env.MONGODB_URI;
  if (!uri) throw new Error('Mongo configuration unavailable in the backend checkout.');
  const policy = loadLivePolicy();
  const client = new MongoClient(uri, {
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 180_000,
  });
  const startedAt = new Date().toISOString();
  try {
    await client.connect();
    const collection = client.db(DATABASE).collection('style_rag_products');
    const query = hostValue({ $and: [
      policy.catalog.displayReadyCatalogQuery(SCOPE),
      { eligibilityKeys: policy.eligibility.catalogCountryEligibilityKey(COUNTRY) },
      { gender: { $in: ['female', 'male'] }, slot: { $in: ['top', 'bottom', 'dress', 'outerwear'] } },
      { $nor: [{ gender: 'male', slot: 'dress' }] },
    ] });
    const sourceProducts = await collection.find(query, {
      projection: { _id: 0, ...projection },
      maxTimeMS: 180_000,
      batchSize: 250,
    }).limit(50_001).toArray();
    if (sourceProducts.length > 50_000) throw new Error('Catalog snapshot safety bound exceeded.');

    const seen = new Set();
    const exclusions = {};
    const qualified = [];
    for (const product of sourceProducts.sort((a, b) => String(a.styleRagId).localeCompare(String(b.styleRagId)))) {
      const identity = `${product.source}:${product.sourceProductId || product.styleRagId}`;
      if (seen.has(identity)) {
        exclusions.DUPLICATE_SOURCE_PRODUCT = (exclusions.DUPLICATE_SOURCE_PRODUCT || 0) + 1;
        continue;
      }
      seen.add(identity);
      const inspection = inspectProduct(product, policy);
      const warnings = chartValueWarnings(product, policy);
      const reasons = [
        ...inspection.issues,
        ...(warnings.length ? ['SUSPICIOUS_CHART_VALUE'] : []),
        ...(!inspection.tapeFields.length || inspection.tapeFields.some((field) => !['waist', 'hips'].includes(field))
          ? ['NOT_WAIST_HIP_ONLY'] : []),
        ...(inspection.orderingUnavailable ? ['NO_ORDERED_NUMERIC_STOCKED_SIZE_PATH'] : []),
      ];
      if (reasons.length) {
        for (const reason of new Set(reasons)) exclusions[reason] = (exclusions[reason] || 0) + 1;
        continue;
      }
      qualified.push(product);
    }

    const snapshot = {
      schema: SCHEMA,
      startedAt,
      finishedAt: new Date().toISOString(),
      readOnly: true,
      database: DATABASE,
      collection: 'style_rag_products',
      country: COUNTRY,
      scope: SCOPE,
      sourceCount: sourceProducts.length,
      qualifiedCount: qualified.length,
      genderCounts: {
        female: qualified.filter((product) => product.gender === 'female').length,
        male: qualified.filter((product) => product.gender === 'male').length,
      },
      exclusionCounts: exclusions,
      sourceHashes: policy.hashes,
      eligibility: 'Every distinct current display-ready US product whose real numeric stocked chart is accepted by the checked-out MyAIFitting sizing route and requires waist, hips, or both. No fixed quota or sample is used.',
      products: qualified,
      query: JSON.parse(JSON.stringify(query, (_key, value) => value instanceof RegExp
        ? { $regex: value.source, $options: value.flags }
        : value)),
      limitations: [
        'Stock and charts are frozen database state; no supplier API or checkout was called.',
        'Product-size agreement is not physical-fit or centimetre accuracy.',
        'Supplier chart measurement basis remains whatever the source supplied.',
      ],
    };
    const bytes = Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
    process.stdout.write(`${JSON.stringify({
      target,
      sha256: sha256(bytes),
      sourceCount: snapshot.sourceCount,
      qualifiedCount: snapshot.qualifiedCount,
      genderCounts: snapshot.genderCounts,
      exclusionCounts: snapshot.exclusionCounts,
    }, null, 2)}\n`);
    return snapshot;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  build(process.argv[2] || DEFAULT_TARGET).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { build, DEFAULT_TARGET, SCHEMA };
