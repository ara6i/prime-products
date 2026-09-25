#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {sha256}=require('./commercial-sizing-core.cjs');
const {perturbMeasurements,summarizeScenario}=require('./run-commercial-sizing-error-impact.cjs');
const benchmark=require(path.resolve(__dirname,'../../../../primeStyleAI-backend/scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));
const AXES=['waist','hips','both'],DELTAS=[0,-7,-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,7];
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hashFile=file=>sha256(fs.readFileSync(file));
const write=(file,value)=>fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});

async function main(){
  const source=process.argv[2];assert.ok(source,'Pass the frozen cohort run directory');
  const manifestPath=path.join(source,'manifest.json'),reportPath=path.join(source,'report.json');
  const manifest=read(manifestPath),report=read(reportPath),manifestSha256=hashFile(manifestPath),reportSha256=hashFile(reportPath);
  assert.equal(manifest.people.length,448);assert.equal(manifest.products.length,200);assert.equal(manifest.opportunities.length,44800);
  assert.equal(report.sources.manifestSha256,manifestSha256);
  const policy=benchmark.loadLivePolicy();assert.deepEqual(policy.hashes,manifest.sizingPolicyHashes);
  const previousPath=process.argv[3]?path.join(process.argv[3],'results.json'):null;
  const previous=previousPath?read(previousPath):null,previousSha256=previousPath?hashFile(previousPath):null;
  if(previous){assert.equal(previous.schema,'commercial-sizing-model-error-v1');assert.equal(previous.plan.manifestSha256,manifestSha256);assert.equal(previous.plan.reportSha256,reportSha256);assert.deepEqual(previous.plan.sizingPolicyHashes,policy.hashes);}
  const previousScenarios=new Map((previous?.scenarios||[]).map(s=>[s.id,s]));
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const output=path.join(path.dirname(source),'waist-hip-model-errors-'+stamp);fs.mkdirSync(output,{mode:0o700});
  const plan={schema:'commercial-sizing-model-error-plan-v1',createdAt:new Date().toISOString(),sourceManifest:manifestPath,manifestSha256,sourceReport:reportPath,reportSha256,people:448,products:200,attemptedPerScenario:44800,axes:AXES,deltasCm:DELTAS,models:['aiad','v8'],sizingPolicyHashes:policy.hashes,reusedResults:previousPath?{path:previousPath,sha256:previousSha256}:null,
    perturbation:'Add the signed offset to each model saved waist, hip, or both predictions. Existing model error is retained; the selected offset is EXTRA error, not total error from the recorded measurement.',
    reference:'Frozen reference size from recorded measurements. Never change the reference, stock, charts or sizing rules.',
    denominator:'Only checks with a valid frozen reference and a chart using the changed measurement. Missing references and unaffected charts are excluded, identically for both models.',
    limitation:'Hypothetical stress test, not newly measured accuracy. A negative offset may correct an existing overprediction. Both measurements move in the same direction; no mixed-direction scenarios.',
    codes:{'-1':'Unavailable after offset','-2':'No valid frozen reference','-3':'Chart does not use changed measurement','0 and above':'Index in frozen ordered sizes'}};
  write(path.join(output,'plan.json'),plan);
  const products=new Map(manifest.products.map(p=>[p.product.styleRagId,p]));
  const people=new Map(report.people.map(p=>[p.scanId,p]));
  const slotsByPerson=new Map(manifest.people.map(p=>[p.scanId,[]]));
  manifest.opportunities.forEach((slot,index)=>slotsByPerson.get(slot.personScanId).push({...slot,index}));
  const decisions=Object.fromEntries(plan.models.map(model=>[model,new Map(report.decisions[model].map(row=>[row.decisionId,row]))]));
  const scenarios=[];
  for(const model of plan.models)for(const axis of AXES)for(const delta of DELTAS){
    const saved=previousScenarios.get(`${model}:${axis}:${delta}`);
    if(saved){assert.equal(saved.model,model);assert.equal(saved.axis,axis);assert.equal(saved.deltaCm,delta);assert.equal(saved.sizeIndices.length,manifest.opportunities.length);if(delta===0)saved.sizeIndices.forEach((index,i)=>{if(index===-2||index===-3)return;const slot=manifest.opportunities[i],product=products.get(slot.productId),row=decisions[model].get(slot.decisionId);assert.ok(row);const expected=row.predictedSize==null?-1:product.chart.orderedSizes.findIndex(size=>policy.recommendation.purchasableSize(row.predictedSize,[size]));assert.equal(index,expected);});scenarios.push(saved);continue;}
    const sizeIndices=new Array(manifest.opportunities.length).fill(-2);
    for(const sourcePerson of manifest.people){
      const person=people.get(sourcePerson.scanId);
      const relevant=slotsByPerson.get(person.scanId).filter(slot=>{
        if(slot.status!=='Scorable')return false;
        if(axis!=='both'&&!products.get(slot.productId).inspection.tapeFields.includes(axis)){sizeIndices[slot.index]=-3;return false;}
        return true;
      });
      if(!relevant.length)continue;
      const predicted=perturbMeasurements(person.predictions[model],axis,delta);
      const recommendations=await policy.recommend(relevant.map(slot=>products.get(slot.productId).product),benchmark.profileFor({heightCm:person.heightCm,predicted},'predicted'),person.gender,{userId:'myaifitting-ai-stylist-test'});
      const byId=new Map(recommendations.map(row=>[row.styleRagId,row]));
      for(const slot of relevant){
        const product=products.get(slot.productId),decision=benchmark.validDecision(byId.get(slot.productId),product.inspection,policy);
        const index=decision.ready?product.chart.orderedSizes.findIndex(size=>policy.recommendation.purchasableSize(decision.label,[size])):-1;
        if(decision.ready)assert.ok(index>=0,'Selected size missing from chart');
        sizeIndices[slot.index]=index;
        if(delta===0){const saved=decisions[model].get(slot.decisionId);assert.ok(saved);const expected=saved.predictedSize==null?-1:product.chart.orderedSizes.findIndex(size=>policy.recommendation.purchasableSize(saved.predictedSize,[size]));assert.equal(index,expected,`Zero offset changed ${model} ${slot.decisionId}`);}
      }
    }
    const scenario={id:`${model}:${axis}:${delta}`,model,axis,deltaCm:delta,sizeIndices,summary:summarizeScenario(manifest,sizeIndices)};
    scenarios.push(scenario);console.log(JSON.stringify({scenario:scenario.id,...scenario.summary.total}));
  }
  for(const axis of AXES){const counts=scenarios.filter(s=>s.axis===axis).map(s=>s.summary.total.eligible);assert.ok(counts.every(n=>n===counts[0]));}
  assert.equal(hashFile(manifestPath),manifestSha256);assert.equal(hashFile(reportPath),reportSha256);assert.deepEqual(benchmark.loadLivePolicy().hashes,policy.hashes);
  if(previousPath)assert.equal(hashFile(previousPath),previousSha256);
  const result={schema:'commercial-sizing-model-error-v1',createdAt:new Date().toISOString(),sourceRun:source,plan,verification:{zeroOffsetsReproduceSavedModelSizes:true,fixedDenominators:true,sourceFilesUnchanged:true,policyUnchanged:true,reusedScenarios:scenarios.filter(s=>previousScenarios.has(s.id)).length,newScenarios:scenarios.filter(s=>!previousScenarios.has(s.id)).length},scenarios};
  write(path.join(output,'results.json'),result);write(path.join(output,'summary.json'),{...result,scenarios:scenarios.map(({sizeIndices,...s})=>s)});
  write(path.join(output,'SHA256SUMS.txt'),fs.readdirSync(output).sort().map(file=>hashFile(path.join(output,file))+'  '+file).join('\n')+'\n');
  console.log(JSON.stringify({complete:true,output,scenarios:scenarios.length,comparisons:scenarios.reduce((n,s)=>n+s.summary.total.eligible,0)}));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
