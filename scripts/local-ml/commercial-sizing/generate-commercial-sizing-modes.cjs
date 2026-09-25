#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {sha256,pct,quantile}=require('./commercial-sizing-core.cjs');
const {buildReportShareText}=require('./report-share-text.cjs');
const {controlsCss,installReportControls}=require('./report-controls.cjs');
const {productSizeGap}=require('./product-size-gap.cjs');
const {buildGapEngine,createGapSimulation}=require('./gap-simulation.cjs');
const {summarizeModelMeasurements}=require('./model-measurement-summary.cjs');
const {stretchEvidence}=require('./generate-commercial-sizing-report.cjs');
const ROOT=path.resolve(__dirname,'../../..');
const benchmark=require(path.resolve(ROOT,'../primeStyleAI-backend/scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));
const esc=value=>String(value??'N/A').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=value=>value==null?'N/A':Number(value).toFixed(2);
const integer=value=>Number(value).toLocaleString('en-US');
const json=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const section=(title,body)=>`<section class="section"><h2>${esc(title)}</h2>${body}</section>`;

function interpretCohort(report){
  const personMap=new Map(report.people.map(p=>[p.scanId,p]));
  const productMap=new Map(report.products.map(p=>[p.id,p]));
  const byPerson=report.people.map(p=>({scanId:p.scanId,gender:p.gender,n:0,aiad:0,v8:0}));
  const counts=new Map(byPerson.map(p=>[p.scanId,p]));
  for(const row of report.decisions.aiad){const c=counts.get(row.personScanId);c.n++;if(row.result==='Exact')c.aiad++;}
  for(const row of report.decisions.v8)if(row.result==='Exact')counts.get(row.personScanId).v8++;
  const groups={};
  for(const model of ['aiad','v8'])for(const row of report.decisions[model]){
    const p=personMap.get(row.personScanId),product=productMap.get(row.productId);
    for(const key of [p.gender,product.category,`BMI: ${p.bmiBand}`]){
      groups[key] ||= {aiad:{n:0,exact:0},v8:{n:0,exact:0}};
      groups[key][model].n++;if(row.result==='Exact')groups[key][model].exact++;
    }
  }
  let seed=0x73c81529;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const strata=['female','male'].map(g=>byPerson.filter(p=>p.gender===g));
  const samples={aiad:[],v8:[],difference:[]};
  for(let iteration=0;iteration<2000;iteration++){
    let n=0,a=0,v=0;
    for(const stratum of strata)for(let i=0;i<stratum.length;i++){const p=stratum[Math.floor(random()*stratum.length)];n+=p.n;a+=p.aiad;v+=p.v8;}
    samples.aiad.push(100*a/n);samples.v8.push(100*v/n);samples.difference.push(100*(v-a)/n);
  }
  const intervals=Object.fromEntries(Object.entries(samples).map(([key,values])=>[key,{low:quantile(values,.025),high:quantile(values,.975)}]));
  return {groups,byPerson,intervals,method:'2,000 fixed-seed bootstrap samples, resampling whole people within gender. All product decisions for a sampled person stay together. Intervals describe person-sampling uncertainty for these fixed products.'};
}

function buildData(report,manifest,errorReport){
  const policy=benchmark.loadLivePolicy();assert.deepEqual(policy.hashes,report.sources.sizingPolicyHashes);
  const manifestProducts=new Map(manifest.products.map(p=>[p.product.styleRagId,p]));
  for(const p of report.products)assert.deepEqual(p.chart,manifestProducts.get(p.id).chart);
  assert.equal(report.opportunities.length,manifest.opportunities.length);
  report.opportunities.forEach((slot,index)=>{for(const key of ['decisionId','personScanId','productId','status','referenceSizeIndex'])assert.deepEqual(slot[key],manifest.opportunities[index][key]);});
  const fullProducts=new Map(manifest.products.map(p=>[p.product.styleRagId,p.product]));
  const products=report.products.map(p=>{
    const raw=fullProducts.get(p.id),suffix=raw.sourceProductId||p.id.split(':').at(-1);
    return {...p,primarySizing:policy.recommendation.slotPrimaryFields(raw),sizeGaps:Object.fromEntries(['waist','hips'].map(measurement=>[measurement,productSizeGap(p.chart,measurement)])),url:`https://preview.myaifitting.com/dashboard/ai-stylist/product/${encodeURIComponent(policy.slug.aiStylistProductSlug(p.title)+'--'+suffix)}`,
      sourceUrl:raw.sizeGuide.sourceUrl||null,supplier:raw.raw?.supplierProvider||raw.brand||'Unknown',material:raw.material||'Unknown',stretch:stretchEvidence(raw)};
  });
  const people=report.people.map(({imagePath,imageSha256,...p})=>p);
  const personIndices=new Map(people.map((p,i)=>[p.scanId,i])),productIndices=new Map(products.map((p,i)=>[p.id,i]));
  const decisionMaps=Object.fromEntries(['aiad','v8'].map(model=>[model,new Map(report.decisions[model].map(row=>[row.decisionId,row]))]));
  const pack=(row,product)=>{
    if(!row)return null;
    const index=row.predictedSize==null?-1:product.chart.orderedSizes.findIndex(size=>policy.recommendation.purchasableSize(row.predictedSize,[size]));
    if(row.predictedSize!=null)assert.ok(index>=0,'Predicted size missing from frozen chart');
    return [index,row.confidence.label,row.nearestBoundary?.distanceCm??null,row.nearestBoundary?.measurement??null,row.adjacentGap?.cm??null,row.gapErrorRatio?.display??null,row.confidence.ratio??null,row.dataQualityFlag.join('; ')];
  };
  const pairs=report.opportunities.map(slot=>{const pi=productIndices.get(slot.productId),product=products[pi];return [personIndices.get(slot.personScanId),pi,slot.status,slot.referenceSizeIndex,pack(decisionMaps.aiad.get(slot.decisionId),product),pack(decisionMaps.v8.get(slot.decisionId),product),slot.decisionId];});
  return {reportId:report.reportId,people,products,pairs,scenarios:errorReport.scenarios,scope:report.scope};
}

function productAppendix(products){
  const range=r=>!r?'N/A':r.min===r.max?String(r.min):`${r.min}–${r.max}`;
  return products.map((p,i)=>`<details class="product-chart"><summary>${i+1}. ${esc(p.title)}</summary><p>${esc(p.category)} · ${esc(p.supplier)} · ${esc(p.id)}</p><p><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Open in MyAIFitting</a>${p.sourceUrl?` · <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Original size-chart source</a>`:''}</p><p>Material: ${esc(p.material)} · Stretch: ${esc(p.stretch.join('; ')||'Not recorded')}</p><p>Frozen purchasable sizes: ${esc(p.chart.orderedSizes.join(', '))}. Chart basis: ${esc(p.chart.basis)}. Original unit: ${esc(p.chart.sourceUnit)}.</p>${table(['Size','Waist cm','Hip cm'],p.chart.orderedSizes.map(size=>[size,range(p.chart.valuesBySizeCm[size]?.waist),range(p.chart.valuesBySizeCm[size]?.hips)]))}<p class="provenance">Chart SHA-256: ${esc(p.chart.chartSha256)}</p></details>`).join('');
}

function cohortPanel(report,derived){
  const cards=['aiad','v8'].map(model=>{const s=report.summaries[model],o=s.outcomes;return `<article class="model-card"><p class="eyebrow">${model==='v8'?'Our trained model':'Aiad'}</p><h2>${fmt(o.exact.pct)}% exact same size</h2><p>${integer(o.exact.count)} / ${integer(s.denominator)} scorable decisions</p><div class="metric-grid"><div><strong>${fmt(o.withinOneSize.pct)}%</strong><span>Exact or one size away</span></div><div><strong>${fmt(o.severe.pct)}%</strong><span>Two or more sizes wrong</span></div><div><strong>${fmt(o.noRecommendation.pct)}%</strong><span>No recommendation</span></div><div><strong>${fmt(s.exactOfAllAttemptedPct)}%</strong><span>Exact / all 44,800 attempts</span></div></div><p>95% interval across people: ${fmt(derived.intervals[model].low)}–${fmt(derived.intervals[model].high)}%.</p></article>`;}).join('');
  const groups=Object.entries(derived.groups).map(([name,g])=>[name,integer(g.aiad.n),`${g.aiad.exact} / ${g.aiad.n}`,`${fmt(pct(g.aiad.exact,g.aiad.n))}%`,`${g.v8.exact} / ${g.v8.n}`,`${fmt(pct(g.v8.exact,g.v8.n))}%`]);
  const measurements=['aiad','v8'].flatMap(model=>['waist','hips'].map(measure=>{const s=report.summaries[model].measurementStats[measure];return [model==='v8'?'Our trained model':'Aiad',measure==='hips'?'Hip':'Waist',s.count,fmt(s.maeCm),fmt(s.medianAbsoluteErrorCm),fmt(s.p90AbsoluteErrorCm),fmt(s.within1_27CmPct)+'%',fmt(s.within2_54CmPct)+'%',fmt(s.within4CmPct)+'%',fmt(s.worstAbsoluteErrorCm)];}));
  const safe=report.analysis.models.aiad.safeSizing;
  const buckets=key=>report.analysis.models.aiad[key].map((a,i)=>{const v=report.analysis.models.v8[key][i];return [a.label,`${a.exact} / ${a.count}`,fmt(a.exactPct)+'%',`${v.exact} / ${v.count}`,fmt(v.exactPct)+'%'];});
  return `<header class="hero"><p class="eyebrow">Measured model results · waist and hip only</p><h1>448 people · 200 products</h1><p class="hero-copy">224 women × 100 women’s products + 224 men × 100 men’s products = 44,800 size checks per model.</p><p>Women: 40 pants, 30 shorts, 30 skirts. Men: 60 pants, 40 shorts.</p></header><div class="toolbar"><span id="cohort-copy-status" class="share-status" role="status"></span><button class="btn" id="cohort-copy">Share with ChatGPT</button></div>
  ${section('How to read this result',`<p><strong>Same size means exactly the same label.</strong> “Within one size” also includes the neighbouring size.</p><p>${integer(report.scope.scorableDecisionsPerModel)} checks have a valid recorded-measurement reference. ${integer(report.scope.unscorableDecisionsPerModel)} do not: 16,305 have no stocked reference size and 196 lack a required measurement. They are not counted as correct. ${report.scope.peopleWithScorableDecisions} of 448 people have at least one scorable product.</p><p>Our model’s 53.78% exact agreement is below Aiad’s 55.62% in this larger test. The original 49% versus 43% was a different, smaller set.</p><p><strong>Engineering conclusion: NO — readiness for customer sizing is not established.</strong> The charts describe garment measurements, and actual fit or keep/return outcomes have not been tested.</p>`)}
  <section class="section"><div class="model-grid">${cards}</div></section>
  ${section('Results by gender, product category and body-size group',table(['Group','Scorable','Aiad exact','Aiad %','Our model exact','Our model %'],groups))}
  ${section('Measurement errors',table(['Model','Measurement','People','MAE cm','Median cm','P90 cm','Within 1.27 cm','Within 2.54 cm','Within 4 cm','Worst cm'],measurements))}
  ${section('Confidence and safe sizing',`<p>Aiad issued ${safe.highIssued} High-labelled sizes; ${safe.highExact} were exact (${fmt(safe.highIssuedExactPct)}%). That is ${fmt(safe.highIssuedCoveragePct)}% of scorable decisions. ${safe.highWrongByTwo} High-labelled recommendations were two or more sizes wrong. Our trained model does not produce per-person uncertainty.</p><p>Low confidence caught ${safe.lowWrongByTwo} of ${safe.wrongByTwo} two-or-more-size errors (${fmt(safe.lowWrongByTwoCaughtPct)}%). The boundary score uses a diagnostic chart midpoint near the recorded reference, so it is not a validated confidence rule for customers.</p>`)}
  ${section('Size-chart spacing and exact agreement',table(['Adjacent chart gap','Aiad exact / total','Aiad %','Our model exact / total','Our model %'],buckets('gapGroups'))+`<p>Average adjacent spacing across distinct products: waist ${fmt(report.analysis.chartSpacing.waist.averageCm)} cm; hip ${fmt(report.analysis.chartSpacing.hips.averageCm)} cm.</p>`)}
  ${section('Distance from a diagnostic size boundary',table(['Distance','Aiad exact / total','Aiad %','Our model exact / total','Our model %'],buckets('boundaryGroups')))}
  ${section('All 44,800 product checks',`<p>Filter by person, product or result. Full sharing includes every row, even when the table is filtered.</p><div class="filters"><label>Gender<select id="cohort-gender"><option value="all">All</option><option value="female">Women</option><option value="male">Men</option></select></label><label>Our model result<select id="cohort-result"><option value="all">All</option><option>Same</option><option>Up</option><option>Down</option><option>Unavailable</option><option>Not scorable</option></select></label><label>Person or product<input id="cohort-search" placeholder="Search name or ID"></label></div><p id="cohort-count"></p><div class="table-wrap"><table id="cohort-decisions"><thead><tr>${['Person','Product','Recorded waist / hip','Our waist / hip','Reference size','Aiad size','Our size','Aiad result','Our result'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody></tbody></table></div><div class="pager"><button class="btn" id="cohort-prev">Previous</button><span id="cohort-page"></span><button class="btn" id="cohort-next">Next</button></div>`)}
  ${section('Evidence and limits',`<p>Fresh CPU inference completed for all 448 people. Replaying the original 100 checks reproduced both models’ original results exactly. The same frozen sizing code and charts were used for both models.</p><p>Saved records mark the 448 subjects test-only and the model runtime declares zero used for training. These people have been evaluated before; this is not a new blind test. The installed model package does not contain the original training subject list.</p><p>${esc(derived.method)} The 95% interval for our model minus Aiad is ${fmt(derived.intervals.difference.low)} to ${fmt(derived.intervals.difference.high)} percentage points. This does not establish a reliable winner across future products and customers.</p><p>Clean WEAR renders were used. Ordinary phone photos, actual garment fit and the 15-person purchase/keep test remain untested. Apple / Depth Pro: OFF.</p><p class="provenance">Report: ${esc(report.reportId)}<br>Manifest SHA-256: ${esc(report.sources.manifestSha256)}<br>Model SHA-256: ${esc(report.sources.model.modelSha256)}</p>`)}
  `;
}

function errorPanel(errors){
  const axes={both:'Waist and hip together',waist:'Waist only',hips:'Hip only'};
  const summaryTables=Object.entries(axes).map(([axis,label])=>section(label,table(['Error cm','Valid checks','Same size','Same %','Size up','Up %','Size down','Down %','Unavailable','Unavailable %'],errors.scenarios.filter(s=>s.axis===axis).sort((a,b)=>a.deltaCm-b.deltaCm).map(s=>{const n=s.summary.total;return [s.deltaCm>0?'+'+s.deltaCm:s.deltaCm,integer(n.eligible),integer(n.same),fmt(n.samePct)+'%',integer(n.up),fmt(n.upPct)+'%',integer(n.down),fmt(n.downPct)+'%',integer(n.unavailable),fmt(n.unavailablePct)+'%'];}))+`<p>${axis==='both'?'Both measurements move by the same signed amount.':`Charts that do not use ${axis==='hips'?'hip':'waist'} are excluded.`} These full-dataset tables use all 448 people and 200 products.</p>`)).join('');
  return `<header class="hero"><p class="eyebrow">Real WEAR tape · product size charts</p><h1>How much tape error changes the size?</h1><p class="hero-copy">Start with real measurements. Add or subtract 0–7 cm, then check the same product’s size chart again.</p></header><div class="toolbar"><span id="error-copy-status" class="share-status" role="status"></span><button class="btn" id="error-copy">Share with ChatGPT</button></div>
  ${section('How we calculate it',`<ol><li>Use a person’s recorded waist and hip to choose a reference size from the product’s frozen chart and stock.</li><li>Add the selected error to waist, hip, or both. For example: real waist 80 cm becomes 83 cm at +3 cm, or 77 cm at −3 cm.</li><li>Run the same sizing rules on that same product again. Count the result as same size, size up, size down, or unavailable.</li></ol><p><strong>0 cm is the unchanged baseline.</strong> It should reproduce the same reference size because the measurements and chart are identical. This percentage measures size stability under an imposed tape error.</p><p>All requested errors are tested, including errors larger than half an inch. We do not widen the sizing rules or alter the reference size.</p><p>448 people and 200 products give 44,800 checks per error. The 16,501 checks without a valid real-tape reference are excluded from same-size percentages. They remain visible in the full results.</p><p><strong>The current sizing rule prioritises waist.</strong> A high hip-only same-size rate can reflect that rule; it does not establish physical garment fit.</p>`)}
  ${summaryTables}
  ${section('Check individual people and products',`<div class="filters"><label>Measurement<select id="error-axis"><option value="both">Waist and hip together</option><option value="waist">Waist only</option><option value="hips">Hip only</option></select></label><label>Tape error<select id="error-delta">${[0,1,2,3,4,5,6,7,-1,-2,-3,-4,-5,-6,-7].map(d=>`<option value="${d}"${d===1?' selected':''}>${d===0?'0 cm / 0 in · unchanged baseline':(d>0?'+':'')+d+' cm ≈ '+(d>0?'+':'')+(d/2.54).toFixed(2)+' in'}</option>`).join('')}</select></label><label>Gender<select id="error-gender"><option value="all">All</option><option value="female">Women</option><option value="male">Men</option></select></label><label>Result<select id="error-result"><option value="all">All</option><option>Same</option><option>Up</option><option>Down</option><option>Unavailable</option><option>Not scorable</option><option>Unaffected chart</option></select></label><label>Person or product<input id="error-search" placeholder="Search name or ID"></label></div><p id="error-count"></p><div class="table-wrap"><table id="error-decisions"><thead><tr>${['Person','Product','Real waist / hip','Waist / hip after error','Size from real tape','Size after error','Result'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody></tbody></table></div><div class="pager"><button class="btn" id="error-prev">Previous</button><span id="error-page"></span><button class="btn" id="error-next">Next</button></div>`)}
  ${section('Test scope',`<p>${errors.scenarios.length} scenarios: ${errors.scenarios.filter(s=>s.deltaCm!==0).length} positive or negative errors and three unchanged baselines. This tests waist separately, hip separately, and both moving in the same direction. Opposite waist/hip directions together are not included.</p><p>This measures size-chart decisions under the current sizing rules. Actual garment comfort or fit has not been tested. Charts describe garment measurements rather than certified body ranges.</p><p class="provenance">Source manifest SHA-256: ${esc(errors.plan.manifestSha256)}<br>Calculation date: ${esc(errors.createdAt)}</p>`)}
  `;
}

function client(){
  const data=JSON.parse(document.getElementById('expanded-report-data').textContent);
  const reportControls=window.installReportControls(data);
  const gapSimulation=window.createGapSimulation(data,window.gapSizing);
  const gapCache=new Map();
  let errorData=data,errorRenderToken=0,pendingGap=null;
  const $=id=>document.getElementById(id),pages={cohort:0,error:0},copyVersions={cohort:0,error:0},pageSize=100;
  const clearCopy=mode=>{copyVersions[mode]++;$(mode+'-copy').textContent='Share with ChatGPT';$(mode+'-copy-status').textContent='';};
  const esc=v=>String(v??'N/A').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fmt=v=>v==null?'N/A':Number(v).toFixed(2);
  const tape=v=>fmt(v.waist)+' / '+fmt(v.hips)+' cm';
  const size=(pair,index)=>Number.isInteger(index)&&index>=0?data.products[pair[1]].chart.orderedSizes[index]:'N/A';
  const result=(pair,index)=>index===-3?'Unaffected chart':index===-2?'Not scorable':index<0?'Unavailable':index===pair[3]?'Same':index>pair[3]?'Up':'Down';
  const modelResult=(pair,which)=>pair[which]?result(pair,pair[which][0]):'Not scorable';
  const link=product=>'<a href="'+esc(product.url)+'" target="_blank" rel="noopener noreferrer">'+esc(product.title)+'</a>';
  function setMode(mode){
    reportControls.closeAll();
    for(const name of ['original','cohort','error']){$('mode-'+name).hidden=name!==mode;$('tab-'+name).setAttribute('aria-selected',String(name===mode));}
    $('shared-products').hidden=mode==='original'||(mode==='error'&&reportControls.getGapRequest().active);
    location.hash=mode;
  }
  for(const name of ['original','cohort','error'])$('tab-'+name).addEventListener('click',()=>setMode(name));
  function renderCohort(){
    clearCopy('cohort');
    const gender=$('cohort-gender').value,category=$('cohort-category').value,wanted=$('cohort-result').value,column=$('cohort-table-model').value==='aiad'?4:5,search=$('cohort-search').value.trim().toLowerCase();
    const baseRows=data.pairs.filter(pair=>{const p=data.people[pair[0]],product=data.products[pair[1]];return (gender==='all'||p.gender===gender)&&(category==='all'||product.groupId.endsWith('-'+category))&&(!search||(p.scanId+' '+product.title+' '+product.id).toLowerCase().includes(search));});
    reportControls.renderCohort(baseRows);
    const rows=baseRows.filter(pair=>wanted==='all'||modelResult(pair,column)===wanted);
    const max=Math.max(0,Math.ceil(rows.length/pageSize)-1);pages.cohort=Math.min(pages.cohort,max);
    $('cohort-count').textContent=rows.length.toLocaleString()+' matching product checks / '+data.pairs.length.toLocaleString()+' total';
    $('cohort-decisions').querySelector('tbody').innerHTML=rows.slice(pages.cohort*pageSize,(pages.cohort+1)*pageSize).map(pair=>{const p=data.people[pair[0]],product=data.products[pair[1]];return '<tr><td>'+esc(p.scanId)+'</td><td>'+link(product)+'</td>'+[tape(p.actuals),tape(p.predictions.v8),size(pair,pair[3]),size(pair,pair[4]?.[0]??-2),size(pair,pair[5]?.[0]??-2),modelResult(pair,4),modelResult(pair,5)].map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>';}).join('');
    $('cohort-page').textContent='Page '+(pages.cohort+1)+' of '+(max+1);$('cohort-prev').disabled=pages.cohort===0;$('cohort-next').disabled=pages.cohort===max;
  }
  async function renderError(){
    const token=++errorRenderToken;
    clearCopy('error');
    const axis=$('error-axis').value,delta=Number($('error-delta').value),request=reportControls.getGapRequest();
    $('mode-error').classList.toggle('is-simulation',request.active);
    if(!$('mode-error').hidden)$('shared-products').hidden=request.active;
    $('mode-error').querySelector('.hero .eyebrow').textContent=request.active?'Real WEAR tape · made-up chart simulation':'Real WEAR tape · product size charts';
    const waiting=message=>{$('error-copy').disabled=true;$('error-quick-summary').innerHTML='<p class="simulation-label">'+esc(message)+'</p>';$('error-decisions').querySelector('tbody').innerHTML='';$('error-count').textContent='';$('error-simulated-charts').hidden=true;};
    if(request.active){
      if(!request.applied){if(pendingGap)pendingGap.cancelled=true;waiting('Choose a made-up gap, then click Run gap test.');return;}
      const key=[request.applied.gapCm,request.applied.gapAxis,axis].join(':');
      if(!gapCache.has(key)){
        waiting('Calculating sizes using the made-up chart…');
        if(pendingGap?.key!==key||pendingGap.cancelled){
          if(pendingGap)pendingGap.cancelled=true;
          const job={key,cancelled:false};pendingGap=job;
          job.promise=gapSimulation.run({...request.applied,errorAxis:axis,cancelled:()=>job.cancelled,onProgress:(done,total)=>{if(pendingGap===job&&!job.cancelled)$('error-gap-status').textContent='Calculating: '+done.toLocaleString()+' / '+total.toLocaleString()+' product checks, at all 15 errors.';}}).then(result=>{if(result){gapCache.set(key,result);if(gapCache.size>3)gapCache.delete(gapCache.keys().next().value);}return result;});
        }
        try{await pendingGap.promise;}catch(error){if(token===errorRenderToken){$('error-gap-status').textContent='Could not calculate this gap: '+error.message;waiting('The gap test did not finish. No result is being shown.');}return;}
        if(token!==errorRenderToken||!gapCache.has(key))return;
      }
      errorData=gapCache.get(key);
      $('error-gap-status').textContent='Finished. All 15 errors for '+({both:'waist and hip together',waist:'waist only',hips:'hip only'}[axis])+' have been calculated.';
      renderSimulationCharts(errorData);
    }else{if(pendingGap)pendingGap.cancelled=true;errorData=data;$('error-simulated-charts').hidden=true;}
    $('error-copy').disabled=false;
    const scenario=errorData.scenarios.find(s=>s.axis===axis&&s.deltaCm===delta);
    const gender=$('error-gender').value,category=$('error-category').value,wanted=$('error-result').value,search=$('error-search').value.trim().toLowerCase();
    const baseRows=errorData.pairs.map((pair,index)=>({pair,index})).filter(({pair})=>{const p=data.people[pair[0]],product=data.products[pair[1]];return (gender==='all'||p.gender===gender)&&(category==='all'||product.groupId.endsWith('-'+category))&&(!search||(p.scanId+' '+product.title+' '+product.id).toLowerCase().includes(search));});
    reportControls.renderError(baseRows,scenario,errorData);
    const rows=baseRows.filter(({pair,index})=>wanted==='all'||result(pair,scenario.sizeIndices[index])===wanted);
    const max=Math.max(0,Math.ceil(rows.length/pageSize)-1);pages.error=Math.min(pages.error,max);
    $('error-count').textContent=rows.length.toLocaleString()+' matching product checks / '+data.pairs.length.toLocaleString()+' total';
    $('error-decisions').querySelector('tbody').innerHTML=rows.slice(pages.error*pageSize,(pages.error+1)*pageSize).map(({pair,index})=>{const p=data.people[pair[0]],product=data.products[pair[1]],changed={...p.actuals};for(const field of ['waist','hips'])if(changed[field]!=null&&(axis==='both'||axis===field))changed[field]+=delta;return '<tr><td>'+esc(p.scanId)+'</td><td>'+link(product)+'</td>'+[tape(p.actuals),tape(changed),size(pair,pair[3]),size(pair,scenario.sizeIndices[index]),result(pair,scenario.sizeIndices[index])].map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>';}).join('');
    $('error-page').textContent='Page '+(pages.error+1)+' of '+(max+1);$('error-prev').disabled=pages.error===0;$('error-next').disabled=pages.error===max;
  }
  function renderSimulationCharts(active){
    const container=$('error-simulated-charts');container.hidden=false;
    if(container.dataset.key===active.simulation.gapCm+':'+active.simulation.gapAxis)return;
    container.dataset.key=active.simulation.gapCm+':'+active.simulation.gapAxis;
    const range=value=>!value?'N/A':(value.min===value.max?fmt(value.min):fmt(value.min)+'–'+fmt(value.max))+' cm / '+(value.min===value.max?fmt(value.min/2.54):fmt(value.min/2.54)+'–'+fmt(value.max/2.54))+' in';
    container.innerHTML='<h2>Made-up size charts used in this test</h2><p>This is a simulation. The first available measured size in each product stays fixed. Each following available size moves by the chosen gap. Original range widths and missing measurements are kept. Real tape chooses a new starting size in this made-up chart; the selected error is then tested against that same chart. These results do not show actual garment fit.</p>'+active.products.map((product,index)=>'<details class="simulated-product-chart"><summary>'+(index+1)+'. '+esc(product.title)+'</summary><p>'+link(product)+'</p><div class="table-wrap"><table><thead><tr><th>Size</th><th>Waist (cm / in)</th><th>Hip (cm / in)</th></tr></thead><tbody>'+product.chart.orderedSizes.map(size=>'<tr><td>'+esc(size)+'</td><td>'+range(product.chart.valuesBySizeCm[size]?.waist)+'</td><td>'+range(product.chart.valuesBySizeCm[size]?.hips)+'</td></tr>').join('')+'</tbody></table></div></details>').join('');
  }
  for(const id of ['cohort-gender','cohort-category','cohort-table-model','cohort-result','cohort-search'])$(id).addEventListener(id.endsWith('search')?'input':'change',()=>{pages.cohort=0;renderCohort();});
  for(const id of ['error-axis','error-delta','error-gender','error-category','error-result','error-search'])$(id).addEventListener(id.endsWith('search')?'input':'change',()=>{pages.error=0;renderError();});
  document.addEventListener('report-gap-change',()=>{pages.error=0;renderError();});
  for(const name of ['cohort','error'])for(const direction of ['prev','next'])$(name+'-'+direction).addEventListener('click',()=>{pages[name]+=direction==='next'?1:-1;(name==='cohort'?renderCohort:renderError)();});
  const mdTable=(headers,rows)=>{const cell=v=>String(v??'N/A').replaceAll('|','\\|').replace(/\s+/g,' ');return '\n| '+headers.map(cell).join(' | ')+' |\n| '+headers.map(()=>'---').join(' | ')+' |\n'+rows.map(row=>'| '+row.map(cell).join(' | ')+' |').join('\n')+'\n';};
  function fullText(mode){
    const fullData=mode==='error'?errorData:data;
    const root=$('mode-'+mode).cloneNode(true);
    for(const node of root.querySelectorAll('.filters,.quick-controls,.gap-controls,.gap-custom-inputs,.quick-table-filters,.quick-table-note,.custom-select,.pager,#cohort-decisions,#error-decisions,#cohort-count,#error-count,#error-group-summary'))node.remove();
    if(!fullData.simulation)root.appendChild($('shared-products').cloneNode(true));
    if(fullData.simulation)for(const node of root.querySelectorAll('.real-chart-only'))node.remove();
    else root.querySelector('#error-simulated-charts')?.remove();
    const narrative=window.commercialShareText({querySelector:()=>root},{decisions:{aiad:[],v8:[]}});
    if(mode==='cohort')return narrative+'\n\n## All 44,800 product checks\n'+mdTable(['Decision','Person','Gender','Product','Product link','Chart source','Recorded waist','Recorded hip','Aiad waist','Aiad hip','Our waist','Our hip','Reference status','Reference size','Aiad size','Our size','Aiad result','Our result','Aiad confidence','Aiad boundary distance cm','Our boundary distance cm','Waist sigma cm','Hip sigma cm'],data.pairs.map(pair=>{const p=data.people[pair[0]],product=data.products[pair[1]];return [pair[6],p.scanId,p.gender,product.title,product.url,product.sourceUrl,p.actuals.waist,p.actuals.hips,p.predictions.aiad.waist,p.predictions.aiad.hips,p.predictions.v8.waist,p.predictions.v8.hips,pair[2],size(pair,pair[3]),size(pair,pair[4]?.[0]??-2),size(pair,pair[5]?.[0]??-2),modelResult(pair,4),modelResult(pair,5),pair[4]?.[1],pair[4]?.[2],pair[5]?.[2],p.sigma.waist,p.sigma.hips];}));
    const scenarios=fullData.scenarios;
    const summaryRows=scenarios.flatMap(s=>Object.entries(s.summary.byGender).map(([g,n])=>[s.axis,s.deltaCm,g,n.eligible,n.same,n.samePct,n.up,n.down,n.unavailable,n.notScorable,n.unaffected]));
    const categoryRows=scenarios.flatMap(s=>Object.entries(s.summary.byCategory).map(([g,n])=>[s.axis,s.deltaCm,g,n.eligible,n.same,n.samePct,n.up,n.down,n.unavailable,n.notScorable,n.unaffected]));
    return narrative+'\n\n## '+(fullData.simulation?'Made-up size-gap simulation':'Complete real-tape error test')+'\nEach error is applied to recorded WEAR measurements. Full data below includes all people and products, regardless of quick-report filters.\n\n## Every error by gender\n'+mdTable(['Measurement','Error cm','Gender','Valid checks','Same','Same %','Up','Down','Unavailable','No reference','Unused measurement'],summaryRows)+'\n## Every error by category\n'+mdTable(['Measurement','Error cm','Category','Valid checks','Same','Same %','Up','Down','Unavailable','No reference','Unused measurement'],categoryRows)+'\n\n## All 44,800 checks across all '+scenarios.length+' scenarios\nEach cell gives the product size and movement relative to the size from real tape'+(fullData.simulation?' in the same made-up chart':'')+'.\n'+mdTable(['Decision','Person','Product','Product link','Real waist cm','Real hip cm','Reference status','Size from real tape',...scenarios.map(s=>s.axis+' '+(s.deltaCm>0?'+':'')+s.deltaCm+' cm')],fullData.pairs.map((pair,index)=>{const p=data.people[pair[0]],product=data.products[pair[1]];return [pair[6],p.scanId,product.title,product.url,p.actuals.waist,p.actuals.hips,pair[2],size(pair,pair[3]),...scenarios.map(s=>size(pair,s.sizeIndices[index])+' ('+result(pair,s.sizeIndices[index])+')')];}));

  }
  for(const mode of ['cohort','error'])$(mode+'-copy').addEventListener('click',async()=>{
    const button=$(mode+'-copy'),status=$(mode+'-copy-status'),version=copyVersions[mode];button.textContent='Copying…';
    try{const text=fullText(mode);await navigator.clipboard.writeText(text);if(version===copyVersions[mode]){button.textContent='✓ Copied';status.textContent='Copied your summary, all tables, product charts and complete results for this test type. Paste into ChatGPT.';}else{button.textContent='Share with ChatGPT';status.textContent='The earlier selection was copied. Click again to copy your new selection.';}}
    catch(error){button.textContent='Share with ChatGPT';status.textContent='Copy the report text in the window.';$('expanded-copy-text').value=fullText(mode);$('expanded-copy-dialog').showModal();$('expanded-copy-text').select();}
  });
  $('expanded-copy-close').addEventListener('click',()=>$('expanded-copy-dialog').close());
  renderCohort();renderError();setMode(['original','cohort','error'].includes(location.hash.slice(1))?location.hash.slice(1):'error');
}

function buildModes(originalHtml,report,manifest,errors){
  assert.equal(report.scope.attemptedDecisionsPerModel,44800);assert.equal(errors.scenarios.length,45);
  assert.equal(errors.plan.manifestSha256,report.sources.manifestSha256);
  const derived=interpretCohort(report),data=buildData(report,manifest,errors);
  for(const scenario of data.scenarios)assert.equal(scenario.sizeIndices.length,data.pairs.length);
  let html=originalHtml.replace('<title>Waist/Hip 100-Decision Commercial Validation · PrimeStyleAI</title>','<title>Waist/Hip Sizing Reports · PrimeStyleAI</title>');
  html=html.replace('</style>','[hidden]{display:none!important}.report-modes{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px}.report-modes button[aria-selected="true"]{background:#145c43;color:white}.pager{display:flex;align-items:center;gap:14px;margin-top:14px}.btn:disabled{opacity:.4;cursor:default}#mode-cohort .eyebrow{color:#145c43}#mode-cohort .hero .eyebrow{color:#73d3aa}#mode-error .section h2,#mode-cohort .section h2{margin-bottom:14px}#error-group-summary{padding:15px;background:#e7f3ec;border-radius:12px;margin:15px 0}table a{color:#145c43}.expanded-copy textarea{width:100%;height:55vh}.expanded-copy{padding:24px}</style>');
  html=html.replace('</style>',controlsCss+'</style>');
  html=html.replace('<main class="shell">','<main class="shell"><p class="mode-picker-label">Choose a report</p><nav class="report-modes" role="tablist" aria-label="Report mode"><button class="btn" role="tab" id="tab-cohort" aria-controls="mode-cohort"><span>Aiad vs our model</span><small>448 people · 200 products</small></button><button class="btn" role="tab" id="tab-error" aria-controls="mode-error"><span>Tape error test</span><small>Real tape · ±0–7 cm</small></button><button class="btn" role="tab" id="tab-original" aria-controls="mode-original"><span>Original small test</span><small>10 people</small></button></nav><div id="mode-original" role="tabpanel" aria-labelledby="tab-original" hidden>');
  html=html.replace('</main>',`</div><div id="mode-cohort" role="tabpanel" aria-labelledby="tab-cohort" hidden>${cohortPanel(report,derived)}</div><div id="mode-error" role="tabpanel" aria-labelledby="tab-error">${errorPanel(errors)}</div><section class="section" id="shared-products"><h2>All 200 products and size charts</h2><p>The saved charts and stock are the evidence used in both new modes. MyAIFitting links may require sign-in; current product pages may differ from the frozen snapshot.</p>${productAppendix(data.products)}</section></main>`);
  assert.ok(html.includes("return walk(document.querySelector('main'))"));
  html=html.replace("return walk(document.querySelector('main'))","return walk(document.querySelector('#mode-original') || document.querySelector('main'))");
  html=html.replace('</body>',`<dialog id="expanded-copy-dialog" class="expanded-copy"><h2>Copy the full report</h2><p>Press Command+C or Ctrl+C to copy.</p><textarea id="expanded-copy-text" aria-label="Complete report text" readonly></textarea><button class="btn" id="expanded-copy-close">Close</button></dialog><script id="expanded-report-data" type="application/json">${json(data)}</script><script>window.gapSizing=${buildGapEngine(report.sources.sizingPolicyHashes)};window.createGapSimulation=${createGapSimulation.toString()};window.summarizeModelMeasurements=${summarizeModelMeasurements.toString()};window.commercialShareText=${buildReportShareText.toString()};window.installReportControls=${installReportControls.toString()};(${client.toString()})();</script></body>`);
  return {html,derived,embeddedData:data};
}

function main(){
  const [originalPath,cohortPath,errorPath,output]=process.argv.slice(2);
  if(!output)throw new Error('Usage: original.html cohort-run real-tape-error-run new-output-directory');
  const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
  const report=read(path.join(cohortPath,'report.json')),manifest=read(path.join(cohortPath,'manifest.json')),errors=read(path.join(errorPath,'results.json'));
  const built=buildModes(fs.readFileSync(originalPath,'utf8'),report,manifest,errors);
  fs.mkdirSync(output,{mode:0o700});
  fs.writeFileSync(path.join(output,'waist-hip-commercial-100.html'),built.html,{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(output,'interpretation.json'),JSON.stringify(built.derived,null,2)+'\n',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(output,'publication.json'),JSON.stringify({createdAt:new Date().toISOString(),originalPath,cohortPath,errorPath,
    htmlSha256:sha256(built.html),cohortReportSha256:sha256(fs.readFileSync(path.join(cohortPath,'report.json'))),errorReportSha256:sha256(fs.readFileSync(path.join(errorPath,'results.json')))},null,2)+'\n',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(output,'SHA256SUMS.txt'),fs.readdirSync(output).sort().map(file=>sha256(fs.readFileSync(path.join(output,file)))+'  '+file).join('\n')+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({output,bytes:Buffer.byteLength(built.html),sha256:sha256(built.html),intervals:built.derived.intervals}));
}
if(require.main===module)main();
module.exports={buildModes,interpretCohort,buildData};
