const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('        function randomPick(');
assert(start>=0,'randomPick helper exists');
const end=html.indexOf('\n        }',start);
const ctx={};vm.createContext(ctx);vm.runInContext(html.slice(start,end+10),ctx);
const pick=ctx.randomPick;
const pool=[{id:'a'},{id:'b'},{id:'c'},{id:'d'},{id:'e'}];
assert.equal(pick([],null),null,'empty pool returns null');
assert.equal(pick(null,'a'),null,'missing pool returns null');
for(let i=0;i<1000;i++){const p=pick(pool,null);assert(pool.includes(p),'pick is from pool');}
const hits=new Set();for(let i=0;i<2000;i++)hits.add(pick(pool,null).id);
assert.equal(hits.size,5,'every item can be picked');
const two=[{id:'x'},{id:'y'}];
for(let i=0;i<1000;i++){assert.notEqual(pick(two,'x').id,'x','never returns avoided id when alternates exist');}
assert.equal(pick([{id:'only'}],'only').id,'only','single-item pool still returns the item');
assert(html.includes('id="collRandom"'),'random button exists');
assert(html.includes('randomBtn.addEventListener("click"'),'random button handler wired');
assert(html.includes('function collMatches('),'filter predicate extracted');
assert(html.includes('function openCollectionItem('),'open flow extracted');
console.log('PASS collection random pick');
