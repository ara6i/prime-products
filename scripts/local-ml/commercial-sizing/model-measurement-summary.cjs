'use strict';

// Count each selected person once, even when they have many product checks.
// Errors are absolute distances from recorded tape, in centimetres.
function summarizeModelMeasurements(data, rows) {
  const people=[...new Set(rows.map(row=>row[0]))].map(index=>data.people[index]);
  const models={};
  for(const model of ['aiad','v8']){
    models[model]={};
    for(const field of ['waist','hips']){
      const errors=people.flatMap(person=>{
        const actual=person.actuals[field],predicted=person.predictions[model]?.[field];
        return Number.isFinite(actual)&&actual>0&&Number.isFinite(predicted)&&predicted>0?[Math.abs(predicted-actual)]:[];
      }).sort((a,b)=>a-b);
      const n=errors.length;
      models[model][field]={count:n,averageCm:n?errors.reduce((sum,value)=>sum+value,0)/n:null,medianCm:n?(errors[Math.floor((n-1)/2)]+errors[Math.floor(n/2)])/2:null};
    }
  }
  let example=null,bestScore=Infinity;
  for(const pair of rows){
    if(pair[3]==null||pair[3]<0||pair[4]?.[0]==null||pair[5]?.[0]==null||pair[4][0]<0||pair[5][0]<0||pair[4][0]===pair[3]||pair[5][0]===pair[3])continue;
    const person=data.people[pair[0]];
    if(!Number.isFinite(person.actuals.waist)||!Number.isFinite(person.actuals.hips))continue;
    const score=['aiad','v8'].reduce((sum,model)=>sum+Math.abs(Math.abs(person.predictions[model].waist-person.actuals.waist)-(models[model].waist.averageCm??0)),0);
    if(score<bestScore){example=pair;bestScore=score;}
  }
  return {people:people.length,models,example};
}

module.exports={summarizeModelMeasurements};
