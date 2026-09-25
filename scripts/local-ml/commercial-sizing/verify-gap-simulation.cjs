#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const {buildGapEngine,createGapSimulation}=require('./gap-simulation.cjs');
const benchmark=require('../../../../primeStyleAI-backend/scripts/benchmarks/aiad-catalog-size-impact-lib.cjs');

async function main(){
  const html=fs.readFileSync(process.argv[2],'utf8');
  const data=JSON.parse(html.match(/<script id="expanded-report-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const publication=JSON.parse(fs.readFileSync(path.join(path.dirname(process.argv[2]),'publication.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(publication.cohortPath,'manifest.json'),'utf8'));
  const policy=benchmark.loadLivePolicy(),source=JSON.stringify(data);
  const sizing=vm.runInNewContext(buildGapEngine(policy.hashes)),simulation=createGapSimulation(data,sizing);
  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
  for(const axis of ['both','waist','hips'])for(const product of data.products){
    const changed=simulation.makeProduct(product,2.54,axis);
    assert.deepEqual(changed.chart.orderedSizes,product.chart.orderedSizes);
    for(const field of ['waist','hips']){
      let anchor=null;
      changed.chart.orderedSizes.forEach((size,index)=>{
        const old=product.chart.valuesBySizeCm[size]?.[field],value=changed.chart.valuesBySizeCm[size]?.[field];
        if(!old){assert.equal(value,old);return;}
        if(axis!=='both'&&axis!==field){assert.deepEqual(value,old);return;}
        if(!anchor){anchor={index,center:old.center};close(value.center,old.center);}
        close(value.center,anchor.center+(index-anchor.index)*2.54);
        close(value.max-value.min,old.max-old.min);
      });
    }
  }
  let parityChecks=0;
  for(const gender of ['female','male']){
    const people=data.people.filter(p=>p.gender===gender&&p.actuals.waist&&p.actuals.hips);
    for(const person of [people[0],people[Math.floor(people.length/2)],people.at(-1)])for(const delta of [-7,0,1,7]){
      const synthetic=data.products.filter(p=>p.groupId.startsWith(gender+'-')).map(p=>simulation.makeProduct(p,3,'both'));
      const originals=new Map(manifest.products.map(p=>[p.product.styleRagId,p]));
      const products=synthetic.map(p=>({...originals.get(p.id).product,sizeGuide:{unit:'cm',...p.simulationGuide,sections:[]}}));
      const tape={...person.actuals,waist:person.actuals.waist+delta,hips:person.actuals.hips+delta};
      const recommendations=await policy.recommend(products,benchmark.profileFor({heightCm:person.heightCm,predicted:tape},'predicted'),gender,{userId:'myaifitting-ai-stylist-test'});
      const byId=new Map(recommendations.map(row=>[row.styleRagId,row]));
      for(const product of synthetic){
        const decision=benchmark.validDecision(byId.get(product.id),originals.get(product.id).inspection,policy);
        const expected=decision.ready?product.chart.orderedSizes.findIndex(size=>policy.recommendation.purchasableSize(decision.label,[size])):-1;
        assert.equal(simulation.choose(product,tape,gender),expected,product.id+' at '+delta);
        parityChecks++;
      }
    }
  }
  const full=await simulation.run({gapCm:3,gapAxis:'both',errorAxis:'both'});
  for(const scenario of full.scenarios){
    const n=scenario.summary.total;
    assert.equal(n.same+n.up+n.down+n.unavailable,n.eligible);
    assert.equal(n.eligible+n.notScorable+n.unaffected,44800);
    assert.equal(n.eligible,full.scenarios[0].summary.total.eligible);
    if(scenario.deltaCm===0){assert.equal(n.same,n.eligible);assert.equal(n.samePct,100);}
  }
  assert.equal(JSON.stringify(data),source,'Source measurements and charts were mutated');
  console.log(JSON.stringify({calculation:'passed',backendParityChecks:parityChecks,defaultGapCm:3,scenarios:full.scenarios.map(s=>({deltaCm:s.deltaCm,...s.summary.total}))}));

  let clipboard='';const errors=[];
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/report#error',virtualConsole,beforeParse(w){Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{clipboard=value;}}});}});
  const doc=dom.window.document,$=id=>doc.getElementById(id);
  const choose=(id,value)=>{$(id+'-trigger').click();const option=Array.from($(id+'-listbox').children).find(el=>el.dataset.value===value);assert.ok(option);option.click();};
  const input=value=>{$('error-gap-value').value=value;$('error-gap-value').dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  const waitFor=async predicate=>{const deadline=Date.now()+90000;while(!predicate()){assert.ok(Date.now()<deadline,'Simulation timed out: '+$('error-gap-status').textContent);await new Promise(r=>setTimeout(r,20));}};
  assert.equal(doc.querySelectorAll('#error-quick-summary .quick-outcome-help').length,3);
  for(const option of $('error-delta').options)assert.ok(option.textContent.includes('in'));
  choose('error-chart-mode','simulated');assert.equal($('error-copy').disabled,true);
  choose('error-gap-unit','in');input('1');assert.equal($('error-gap-equivalent').textContent,'2.54 cm ≈ 1 inches');
  choose('error-gap-unit','cm');assert.equal(Number($('error-gap-value').value),2.54);
  choose('error-gap-unit','in');assert.equal(Number($('error-gap-value').value),1);
  $('error-gap-run').click();await waitFor(()=>$('error-gap-status').textContent.startsWith('Finished.'));
  const inchResult=$('error-quick-summary').textContent;
  choose('error-gap-unit','cm');$('error-gap-run').click();await waitFor(()=>$('error-gap-status').textContent.startsWith('Finished.'));
  assert.equal($('error-quick-summary').textContent,inchResult,'Equivalent units changed results');
  assert.equal(doc.querySelectorAll('.simulated-product-chart').length,200);
  assert.equal($('shared-products').hidden,true);
  $('error-copy').click();await waitFor(()=>$('error-copy').textContent==='✓ Copied');
  assert.ok(clipboard.includes('All 44,800 checks across all 15 scenarios'));
  assert.ok(clipboard.includes('Made-up size charts used in this test'));
  assert.ok(clipboard.includes('first available measured size'));
  assert.ok(clipboard.includes('W44800'));
  assert.ok(!/\b(Aiad|trained model|model predictions|chest|underbust)\b/i.test(clipboard));
  assert.ok(!clipboard.includes('45 scenarios'));
  const copiedCharacters=clipboard.length;
  for(const value of ['0','-1','','1e999']){input(value);$('error-gap-run').click();assert.equal($('error-copy').disabled,true);assert.equal($('error-quick-summary').querySelector('.quick-main'),null);}
  input('3');$('error-gap-run').click();choose('error-chart-mode','real');
  await new Promise(r=>setTimeout(r,100));
  assert.equal($('error-quick-summary').querySelector('.quick-main').textContent,'79.56%');
  assert.equal($('shared-products').hidden,false);assert.equal($('error-copy').disabled,false);
  assert.deepEqual(errors,[]);dom.window.close();
  console.log(JSON.stringify({ui:'passed',unitsEquivalent:true,copyContainsSimulationAnd200Charts:true,copiedCharacters,invalidInputsRejected:true,cancellationReturnsToRealResults:true,jsdomErrors:errors}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
