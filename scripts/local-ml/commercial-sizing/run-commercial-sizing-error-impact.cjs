#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {sha256,pct,quantile} = require('./commercial-sizing-core.cjs');
const ROOT=path.resolve(__dirname,'../../..');
const BACKEND=path.resolve(ROOT,'../primeStyleAI-backend');
const benchmark=require(path.join(BACKEND,'scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));
const DEFAULT_RUN='/Volumes/PrimeStorage/PrimeStyleAI-benchmarks/waist-hip-commercial-validation/waist-hip-commercial-448-20260902T172942Z';
const AXES=['waist','hips','both'];
const DELTAS=[0,-7,-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,7];
const hashFile=file=>sha256(fs.readFileSync(file));
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});

function perturbMeasurements(actuals,axis,delta) {
  assert.ok(AXES.includes(axis));assert.ok(Number.isFinite(delta));
  return Object.fromEntries(['waist','hips'].map(field=>[field,
    typeof actuals[field]==='number'&&Number.isFinite(actuals[field])&&actuals[field]>0
      ? actuals[field]+(axis==='both'||axis===field?delta:0):null]));
}
function classifyIndex(reference,prediction) {
  if(prediction<0)return 'unavailable';
  return prediction===reference?'same':prediction>reference?'up':'down';
}
function blankSummary(){return {attempted:0,eligible:0,same:0,up:0,down:0,unavailable:0,notScorable:0,unaffected:0,twoOrMore:0};}
function finalizeSummary(s){return {...s,samePct:pct(s.same,s.eligible),upPct:pct(s.up,s.eligible),downPct:pct(s.down,s.eligible),unavailablePct:pct(s.unavailable,s.eligible),sameOfAllAttemptedPct:pct(s.same,s.attempted)};}
function summarizeScenario(manifest,sizeIndices) {
  const total=blankSummary(),gender={},category={};
  const personById=new Map(manifest.people.map(p=>[p.scanId,p]));
  for(const [index,slot] of manifest.opportunities.entries()) {
    const person=personById.get(slot.personScanId);
    gender[person.gender] ||= blankSummary();category[slot.groupId] ||= blankSummary();
    for(const tally of [total,gender[person.gender],category[slot.groupId]]) {
      tally.attempted++;
      const selected=sizeIndices[index];
      if(selected===-2){tally.notScorable++;continue;}
      if(selected===-3){tally.unaffected++;continue;}
      tally.eligible++;
      tally[classifyIndex(slot.referenceSizeIndex,selected)]++;
      if(selected>=0&&Math.abs(selected-slot.referenceSizeIndex)>=2)tally.twoOrMore++;
    }
  }
  assert.equal(total.eligible+total.notScorable+total.unaffected,total.attempted);
  assert.equal(total.same+total.up+total.down+total.unavailable,total.eligible);
  return {total:finalizeSummary(total),byGender:Object.fromEntries(Object.entries(gender).map(([key,s])=>[key,finalizeSummary(s)])),byCategory:Object.fromEntries(Object.entries(category).map(([key,s])=>[key,finalizeSummary(s)]))};
}

async function main(){
  const source=process.argv[2]||DEFAULT_RUN;
  const manifestPath=path.join(source,'manifest.json');
  const manifest=read(manifestPath);
  const manifestSha256=hashFile(manifestPath);
  assert.equal(manifest.people.length,448);assert.equal(manifest.products.length,200);assert.equal(manifest.opportunities.length,44800);
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const output=path.join(path.dirname(source),`waist-hip-error-impact-${stamp}`);
  fs.mkdirSync(output,{mode:0o700});
  const policy=benchmark.loadLivePolicy();assert.deepEqual(policy.hashes,manifest.sizingPolicyHashes);
  const previousPath=process.argv[3]?path.join(process.argv[3],'results.json'):null;
  const previous=previousPath?read(previousPath):null,previousSha256=previousPath?hashFile(previousPath):null;
  if(previous){assert.equal(previous.schema,'commercial-sizing-error-impact-v1');assert.equal(previous.plan.manifestSha256,manifestSha256);assert.deepEqual(previous.plan.sizingPolicyHashes,policy.hashes);}
  const previousScenarios=new Map((previous?.scenarios||[]).map(s=>[s.id,s]));
  const plan={schema:'commercial-sizing-error-impact-plan-v1',createdAt:new Date().toISOString(),sourceManifest:manifestPath,manifestSha256,
    people:448,products:200,attemptedPerScenario:44800,axes:AXES,deltasCm:DELTAS,
    sizingPolicyHashes:policy.hashes,reusedResults:previousPath?{path:previousPath,sha256:previousSha256}:null,reference:'The frozen size selected from recorded measurements; never changed across scenarios.',
    perturbation:'Add the signed error to recorded waist, hip, or both together. This simulates an exact error; it does not shift existing model predictions or widen fit tolerances.',
    denominator:'Only products using the perturbed measurement and having a valid frozen reference size are scored. Missing reference and unaffected products remain visible separately.',
    limitation:'A sensitivity experiment, not newly measured model accuracy, physical fit or a validated tolerance. Both-together scenarios use the same error direction for waist and hip; mixed directions are not included.',
    codes:{'-1':'No recommendation after error','-2':'No valid frozen reference','-3':'Product does not use the changed measurement','0 and above':'Index in the frozen ordered purchasable sizes'}};
  write(path.join(output,'plan.json'),plan);
  const productById=new Map(manifest.products.map(p=>[p.product.styleRagId,p]));
  const slotsByPerson=new Map(manifest.people.map(p=>[p.scanId,manifest.opportunities.map((row,index)=>({...row,index})).filter(row=>row.personScanId===p.scanId)]));
  const scenarios=[];
  for(const axis of AXES)for(const delta of DELTAS){
    const saved=previousScenarios.get(`${axis}:${delta}`);
    if(saved){assert.equal(saved.axis,axis);assert.equal(saved.deltaCm,delta);assert.equal(saved.sizeIndices.length,manifest.opportunities.length);if(delta===0)saved.sizeIndices.forEach((index,i)=>{if(index>=0)assert.equal(index,manifest.opportunities[i].referenceSizeIndex);});scenarios.push(saved);continue;}
    const sizeIndices=new Array(manifest.opportunities.length).fill(-2);
    for(const person of manifest.people){
      const slots=slotsByPerson.get(person.scanId);
      const relevant=slots.filter(slot=>{
        if(slot.status!=='Scorable')return false;
        const fields=productById.get(slot.productId).inspection.tapeFields;
        if(axis!=='both'&&!fields.includes(axis)){sizeIndices[slot.index]=-3;return false;}
        return true;
      });
      if(!relevant.length)continue;
      const perturbed=perturbMeasurements(person.actuals,axis,delta);
      const recommendations=await policy.recommend(relevant.map(slot=>productById.get(slot.productId).product),benchmark.profileFor({heightCm:person.heightCm,predicted:perturbed},'predicted'),person.gender,{userId:'myaifitting-ai-stylist-test'});
      const byId=new Map(recommendations.map(row=>[row.styleRagId,row]));
      for(const slot of relevant){
        const product=productById.get(slot.productId);
        const decision=benchmark.validDecision(byId.get(slot.productId),product.inspection,policy);
        const index=decision.ready?product.chart.orderedSizes.findIndex(size=>policy.recommendation.purchasableSize(decision.label,[size])):-1;
        sizeIndices[slot.index]=index;
        if(delta===0)assert.equal(index,slot.referenceSizeIndex,`Zero-error control changed ${slot.decisionId}`);
      }
    }
    const scenario={id:`${axis}:${delta}`,axis,deltaCm:delta,sizeIndices,summary:summarizeScenario(manifest,sizeIndices)};
    scenarios.push(scenario);
    console.log(JSON.stringify({scenario:scenario.id,...scenario.summary.total}));
  }
  for(const axis of AXES){const counts=scenarios.filter(s=>s.axis===axis).map(s=>s.summary.total.eligible);assert.ok(counts.every(n=>n===counts[0]));}
  assert.equal(hashFile(manifestPath),manifestSha256);assert.deepEqual(benchmark.loadLivePolicy().hashes,policy.hashes);
  if(previousPath)assert.equal(hashFile(previousPath),previousSha256);
  const result={schema:'commercial-sizing-error-impact-v1',createdAt:new Date().toISOString(),sourceRun:source,plan,
    verification:{zeroErrorControlsMatched:true,fixedDenominators:true,policyUnchanged:true,sourceManifestUnchanged:true,reusedScenarios:scenarios.filter(s=>previousScenarios.has(s.id)).length,newScenarios:scenarios.filter(s=>!previousScenarios.has(s.id)).length},scenarios};
  write(path.join(output,'results.json'),result);
  write(path.join(output,'summary.json'),{...result,scenarios:scenarios.map(({sizeIndices,...rest})=>rest)});
  write(path.join(output,'SHA256SUMS.txt'),fs.readdirSync(output).sort().map(file=>`${hashFile(path.join(output,file))}  ${file}`).join('\n')+'\n');
  console.log(JSON.stringify({complete:true,output,scenarios:scenarios.length,comparisons:scenarios.reduce((n,s)=>n+s.summary.total.eligible,0)}));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={perturbMeasurements,classifyIndex,summarizeScenario};
