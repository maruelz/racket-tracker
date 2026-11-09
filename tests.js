// node tests.js  (run next to index.html). Pure-logic + stubbed-DOM smoke test; NOT a browser test.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
let js=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
js=js.replace(/\(async\(\)=>\{db=migrate[\s\S]*\}\)\(\);\s*$/,''); // drop boot IIFE
const stub=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':k==='length'?0:k==='then'?undefined:stub,set:()=>true,apply:()=>stub});
const els=[];const doc={querySelector:()=>stub,querySelectorAll:q=>q==='[data-chart]'?els:[],addEventListener(){},createElement:()=>stub};
const ctx={document:doc,indexedDB:{open:()=>stub},localStorage:{getItem:()=>null,setItem(){}},history:stub,addEventListener(){},navigator:{},console,setTimeout,clearTimeout,Date,Math,alert(){},confirm:()=>true};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(js+';this.api={pick,norm,buildIx,render,mainList,detail,bodyView,today,get db(){return db},set db(v){db=v},set bt(v){bt=v},set tab(v){tab=v},CS,bindChartScrolls,today}',ctx);
const A=ctx.api;
const jobs=()=>[{id:'old',racketId:'r',startDate:'2026-10-01',endDate:'2026-11-01',auto:1},{id:'new',racketId:'r',startDate:'2026-11-01',time:'10:00',endDate:null}];
A.db={rackets:[{id:'r'}],stringJobs:jobs(),overgripJobs:[],entries:[],workouts:[],sessionMetrics:[],settings:{}};
const p=(d,t,pin)=>A.pick('stringJobs','r',d,t,pin)?.id;
assert.strictEqual(p('2026-11-01'),'new','same day, no time -> new strings');
assert.strictEqual(p('2026-11-01','09:00'),'old','played before 10:00 change -> old');
assert.strictEqual(p('2026-11-01','11:00'),'new','played after change -> new');
assert.strictEqual(p('2026-11-01',undefined,'before'),'old','pinned before -> old');
assert.strictEqual(p('2026-10-15'),'old','earlier day -> old');
// deleting the newest job must leave the previous one current again
A.db.stringJobs=[jobs()[0]];A.norm();assert.strictEqual(A.db.stringJobs[0].endDate,null,'stale endDate cleared');
// local date format
assert.match(A.today(),/^\d{4}-\d{2}-\d{2}$/);
// smoke: render every builder with seeded data, draw all charts, look for NaN/undefined
const T=(d,n)=>{const x=new Date(Date.UTC(2026,10,9));x.setUTCDate(x.getUTCDate()-d);return x.toISOString().slice(0,10)};
A.db={schemaVersion:1,app:'racket-tracker',rackets:[{id:'r',name:'Pure',sport:'tennis',model:'x'},{id:'r2',name:'Aero',sport:'tennis'},{id:'p',name:'Pad',sport:'padel'}],
 stringJobs:[{id:'s1',racketId:'r',startDate:T(40),mains:{model:'a',tensionKg:24},crosses:{model:'a',tensionKg:24},knots:2},{id:'s2',racketId:'r',startDate:T(5),time:'10:00',mains:{model:'b',tensionKg:25},crosses:{model:'b',tensionKg:25},knots:2}],
 overgripJobs:[{id:'g1',racketId:'r',startDate:T(20),model:'tacky'}],
 entries:[...[30,12,5,5,2].map((d,i)=>({id:'e'+i,racketId:'r',sessionId:'S'+i,date:T(d),time:i==2?'09:00':null,hours:1+i*.5,intensity:2,createdAt:T(d)+'T10:00:00Z',fit:{power:3},verdict:4})),
  {id:'x1',racketId:'r',sessionId:'X',date:T(3),hours:1,createdAt:'2026-11-06T10:00:00Z'},{id:'x2',racketId:'r2',sessionId:'X',date:T(3),hours:1,createdAt:'2026-11-06T10:00:00Z'},
  {id:'pd',racketId:'p',sessionId:'PD',date:T(2),hours:1.5,createdAt:T(2)+'T10:00:00Z'},
  {id:'b1',racketId:null,about:'body',hours:null,date:T(2),body:{elbow:4,shoulderL:2,when:'after'},createdAt:T(2)+'T12:00:00Z'}],
 workouts:[{id:'w1',date:T(1),durationMinutes:50,intensity:2,pain:{elbow:3}}],sessionMetrics:[{sessionId:'S1',date:T(12),brainFog:1,onsetMinutes:35},{sessionId:'S3',date:T(5),brainFog:0}],settings:{}};
A.norm();
const s5=A.db.entries.find(e=>e.id==='e2');assert.strictEqual(s5.stringJobId,'s1','09:00 session on 10:00 restring day -> old strings');
const s5b=A.db.entries.find(e=>e.id==='e3');assert.strictEqual(s5b.stringJobId,'s2','untimed same-day session -> new strings');
let out='';A.buildIx();out+=A.mainList();A.tab='O';out+=A.detail('r');A.tab='S';out+=A.detail('r');A.tab='U';out+=A.detail('r');
for(const k of['P','R','W'])A.bt=k,out+=A.bodyView();
assert(!/NaN|undefined/.test(out),'builder HTML has NaN/undefined: '+(out.match(/.{40}(NaN|undefined).{40}/)||[''])[0]);
const ids=Object.keys(A.CS);assert(ids.length>=10,'charts registered: '+ids.length);
for(const id of ids){const el={dataset:{chart:id},clientWidth:330,scrollWidth:4000,scrollLeft:0,innerHTML:'',previousElementSibling:{style:{},innerHTML:''},firstChild:{}};els.push(el);}
A.bindChartScrolls();
for(const el of els){assert(/^<svg/.test(el.innerHTML),el.dataset.chart+' drew');assert(!/NaN|undefined|Infinity/.test(el.innerHTML),el.dataset.chart+' has NaN/undefined/Infinity in SVG');}
A.buildIx();const pv=vm.runInContext("padelView()+(tab='O',detail('p'))",ctx);assert(!/NaN|undefined/.test(pv),'padel html');assert(A.CS['padel']&&A.CS['padel-cumulative']&&A.CS['racket-p'],'padel charts');const w=A.CS['padel'];assert.strictEqual(w.dates.length>=28,true);
console.log('OK: logic asserts passed;',ids.length,'charts built and drawn without NaN:',ids.join(', '));
