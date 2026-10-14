const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadVideoPlayerApi}=require('./helpers/load-video-player-api.cjs');

function loadApi(){ return loadVideoPlayerApi({}); }

test('preferred route moves to the front without dropping fallback routes',()=>{
  const api=loadApi();
  const sources=[
    {route:'worker',url:'worker-url'},
    {route:'usercontent',url:'direct-url'},
    {route:'key',url:'key-url'}
  ];
  const ordered=api.prioritizePlaybackSource(sources,'key');
  assert.deepEqual(ordered.map(x=>x.route),['key','worker','usercontent']);
  assert.deepEqual(sources.map(x=>x.route),['worker','usercontent','key'],'input order remains unchanged');
});

test('unknown or absent preferred route preserves the configured order',()=>{
  const api=loadApi();
  const sources=[{route:'worker'},{route:'usercontent'},{route:'key'}];
  assert.deepEqual(api.prioritizePlaybackSource(sources,null),sources);
  assert.deepEqual(api.prioritizePlaybackSource(sources,'missing'),sources);
  assert.deepEqual(api.prioritizePlaybackSource(sources,'worker'),sources);
});

test('preferred route can be moved from the middle while preserving remaining relative order',()=>{
  const api=loadApi();
  const sources=[{route:'worker'},{route:'key'},{route:'usercontent'},{route:'other'}];
  assert.deepEqual(api.prioritizePlaybackSource(sources,'key').map(x=>x.route),['key','worker','usercontent','other']);
});
