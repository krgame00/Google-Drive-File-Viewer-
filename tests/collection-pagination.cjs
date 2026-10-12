const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {loadAppSource,sliceFunction}=require('./helpers/load-app-source.cjs');
const html=loadAppSource();
const viewerJs=fs.existsSync('collection-viewer.js')?fs.readFileSync('collection-viewer.js','utf8'):'';
const src=html+'\n'+viewerJs;
const start=src.indexOf('function collectionLayout(');
assert(start>=0,'responsive layout helper exists');
const end=src.indexOf('\n  }',start);
const ctx={};vm.createContext(ctx);vm.runInContext(src.slice(start,end+4),ctx);
for(const [width,mobile,size,buttons] of [[280,true,4,1],[350,true,4,3],[640,true,4,5],[650,false,4,5],[900,false,6,5],[1140,false,10,5]]){
 const layout=ctx.collectionLayout(width,mobile);
 assert.equal(layout.pageSize,size);assert.equal(layout.buttons,buttons);
}
console.log('PASS responsive page size and pagination button limits');
