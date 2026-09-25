'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const ts=require('typescript');

function buildGapEngine(expectedHashes) {
  const backend=path.resolve(__dirname,'../../../../primeStyleAI-backend');
  const benchmark=require(path.join(backend,'scripts/benchmarks/aiad-catalog-size-impact-lib.cjs'));
  const files={inline:'src/modules/sizing/inline-product-chart.ts',engine:'src/modules/sizing/sizing.deterministic.ts',helpers:'src/modules/outfit-intelligence/stylist-size-recommendation.service.ts'};
  const source=Object.fromEntries(Object.entries(files).map(([key,file])=>{
    const value=fs.readFileSync(path.join(backend,file),'utf8');
    assert.equal(crypto.createHash('sha256').update(value).digest('hex'),expectedHashes[file]);
    return [key,value];
  }));
  const names=['normalizedSizeLabel','sizeLabelTokens','purchasableSize','nearestLooseSizeIsSafe'];
  source.helpers=benchmark.selectedDeclarations(source.helpers,files.helpers,names)+'\n'+names.map(name=>'exports.'+name+'='+name+';').join('\n');
  const compile=(value,file)=>ts.transpileModule(value,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},transformers:{before:[context=>{
    const visit=node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&ts.isPropertyAccessExpression(node.expression.expression)&&node.expression.expression.expression.getText()==='console'?ts.factory.createEmptyStatement():ts.visitEachChild(node,visit,context);
    return root=>ts.visitNode(root,visit);
  }]}}).outputText;
  const module=(key,dependencies)=>'(()=>{const exports={};const require=name=>{'+dependencies+'throw Error("Unexpected simulation import: "+name);};'+compile(source[key],files[key])+';return exports;})()';
  return '(()=>{const inline='+module('inline','')+';const engine='+module('engine','if(name==="./inline-product-chart")return inline;')+';const helpers='+module('helpers','')+';return {engine,helpers};})()';
}

// This function is embedded directly in the HTML. It uses the frozen production
// sizing engine supplied above, recorded tapes, and hypothetical product charts.
function createGapSimulation(data, sizing) {
  const deltas=[0,-7,-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,7];
  const finitePositive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
  function makeProduct(product,gapCm,gapAxis) {
    const chart=JSON.parse(JSON.stringify(product.chart));
    for(const field of ['waist','hips']) {
      if(gapAxis!=='both'&&gapAxis!==field)continue;
      const anchorIndex=chart.orderedSizes.findIndex(size=>Number.isFinite(chart.valuesBySizeCm[size]?.[field]?.center));
      if(anchorIndex<0)continue;
      const anchor=chart.valuesBySizeCm[chart.orderedSizes[anchorIndex]][field].center;
      chart.orderedSizes.forEach((size,index)=>{
        const value=chart.valuesBySizeCm[size]?.[field];
        if(!value)return;
        const center=anchor+(index-anchorIndex)*gapCm,halfWidth=(value.max-value.min)/2;
        chart.valuesBySizeCm[size][field]={min:center-halfWidth,max:center+halfWidth,center};
      });
    }
    const fields=chart.relevantMeasurements.filter(field=>['waist','hips'].includes(field));
    const format=value=>{if(!value)return '';const min=Number(value.min.toFixed(8)),max=Number(value.max.toFixed(8));return min===max?String(min):min+'-'+max;};
    const sizeGuide={headers:['Size',...fields.map(field=>field==='waist'?'Waist (cm)':'Hip (cm)')],rows:chart.orderedSizes.map(size=>[size,...fields.map(field=>format(chart.valuesBySizeCm[size]?.[field]))])};
    return {...product,chart,simulationGuide:sizeGuide};
  }
  function choose(product,tape,gender) {
    const result=sizing.engine.recommendDeterministic({method:'exact',measurements:{...tape,gender},product:{title:product.title,variants:[]},sizeGuide:product.simulationGuide,sizingUnit:'cm',primaryFields:product.primarySizing.fields,primaryFitMode:product.primarySizing.mode});
    if(!result.success||(!result.found&&!sizing.helpers.nearestLooseSizeIsSafe(result)))return -1;
    const label=result.recommendedSize&&sizing.helpers.purchasableSize(result.recommendedSize,product.chart.orderedSizes);
    return label?product.chart.orderedSizes.indexOf(label):-1;
  }
  function summary(pairs,indices) {
    const blank=()=>({attempted:0,eligible:0,same:0,up:0,down:0,unavailable:0,notScorable:0,unaffected:0});
    const total=blank(),byGender={},byCategory={};
    pairs.forEach((pair,index)=>{
      const gender=data.people[pair[0]].gender,category=data.products[pair[1]].groupId,value=indices[index];
      byGender[gender]??=blank();byCategory[category]??=blank();
      for(const tally of [total,byGender[gender],byCategory[category]]) {
        tally.attempted++;
        if(value===-2)tally.notScorable++;
        else if(value===-3)tally.unaffected++;
        else {tally.eligible++;tally[value<0?'unavailable':value===pair[3]?'same':value>pair[3]?'up':'down']++;}
      }
    });
    for(const tally of [total,...Object.values(byGender),...Object.values(byCategory)])for(const field of ['same','up','down','unavailable'])tally[field+'Pct']=tally.eligible?Math.round(10000*tally[field]/tally.eligible)/100:null;
    return {total,byGender,byCategory};
  }
  async function run({gapCm,gapAxis,errorAxis,onProgress=()=>{},cancelled=()=>false}) {
    if(!finitePositive(gapCm)||!['both','waist','hips'].includes(gapAxis)||!['both','waist','hips'].includes(errorAxis))throw Error('Choose a positive size gap and valid measurements.');
    const products=data.products.map(product=>makeProduct(product,gapCm,gapAxis));
    const pairs=data.pairs.map(pair=>pair.slice());
    const scenarios=deltas.map(deltaCm=>({id:errorAxis+':'+deltaCm,axis:errorAxis,deltaCm,sizeIndices:Array(pairs.length).fill(-2)}));
    for(let index=0;index<pairs.length;index++) {
      if(index%80===0) {
        if(cancelled())return null;
        onProgress(index,pairs.length);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      const pair=pairs[index],person=data.people[pair[0]],product=products[pair[1]];
      const complete=product.chart.relevantMeasurements.every(field=>finitePositive(person.actuals[field]));
      const reference=complete?choose(product,person.actuals,person.gender):-1;
      pair[3]=reference>=0?reference:null;
      pair[2]=!complete?'Missing recorded measurement':reference<0?'No size in made-up chart':'Scorable';
      if(reference<0)continue;
      const affected=errorAxis==='both'||product.chart.relevantMeasurements.includes(errorAxis);
      for(const scenario of scenarios) {
        if(!affected){scenario.sizeIndices[index]=-3;continue;}
        if(scenario.deltaCm===0){scenario.sizeIndices[index]=reference;continue;}
        const changed={...person.actuals};
        for(const field of ['waist','hips'])if(finitePositive(changed[field])&&(errorAxis==='both'||field===errorAxis))changed[field]+=scenario.deltaCm;
        scenario.sizeIndices[index]=choose(product,changed,person.gender);
      }
    }
    for(const scenario of scenarios)scenario.summary=summary(pairs,scenario.sizeIndices);
    onProgress(pairs.length,pairs.length);
    return {...data,products,pairs,scenarios,simulation:{gapCm,gapAxis,errorAxis,anchor:'First available measured size in each product; preserve its chart centre and the original range widths.'}};
  }
  return {run,makeProduct,choose};
}

module.exports={buildGapEngine,createGapSimulation};
