// node tests.js  (run next to index.html). Pure-logic + stubbed-DOM smoke test; NOT a browser test.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
let js=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
js=js.replace(/\(async\(\)=>\{db=migrate[\s\S]*\}\)\(\);\s*$/,''); // drop boot IIFE
const stub=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':k==='length'?0:k==='then'?undefined:stub,set:()=>true,apply:()=>stub});
const els=[];const doc={querySelector:()=>stub,querySelectorAll:q=>q==='[data-chart]'?els:[],addEventListener(){},createElement:()=>stub};
const ctx={document:doc,indexedDB:{open:()=>stub},localStorage:{getItem:()=>null,setItem(){}},history:stub,addEventListener(){},navigator:{},console,setTimeout,clearTimeout,Date,Math,alert(){},confirm:()=>true};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(js+';this.api={slideH,chipsH,sessF,fatSeries,episodes,loadView,bodyF,fatF,workoutF,pick,norm,buildIx,render,mainList,detail,bodyView,today,get db(){return db},set db(v){db=v},set bt(v){bt=v},set tab(v){tab=v},CS,bindChartScrolls,today}',ctx);
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
  {id:'c1a',racketId:'r',checkId:'C1',shared:true,about:'body',hours:null,date:T(4),body:{elbow:3,when:'after'},sessionRef:'S3',createdAt:'x'},{id:'c1b',racketId:'r2',checkId:'C1',shared:true,about:'body',hours:null,date:T(4),body:{elbow:3,when:'after'},sessionRef:'S3',createdAt:'x'},{id:'b1',racketId:null,about:'body',hours:null,date:T(2),body:{elbow:4,shoulderL:2,when:'after'},createdAt:T(2)+'T12:00:00Z'}],
 workouts:[{id:'w1',date:T(1),durationMinutes:50,intensity:2,pain:{elbow:3}}],fatigue:[{id:'f1',date:T(8),level:3,createdAt:'x'},{id:'f2',date:T(5),level:3,tipDate:T(6),tipTime:'20:00',createdAt:'x'},{id:'f3',date:T(3),level:1,createdAt:'x'}],sessionMetrics:[{sessionId:'S1',date:T(12),brainFog:1,onsetMinutes:35},{sessionId:'S3',date:T(5),brainFog:0}],settings:{},fatV:2};
A.norm();A.norm();
const s5=A.db.entries.find(e=>e.id==='e2');assert.strictEqual(s5.stringJobId,'s1','09:00 session on 10:00 restring day -> old strings');
const s5b=A.db.entries.find(e=>e.id==='e3');assert.strictEqual(s5b.stringJobId,'s2','untimed same-day session -> new strings');
let out='';A.buildIx();out+=A.mainList();A.tab='O';out+=A.detail('r');A.tab='S';out+=A.detail('r');A.tab='U';out+=A.detail('r');
for(const k of['P','L'])A.bt=k,out+=A.bodyView();
assert(!/NaN|undefined/.test(out),'builder HTML has NaN/undefined: '+(out.match(/.{40}(NaN|undefined).{40}/)||[''])[0]);
const bodies=A.db.entries.filter(e=>e.body&&e.checkId==='C1');assert.strictEqual(bodies.length,1,'duplicate per-racket check-ins merged');assert.strictEqual(bodies[0].racketId,null);assert.strictEqual(JSON.stringify(bodies[0].legacy.racketIds.slice().sort()),'["r","r2"]','legacy racket link kept as data');assert.strictEqual(bodies[0].body.when,undefined);
{const F=A.fatSeries(),a=A.CS['fatigue-level']?null:null;A.buildIx();const G=A.fatSeries(),dts=vm.runInContext('IX.dates',ctx),ix=n=>dts.indexOf(T(n));
 assert.strictEqual(G.lv[ix(8)]+G.kd[ix(8)],'3k');assert.strictEqual(G.lv[ix(6)]+G.kd[ix(6)],'3a','gap between two 2+ days stays at 2 (assumed)');
 assert.strictEqual(G.lv[ix(4)]+G.kd[ix(4)],'1a','gap before a 1 is recovering (assumed)');assert.strictEqual(G.kd[ix(2)],'u','after last entry = unknown');assert.strictEqual(G.lv[ix(2)],0);
 assert(G.st[ix(2)]<G.st[ix(3)]&&G.st[ix(1)]<G.st[ix(2)],'strain only decays on unknown days');
 {const RL=vm.runInContext('runLoad()',ctx);assert(RL[ix(6)]>0&&RL[ix(6)]<RL[ix(12)],'rest days decay the balance, not reset it');assert(RL[ix(5)]>0);const Z=vm.runInContext('zones()',ctx);assert.strictEqual(Z.red,3.5,'fallback zones until 3 episodes')}const E=A.episodes();assert.strictEqual(E.length,1);assert.strictEqual(E[0].d,4);assert.strictEqual(E[0].back,4);assert.strictEqual(E[0].tip.tipDate,T(6),'tipping point attached');}
{const un=A.slideH({k:'o',l:'Onset',min:30,max:150,step:5,bare:1,v:null}),old=A.slideH({k:'o',l:'Onset',min:30,max:150,step:5,bare:1,v:20}),pn=A.slideH({k:'e',l:'Elbow',min:0,max:10,u:'/10',v:null}),ch=A.chipsH({k:'iv',l:'Intensity',o:[['1','Low'],['2','Normal']],v:2});
 assert(/min=25 max=150/.test(un)&&/value=""/.test(un)&&!/Not recorded|<b data-sv>:/.test(un),'onset: unset stop below 30, bare label');assert(/min=15/.test(old)&&/value="20"/.test(old),'existing onset 20 preserved, range widened');
 assert(/min=-1 max=10/.test(pn)&&/Elbow<b data-sv>: –/.test(pn),'pain: unset at left');assert(!/Not recorded/.test(ch)&&/chip on" data-v="2"/.test(ch),'chips: no unset chip');
 const sj=vm.runInContext("sessF.toString()",ctx);assert(!/rel/.test(sj.match(/Log session[\s\S]{0,400}/)[0].replace(/relative|rel=/g,'')),'rel field gone');}
for(const f of[()=>A.sessF('r'),()=>A.sessF('r',A.db.entries.find(e=>e.sessionId)),()=>A.bodyF(),()=>A.fatF(),()=>A.workoutF(),()=>A.bodyF(A.db.entries.find(e=>e.body)),()=>A.fatF(A.db.fatigue[0])])f();
A.buildIx();out='';A.tab='O';out+=A.mainList()+A.detail('r');for(const k of['P','L'])A.bt=k,out+=A.bodyView();assert(!/NaN|undefined/.test(out),'re-render has NaN/undefined: '+(out.match(/.{40}(NaN|undefined).{40}/)||[''])[0]);const ids=Object.keys(A.CS);assert(ids.length>=9,'charts registered: '+ids.length);
for(const id of ids){const el={dataset:{chart:id},clientWidth:330,scrollWidth:4000,scrollLeft:0,innerHTML:'',previousElementSibling:{style:{},innerHTML:''},firstChild:{}};els.push(el);}
A.bindChartScrolls();
for(const el of els){assert(/^<svg/.test(el.innerHTML),el.dataset.chart+' drew');assert(!/NaN|undefined|Infinity/.test(el.innerHTML),el.dataset.chart+' has NaN/undefined/Infinity in SVG');}
A.buildIx();const pv=vm.runInContext("padelView()+(tab='O',detail('p'))",ctx);assert(!/NaN|undefined/.test(pv),'padel html');assert(A.CS['padel']&&A.CS['padel-cumulative']&&A.CS['racket-p'],'padel charts');const w=A.CS['padel'];assert.strictEqual(w.dates.length>=28,true);
console.log('OK: logic asserts passed;',ids.length,'charts built and drawn without NaN:',ids.join(', '));
