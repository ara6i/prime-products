#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM,VirtualConsole}=require('jsdom');
async function main(){
  const file=process.argv[2],html=fs.readFileSync(file,'utf8'),errors=[];let clipboard='';
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
  const options={runScripts:'dangerously',url:'https://example.test/report',virtualConsole,beforeParse(window){Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async text=>{clipboard=text;}}});}};
  const dom=new JSDOM(html,options),doc=dom.window.document,$=id=>doc.getElementById(id),data=JSON.parse($('expanded-report-data').textContent);
  assert.equal(data.people.length,448);assert.equal(data.products.length,200);assert.equal(data.pairs.length,44800);assert.equal(data.scenarios.length,45);assert.equal(data.modelErrorScenarios,undefined);
  assert.equal($('error-basis'),null);assert.equal($('error-table-model'),null);assert.equal(doc.querySelectorAll('#shared-products .product-chart').length,200);
  assert.equal($('mode-error').hidden,false);assert.equal($('mode-original').hidden,true);assert.ok(!/\b(Aiad|trained model|model predictions|extra error)\b/i.test($('mode-error').textContent));
  const referencePairs=data.pairs.filter(row=>row[2]==='Scorable');assert.equal(referencePairs.length,28299);
  for(const scenario of data.scenarios){assert.equal(scenario.sizeIndices.length,44800);if(scenario.deltaCm===0)scenario.sizeIndices.forEach((value,index)=>{if(value>=-1)assert.equal(value,data.pairs[index][3]);});}
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new dom.window.Event('change'));};
  const choose=(id,value)=>{$(id+'-trigger').click();assert.equal($(id+'-trigger').getAttribute('aria-expanded'),'true');Array.from($(id+'-listbox').children).find(item=>item.dataset.value===value).click();assert.equal($(id).value,value);assert.equal($(id+'-trigger').getAttribute('aria-expanded'),'false');};
  assert.equal(doc.querySelectorAll('select:not([hidden])').length,0);
  assert.ok($('tab-cohort').textContent.includes('Aiad vs our model'));
  const measurementRows=Array.from($('model-measurement-errors').querySelectorAll('tbody tr'));
  assert.equal(measurementRows.length,4);
  for(const [index,mean,median] of [[0,'2.69','2.24'],[1,'1.54','1.14'],[2,'2.90','2.40'],[3,'1.76','1.34']]){
    assert.ok(measurementRows[index].children[1].textContent.includes('447 people'));
    assert.ok(measurementRows[index].children[2].textContent.startsWith(mean+' cm'));
    assert.ok(measurementRows[index].children[3].textContent.startsWith(median+' cm'));
  }
  for(const axis of ['both','waist','hips'])for(const delta of [0,1,2,3,4,5,6,7,-1,-2,-3,-4,-5,-6,-7]){
    choose('error-axis',axis);choose('error-delta',String(delta));const scenario=data.scenarios.find(s=>s.axis===axis&&s.deltaCm===delta);
    assert.equal($('error-quick-summary').querySelectorAll('.quick-main').length,1);
    assert.equal($('error-quick-summary').querySelector('.quick-main').textContent,scenario.summary.total.samePct.toFixed(2)+'%');
    assert.equal($('error-range-summary').querySelectorAll('tbody tr').length,8);
  }
  choose('error-axis','both');choose('error-delta','1');assert.equal($('error-quick-summary').querySelector('.quick-main').textContent,'79.56%');
  const defaultSummary=$('error-quick-summary').textContent;change('error-result','Same');assert.equal($('error-quick-summary').textContent,defaultSummary);change('error-result','all');
  choose('error-gender','male');choose('error-category','skirts');assert.ok($('error-quick-summary').textContent.includes('No matching products or people'));
  choose('error-gender','female');assert.ok($('error-quick-summary').textContent.includes('224 people · 30 products · 6,720 checks'));
  const selectedPairs=data.pairs.map((pair,index)=>({pair,index})).filter(({pair})=>data.people[pair[0]].gender==='female'&&data.products[pair[1]].groupId==='female-skirts');
  const scenario=data.scenarios.find(s=>s.axis==='both'&&s.deltaCm===1),eligible=selectedPairs.filter(({index})=>scenario.sizeIndices[index]>=-1),same=eligible.filter(({pair,index})=>scenario.sizeIndices[index]===pair[3]);
  assert.equal($('error-quick-summary').querySelector('.quick-main').textContent,(100*same.length/eligible.length).toFixed(2)+'%');
  choose('error-gender','all');choose('error-category','all');
  $('error-copy').click();await new Promise(resolve=>setImmediate(resolve));assert.equal($('error-copy').textContent,'✓ Copied');
  assert.ok(clipboard.includes('All 44,800 checks across all 45 scenarios'));for(const label of ['both +1 cm','both -2 cm','waist +7 cm','hips -7 cm','W44800'])assert.ok(clipboard.includes(label));
  assert.ok(!/\b(Aiad|trained model|model predictions|extra error|chest|underbust|thigh)\b/i.test(clipboard));const errorCopiedCharacters=clipboard.length;
  choose('error-delta','0');assert.equal($('error-quick-summary').querySelector('.quick-main').textContent,'100.00%');assert.ok($('error-quick-summary').textContent.includes('unchanged baseline'));assert.equal($('error-copy').textContent,'Share with ChatGPT');
  $('error-delta-trigger').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal($('error-delta-trigger').getAttribute('aria-expanded'),'true');$('error-delta-listbox').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal($('error-delta-trigger').getAttribute('aria-expanded'),'false');
  choose('error-delta','1');const expectedErrorView=$('error-quick-summary').textContent;
  $('tab-cohort').click();change('cohort-result','Same');assert.ok($('cohort-count').textContent.startsWith('15,218'));choose('cohort-table-model','aiad');assert.ok($('cohort-count').textContent.startsWith('15,739'));
  const fullMeasurementText=$('model-measurement-errors').textContent;
  choose('cohort-gender','female');assert.ok($('model-measurement-errors').textContent.includes('223 people'));assert.ok($('model-measurement-errors').textContent.includes('224 people'));assert.notEqual($('model-measurement-errors').textContent,fullMeasurementText);
  choose('cohort-gender','all');assert.equal($('model-measurement-errors').textContent,fullMeasurementText);
  $('cohort-copy').click();await new Promise(resolve=>setImmediate(resolve));assert.equal($('cohort-copy').textContent,'✓ Copied');assert.ok(clipboard.includes('W44800'));assert.ok(clipboard.includes('Middle error (median)'));assert.ok(clipboard.includes('One real example from these checks'));const cohortCopiedCharacters=clipboard.length;
  $('tab-original').click();$('share-chatgpt').click();await new Promise(resolve=>setImmediate(resolve));assert.equal($('share-chatgpt').textContent,'✓ Copied');assert.ok(clipboard.includes('D100'));assert.ok(!clipboard.includes('All 44,800'));const originalCopiedCharacters=clipboard.length;dom.window.close();
  // Prove the real-tape view does not consume saved model predictions or sizes.
  for(const person of data.people)for(const model of ['aiad','v8'])person.predictions[model]={waist:-999,hips:9999};
  for(const pair of data.pairs)for(const col of [4,5])if(pair[col])pair[col][0]=-1;
  const altered=html.replace(/(<script id="expanded-report-data" type="application\/json">)[\s\S]*?(<\/script>)/,(_,open,close)=>open+JSON.stringify(data).replaceAll('<','\\u003c')+close);
  const independent=new JSDOM(altered,options);assert.equal(independent.window.document.getElementById('error-quick-summary').textContent,expectedErrorView);independent.window.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,people:448,products:200,pairs:44800,realTapeScenarios:45,allScenariosVerified:true,modelPredictionsNotUsed:true,summaryDenominatorsVerified:true,errorCopiedCharacters,cohortCopiedCharacters,originalCopiedCharacters,jsdomErrors:errors}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
