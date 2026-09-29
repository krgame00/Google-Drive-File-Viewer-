const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('        function collectionLayout(');
assert(start>=0,'responsive layout helper exists');
const end=html.indexOf('\n        }',start);
const ctx={};vm.createContext(ctx);vm.runInContext(html.slice(start,end+10),ctx);
for(const [width,mobile,size,buttons] of [[280,true,4,1],[350,true,4,3],[640,true,4,5],[650,false,4,5],[900,false,6,5],[1140,false,10,5]]){
 const layout=ctx.collectionLayout(width,mobile);
 assert.equal(layout.pageSize,size);assert.equal(layout.buttons,buttons);
}
console.log('PASS responsive page size and pagination button limits');
