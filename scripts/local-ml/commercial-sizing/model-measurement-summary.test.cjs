'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {summarizeModelMeasurements}=require('./model-measurement-summary.cjs');

test('measurement errors count people once, omit missing tape, and use absolute differences',()=>{
  const person=(actuals,prediction)=>({actuals,predictions:{aiad:prediction,v8:prediction}});
  const data={people:[person({waist:80,hips:100},{waist:82,hips:97}),person({waist:90,hips:110},{waist:82,hips:109}),person({waist:null,hips:120},{waist:80,hips:121})]};
  const rows=[[0,0],[0,1],[0,2],[1,0],[2,0]],summary=summarizeModelMeasurements(data,rows);
  assert.equal(summary.people,3);
  assert.deepEqual(summary.models.aiad.waist,{count:2,averageCm:5,medianCm:5});
  assert.deepEqual(summary.models.aiad.hips,{count:3,averageCm:5/3,medianCm:1});
  assert.equal(summary.example,null);
  assert.deepEqual(summarizeModelMeasurements(data,[]).models.aiad.waist,{count:0,averageCm:null,medianCm:null});
});
