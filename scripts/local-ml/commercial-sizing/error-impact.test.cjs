'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {perturbMeasurements,classifyIndex,summarizeScenario}=require('./run-commercial-sizing-error-impact.cjs');
test('signed errors affect only the requested measurements and preserve missing labels',()=>{
  assert.deepEqual(perturbMeasurements({waist:80,hips:100},'waist',7),{waist:87,hips:100});
  assert.deepEqual(perturbMeasurements({waist:80,hips:100},'both',-7),{waist:73,hips:93});
  assert.deepEqual(perturbMeasurements({waist:null,hips:100},'both',7),{waist:null,hips:107});
});
test('size movement uses ordered sizes and keeps unavailable separate',()=>{
  assert.equal(classifyIndex(2,2),'same');assert.equal(classifyIndex(2,3),'up');assert.equal(classifyIndex(2,1),'down');assert.equal(classifyIndex(2,-1),'unavailable');
});
test('missing references and unaffected products never inflate accuracy',()=>{
  const manifest={people:[{scanId:'a',gender:'female'}],opportunities:[0,1,2,3,4,5].map(()=>({personScanId:'a',groupId:'female-pants',referenceSizeIndex:1}))};
  const result=summarizeScenario(manifest,[1,2,0,-1,-2,-3]).total;
  assert.equal(result.eligible,4);assert.equal(result.samePct,25);assert.equal(result.notScorable,1);assert.equal(result.unaffected,1);assert.equal(result.attempted,6);
});
