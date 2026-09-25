#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createV8CpuRunner } = require('./v8-cpu-inference.cjs');
const { referenceReadyRows, scoreModel, chartSnapshot } = require('./generate-commercial-sizing-report.cjs');
const { sha256, stableStringify, bmiFor, bmiBand, summaryForModel, pct, csvCell } = require('./commercial-sizing-core.cjs');
const { analyzeCommercialReport } = require('./commercial-sizing-analysis.cjs');

const ROOT = path.resolve(__dirname, '../../..');
const BACKEND = path.resolve(ROOT, '../primeStyleAI-backend');
const benchmark = require(path.join(BACKEND, 'scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));
const BASE = '/Volumes/PrimeStorage/PrimeStyleAI-benchmarks';
const SOURCE = path.join(BASE, 'waist-hip-commercial-validation/waist-hip-commercial-100-20260901T115427Z');
const COHORT = path.join(BASE, 'aiad-size-impact-20260831/cohort');
const MODEL = '/Volumes/PrimeStorage/PrimeStyleAI-model-artifacts/legacy/wear3d-waist-hips-v8-fresh-mask-h100';
const FILES = {
  originalManifest: path.join(SOURCE, 'manifest.json'),
  originalReport: path.join(SOURCE, 'report.json'),
  aiad: path.join(BASE, 'aiad-size-impact-20260831/inputs/shane-confidence-adapter-benchmark-448-20260901.json'),
  cohort: path.join(COHORT, '.local-ml/wear-sdk-heldout/index.json'),
  model: path.join(MODEL, 'model.onnx'),
  runtime: path.join(MODEL, 'runtime.json'),
  catalog: path.join(BASE, 'model-product-size-impact-20260901/catalog-by-garment.json'),
};
const QUOTAS = { female: { 'female-pants': 40, 'female-shorts': 30, 'female-skirts': 30 }, male: { 'male-pants': 60, 'male-shorts': 40 } };
const SEED = 'waist-hip-commercial-448-200-products-v1';
const ATTEMPTED = 44_800;
const hashFile = file => sha256(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', {flag:'wx', mode:0o600});
const log = (stage, fields = {}) => console.log(JSON.stringify({stage, at:new Date().toISOString(), ...fields}));

async function main() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const output = process.argv[2] || path.join(BASE, 'waist-hip-commercial-validation', `waist-hip-commercial-448-${stamp}`);
  fs.mkdirSync(output, {mode:0o700});
  const hashes = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, hashFile(file)]));
  assert.equal(hashes.originalReport, '8c0572319e3097766cf921ab5c825cba0154165f6844513b8c18dd220ef7fa1e');
  const originalManifest = read(FILES.originalManifest);
  const original = read(FILES.originalReport);
  const aiad = read(FILES.aiad);
  const cohort = read(FILES.cohort);
  const runtime = read(FILES.runtime);
  benchmark.validatePredictionReport(aiad);
  assert.equal(cohort.people.length, 448);
  assert.equal(new Set(cohort.people.map(row => row.subjectId)).size, 448);
  assert.ok(cohort.people.every(row => row.role === 'test'));
  assert.equal(runtime.sealed448SubjectsUsedForTraining, 0);
  assert.equal(runtime.modelSha256, hashes.model);
  const policy = benchmark.loadLivePolicy();
  assert.deepEqual(policy.hashes, original.sources.sizingPolicyHashes);
  const cohortByScan = new Map(cohort.people.map(row => [row.scanId, row]));
  const people = aiad.rows.map(row => {
    const clean = cohortByScan.get(row.scanId);
    assert.equal(clean.subjectId, row.subjectId);
    const imagePath = path.resolve(COHORT, clean.imagePath);
    assert.ok(imagePath.startsWith(COHORT + path.sep) && fs.existsSync(imagePath));
    assert.ok(row.heightCm > 0 && row.weightKg > 0);
    return {scanId:row.scanId, subjectId:row.subjectId, gender:row.gender, heightCm:row.heightCm, weightKg:row.weightKg,
      bmi:bmiFor(row.heightCm, row.weightKg), bmiBand:bmiBand(bmiFor(row.heightCm,row.weightKg)),
      actuals:{waist:row.actuals.waist, hips:row.actuals.hips}, imagePath:clean.imagePath, imageSha256:hashFile(imagePath)};
  }).sort((a,b) => a.scanId.localeCompare(b.scanId));
  assert.equal(people.filter(row => row.gender === 'female').length,224);
  assert.equal(people.filter(row => row.gender === 'male').length,224);
  const originalProducts = originalManifest.selection.assignments.map(row => {
    const inspection = benchmark.inspectProduct(row.product, policy);
    assert.equal(inspection.issues.length,0);
    assert.ok(inspection.tapeFields.every(field => ['waist','hips'].includes(field)));
    const chart = chartSnapshot(row.product, inspection, policy);
    assert.deepEqual(chart,row.chart);
    return {product:row.product, inspection, chart, groupId:row.groupId, category:row.category};
  });
  assert.equal(new Set(originalProducts.map(row=>row.product.styleRagId)).size,100);
  const catalog=read(FILES.catalog);
  assert.deepEqual(catalog.sourceHashes,policy.hashes);
  const products=[];
  const catalogAudit=[];
  for(const [gender,quotas] of Object.entries(QUOTAS)) for(const [groupId,count] of Object.entries(quotas)) {
    const group=catalog.groups.find(row=>row.id===groupId);
    const eligible=[];
    const excluded=[];
    for(const product of group.products) {
      const inspection=benchmark.inspectProduct(product,policy);
      const issues=[...inspection.issues,...benchmark.chartValueWarnings(product,policy).map(()=> 'CHART_VALUE_WARNING')];
      if(!inspection.tapeFields.length||inspection.tapeFields.some(field=>!['waist','hips'].includes(field)))issues.push('NOT_WAIST_HIP_ONLY');
      if(inspection.orderedLabels.length<2||inspection.stockSizes.length<2)issues.push('INSUFFICIENT_ORDERED_STOCK');
      if(issues.length){excluded.push({productId:product.styleRagId,issues});continue;}
      let chart;
      try { chart=chartSnapshot(product,inspection,policy); }
      catch(error) { excluded.push({productId:product.styleRagId,issues:['NORMALIZED_CHART_HAS_FEWER_THAN_TWO_ORDERED_STOCKED_SIZES'],detail:error.message}); continue; }
      assert.equal(product.gender,gender);
      eligible.push({product,inspection,chart,groupId,category:originalProducts.find(row=>row.groupId===groupId).category,
        selectionHash:sha256(`${SEED}:${groupId}:${product.styleRagId}`)});
    }
    eligible.sort((a,b)=>a.selectionHash.localeCompare(b.selectionHash));
    assert.ok(eligible.length>=count,`Insufficient ${groupId} products`);
    products.push(...eligible.slice(0,count));
    catalogAudit.push({groupId,pool:group.products.length,eligible:eligible.length,selected:count,excluded});
  }
  assert.equal(new Set(products.map(row=>row.product.styleRagId)).size,200);
  const productSelectionPath=path.join(output,'product-selection.json');
  write(productSelectionPath,{seed:SEED,frozenAt:new Date().toISOString(),sourceSha256:hashes.catalog,policyHashes:policy.hashes,
    selectedWithoutPersonMeasurementsOrPredictions:true,catalogAudit,products});
  const opportunities = [];
  const assignments = [];
  let counter = 1;
  for (const [personIndex,person] of people.entries()) {
    for (const [groupId,count] of Object.entries(QUOTAS[person.gender])) {
      const candidates = products.filter(row=>row.groupId===groupId).map(row=>({...row,
        selectionHash:sha256(`${SEED}:${person.scanId}:${groupId}:${row.product.styleRagId}`)}))
        .sort((a,b)=>a.selectionHash.localeCompare(b.selectionHash));
      const ready = await referenceReadyRows(person,candidates,groupId,policy);
      const readyById = new Map(ready.map(row=>[row.product.styleRagId,row]));
      const selected = candidates;
      assert.equal(selected.length,count);
      for (const product of selected) {
        const reference = readyById.get(product.product.styleRagId);
        const missing = product.inspection.tapeFields.filter(field=>!(person.actuals[field]>0));
        const decisionId = `W${String(counter++).padStart(5,'0')}`;
        const opportunity = {decisionId,personScanId:person.scanId,productId:product.product.styleRagId,groupId,
          selectionHash:product.selectionHash,referenceSize:reference?.decision.label??null,
          referenceSizeIndex:reference?.referenceSizeIndex??null,
          status:reference?'Scorable':missing.length?'Missing recorded measurement':'No stocked real-tape reference',missingMeasurements:missing};
        opportunities.push(opportunity);
        if(reference) assignments.push({...product,decisionId,personScanId:person.scanId,referenceSize:reference.decision.label,referenceSizeIndex:reference.referenceSizeIndex});
      }
    }
    if((personIndex+1)%64===0) log('selecting',{people:personIndex+1,scorable:assignments.length});
  }
  assert.equal(opportunities.length,ATTEMPTED);
  for(const person of people) assert.equal(opportunities.filter(row=>row.personScanId===person.scanId).length,100);
  assert.equal(new Set(opportunities.map(row=>`${row.personScanId}:${row.productId}`)).size,ATTEMPTED);
  const manifest = {schema:'commercial-sizing-448-manifest-v1',frozenAt:new Date().toISOString(),seed:SEED,
    protocol:{people:'All 448 existing held-out WEAR subjects; none selected or removed using prediction error.',
      products:'200 distinct frozen waist/hip products: women 40 pants, 30 shorts, 30 skirts; men 60 pants and 40 shorts. Fixed SHA-256 selection from a previously frozen catalog, using chart validity and stocked ordered sizes only. Selection is saved before any person-to-product reference is calculated. All 224 people of each gender are checked against all 100 matching products; no product is selected based on a person fitting it or model accuracy.',
      unseen:'Saved cohort marks every subject test-only and the hash-verified runtime declares zero sealed-448 training subjects. These subjects were evaluated before; this is not a pristine first-look test. Original training subject list is not in the installed runtime package.',
      predictions:'Fresh local CPU inference for our model; frozen Aiad predictions. No training, tuning, or model selection.',
      denominator:'Exact-size accuracy uses only slots with a valid recorded-measurement size reference. Unscorable slots are separately reported and never counted as correct.'},
    sources:FILES,sourceSha256:hashes,sizingPolicyHashes:policy.hashes,trainingIndexSha256:runtime.trainingIndexSha256,
    productSelectionSha256:hashFile(productSelectionPath),catalogAudit,people,products,opportunities};
  const manifestPath = path.join(output,'manifest.json');
  write(manifestPath,manifest);
  const manifestHash=hashFile(manifestPath);
  log('frozen',{output,people:448,slots:ATTEMPTED,scorable:assignments.length,unscorable:ATTEMPTED-assignments.length,manifestHash});
  const runner=await createV8CpuRunner({frontendRoot:ROOT,modelRoot:MODEL});
  const inference=[];
  for (const [index,person] of people.entries()) {
    const result=await runner.predict(person,path.resolve(COHORT,person.imagePath));
    assert.ok(result.predicted.waist>0 && result.predicted.hips>0);
    inference.push(result);
    if((index+1)%32===0) log('inference',{complete:index+1,total:448});
  }
  write(path.join(output,'v8-cpu-inference.json'),{schema:'commercial-sizing-448-v8-cpu-inference-v1',createdAt:new Date().toISOString(),manifestSha256:manifestHash,model:runner.metadata,people:448,rows:inference});
  const aiadByScan=new Map(aiad.rows.map(row=>[row.scanId,row]));
  const predictions={aiad:new Map(people.map(row=>[row.scanId,{waist:aiadByScan.get(row.scanId).predicted.waist,hips:aiadByScan.get(row.scanId).predicted.hips}])),v8:new Map(inference.map(row=>[row.scanId,row.predicted]))};
  const sigma=new Map(aiad.rows.map(row=>[row.scanId,row.sigma]));
  const decisions={};
  for(const model of ['aiad','v8']) {
    decisions[model]=await scoreModel({model,people,assignments,predictionsByScanId:predictions[model],sigmaByScanId:model==='aiad'?sigma:null,policy});
    assert.equal(decisions[model].length,assignments.length);
    for(const row of decisions[model]) {
      row.notes=row.notes.filter(note=>!note.startsWith('New CPU inference'));
      if(model==='v8') row.notes.push('Fresh local CPU inference on the full 448 held-out WEAR front renders; previous V8 448 predictions were not reused.');
      for(const key of ['actualTapeCm','predictedTapeCm','signedErrorCm','sigmaCm']) if(row[key]) row[key]={waist:row[key].waist,hips:row[key].hips};
    }
    log('scored',{model,decisions:decisions[model].length});
  }
  assert.deepEqual(decisions.aiad.map(row=>row.manifestPersonProductKey),decisions.v8.map(row=>row.manifestPersonProductKey));
  // Replay the original 100 decisions to prove that this run retained its policy,
  // chart, label and preprocessing behavior before reporting the larger cohort.
  const oldAssignments=originalManifest.selection.assignments.map(row=>({...originalProducts.find(p=>p.product.styleRagId===row.product.styleRagId),
    decisionId:row.decisionId,personScanId:row.personScanId,referenceSize:row.realTapeReferenceSize,referenceSizeIndex:row.realTapeReferenceSizeIndex}));
  const oldPeople=original.manifest.people.map(row=>people.find(person=>person.scanId===row.scanId));
  for(const model of ['aiad','v8']) {
    const replay=await scoreModel({model,people:oldPeople,assignments:oldAssignments,predictionsByScanId:predictions[model],sigmaByScanId:model==='aiad'?sigma:null,policy});
    assert.deepEqual(replay.map(row=>[row.decisionId,row.referenceSize,row.predictedSize,row.result]),original.decisions[model].map(row=>[row.decisionId,row.referenceSize,row.predictedSize,row.result]));
  }
  const actuals=new Map(people.map(person=>[person.scanId,person.actuals]));
  const report={schema:'CommercialSizingCohortReportV1',reportId:`waist-hip-commercial-448-${stamp}`,createdAt:new Date().toISOString(),privateTestLabOnly:true,
    scope:{people:448,products:200,productsPerPerson:100,attemptedDecisionsPerModel:ATTEMPTED,scorableDecisionsPerModel:assignments.length,
      unscorableDecisionsPerModel:ATTEMPTED-assignments.length,peopleWithScorableDecisions:new Set(assignments.map(row=>row.personScanId)).size,
      missingRecordedMeasurements:people.filter(person=>!person.actuals.waist||!person.actuals.hips).map(({scanId,actuals})=>({scanId,actuals})),
      referenceUnavailableReasons:opportunities.filter(row=>row.status!=='Scorable').reduce((o,row)=>(o[row.status]=(o[row.status]||0)+1,o),{})},
    protocol:manifest.protocol,sources:{sourceSha256:hashes,sizingPolicyHashes:policy.hashes,model:runner.metadata,manifestSha256:manifestHash},
    people,opportunities,products:products.map(row=>({id:row.product.styleRagId,title:row.product.title,sourceProductId:row.product.sourceProductId,gender:row.product.gender,groupId:row.groupId,category:row.category,chart:row.chart})),
    summaries:Object.fromEntries(['aiad','v8'].map(model=>[model,summaryForModel(decisions[model],predictions[model],actuals,model,assignments.length)])),
    decisions,verification:{original100ReplayMatched:true,all448InferenceSucceeded:true,pairedDecisionKeysMatch:true}};
  report.analysis=analyzeCommercialReport(report);
  for(const model of ['aiad','v8']) {
    report.summaries[model].measurementStats={waist:report.summaries[model].measurementStats.waist,hips:report.summaries[model].measurementStats.hips};
    report.summaries[model].exactOfAllAttemptedPct=pct(report.summaries[model].outcomes.exact.count,ATTEMPTED);
  }
  for(const [key,file] of Object.entries(FILES)) assert.equal(hashFile(file),hashes[key],`${key} changed`);
  assert.equal(hashFile(manifestPath),manifestHash);
  assert.deepEqual(benchmark.loadLivePolicy().hashes,policy.hashes);
  const compactDecisions=Object.fromEntries(['aiad','v8'].map(model=>[model,decisions[model].map(row=>({
    decisionId:row.decisionId,personScanId:row.person.scanId,productId:row.product.id,referenceSize:row.referenceSize,
    predictedSize:row.predictedSize,chartSteps:row.chartSteps,result:row.result,adjacentGap:row.adjacentGap,
    nearestBoundary:row.nearestBoundary,confidence:row.confidence,gapErrorRatio:row.gapErrorRatio,dataQualityFlag:row.dataQualityFlag}))]));
  for(const person of report.people) {
    person.predictions=Object.fromEntries(['aiad','v8'].map(model=>[model,{waist:predictions[model].get(person.scanId).waist,hips:predictions[model].get(person.scanId).hips}]));
    person.sigma={waist:sigma.get(person.scanId)?.waist,hips:sigma.get(person.scanId)?.hips};
  }
  write(path.join(output,'report.json'),{...report,decisions:compactDecisions});
  const byDecision=Object.fromEntries(['aiad','v8'].map(model=>[model,new Map(decisions[model].map(row=>[row.decisionId,row]))]));
  const productById=new Map(products.map(row=>[row.product.styleRagId,row]));
  const personById=new Map(people.map(row=>[row.scanId,row]));
  const columns=['Model','Decision','Person','Product ID','Product','Category','Reference status','Actual waist cm','Actual hip cm','Predicted waist cm','Predicted hip cm','Reference size','Predicted size','Result','Steps','Confidence','Boundary cm','Gap cm'];
  const csvRows=[];
  for(const model of ['aiad','v8']) for(const slot of opportunities) {
    const row=byDecision[model].get(slot.decisionId),person=personById.get(slot.personScanId),product=productById.get(slot.productId),prediction=predictions[model].get(slot.personScanId);
    csvRows.push([model==='v8'?'Our model':'Aiad',slot.decisionId,slot.personScanId,slot.productId,product.product.title,product.category,slot.status,person.actuals.waist,person.actuals.hips,prediction.waist,prediction.hips,slot.referenceSize,row?.predictedSize,row?.result||'Not scorable',row?.chartSteps,row?.confidence.label,row?.nearestBoundary?.distanceCm,row?.adjacentGap?.cm]);
  }
  write(path.join(output,'decisions.csv'),[columns,...csvRows].map(row=>row.map(csvCell).join(',')).join('\n')+'\n');
  write(path.join(output,'summary.json'),{reportId:report.reportId,scope:report.scope,summaries:report.summaries,analysis:report.analysis,verification:report.verification});
  write(path.join(output,'SHA256SUMS.txt'),fs.readdirSync(output).sort().map(file=>`${hashFile(path.join(output,file))}  ${file}`).join('\n')+'\n');
  log('complete',{output,scope:report.scope,aiad:report.summaries.aiad.outcomes,ourModel:report.summaries.v8.outcomes});
}

if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
