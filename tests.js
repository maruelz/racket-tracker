// node tests.js  (run next to index.html). Pure-logic + stubbed-DOM smoke test; NOT a browser test.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
let js=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
js=js.replace(/\(async\(\)=>\{db=migrate[\s\S]*\}\)\(\);\s*$/,''); // drop boot IIFE
const stub=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':k==='length'?0:k==='then'?undefined:stub,set:()=>true,apply:()=>stub});
const els=[];const doc={querySelector:()=>stub,querySelectorAll:q=>q==='[data-chart]'?els:[],addEventListener(){},createElement:()=>stub};
const ctx={document:doc,indexedDB:{open:()=>stub},localStorage:{getItem:()=>null,setItem(){}},history:stub,addEventListener(){},navigator:{},console,setTimeout,clearTimeout,Date,Math,alert(){},confirm:()=>true};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(js+';this.api={slideH,chipsH,sessF,jobF,sTxt,fatSeries,episodes,loadView,bodyF,fatF,workoutF,pick,norm,upgradeFatigueScale,fatigueEstimate,FN,buildIx,render,mainList,detail,bodyView,fitDisplay,fitProfile,cmpTxt,blockHours,stoppedDates,strAgeMeter,strTarget,rangeControls,timeLabel,wkBlock,racketOverview,FIT,LOOK_FLAGS,VERDICTS,LEGACY_VERDICTS,today,get db(){return db},set db(v){db=v},set bt(v){bt=v},set tab(v){tab=v},CS,bindChartScrolls,today}',ctx);
const A=ctx.api;
{
 const realForm=ctx.form;
 let fields,save;
 ctx.form=(title,fs,ok)=>{fields=fs;save=ok};
 A.db={rackets:[{id:'r',name:'Pure',sport:'tennis',model:'Pure'}],stringJobs:[{id:'old',racketId:'r',startDate:'2026-10-01',mains:{model:'a',tensionKg:24},crosses:{model:'a',tensionKg:24},knots:2,stringer:'Alex'}],overgripJobs:[],entries:[],workouts:[],sessionMetrics:[],settings:{}};
 A.jobF('s','new','r');
 const stringer=fields.find(f=>f.k==='stringer');
 assert(stringer,'new strings form includes a Stringer field');
 assert.strictEqual(stringer.l,'Stringer');
 assert.strictEqual(save({mm:'b',mt:25,cm:'b',ct:25,same:true,kn:2,nm:'',stringer:'  Jamie  ',sd:'2026-11-24',tm:'',nt:'',target:0,ageWeeks:6}),undefined);
 assert.strictEqual(A.db.stringJobs[1].stringer,'Jamie','stringer is trimmed and saved');
 assert(A.sTxt(A.db.stringJobs[1]).includes('Stringer: Jamie'),'stringer is shown in setup history');
 ctx.form=realForm;
}
{
 A.db={rackets:[],stringJobs:[],overgripJobs:[],entries:[],workouts:[],sessionMetrics:[],fatigue:[{level:2},{level:3}],settings:{}};
 A.norm();A.upgradeFatigueScale();
 assert.strictEqual(A.db.fatV,3,'legacy fatigue scale migration is versioned');
 assert.deepStrictEqual(Array.from(A.db.fatigue,f=>f.level),[4,4],'legacy levels that normalized to Exhausted stay Exhausted');
 assert.strictEqual(A.db.fatigue[1].stopped,true,'legacy exhausted stop marker is preserved');
 A.db={fatigue:[{level:2},{level:3,stopped:true}],fatV:2};A.upgradeFatigueScale();
 assert.deepStrictEqual(Array.from(A.db.fatigue,f=>f.level),[2,4],'version 2 A bit tired remains distinct from Exhausted');
 assert.strictEqual(A.db.fatV,3);
 assert.strictEqual(JSON.stringify([1.74,1.75,2.625,3.5].map(x=>A.fatigueEstimate(x,{amber:1.75,red:3.5}))),JSON.stringify([1,2,3,4]),'model estimates follow all four ordered levels');
}
{
 A.db={entries:[{date:'2026-01-01',body:{stopped:true}},{date:'2026-01-02',body:{stopped:false}}],fatigue:[{date:'2026-01-01',stopped:true},{date:'2026-01-03',stopped:true}]};
 assert.strictEqual(JSON.stringify([...A.stoppedDates()].sort()),'["2026-01-01","2026-01-03"]','pain and fatigue stop markers share dates without duplicates');
}
{
 const realForm=ctx.form;let save;ctx.form=(title,fields,ok)=>{assert(Array.from(fields).some(f=>f.k==='chk'&&f.l==='Stopped or skipped because of my body'),'pain check-in exposes the same checkbox as fatigue');save=ok};
 A.db={entries:[],fatigue:[]};A.bodyF();const values=Object.fromEntries(vm.runInContext('JJ.map(([k])=>[k,""])',ctx));Object.assign(values,{date:'2026-01-04',time:'',stopped:true,note:''});assert.strictEqual(save(values),undefined,'pain stop can be saved without a fatigue level or pain score');assert.strictEqual(A.db.entries[0].body.stopped,true,'stop-only pain check-in persists its marker');ctx.form=realForm;
}
const jobs=()=>[{id:'old',racketId:'r',startDate:'2026-10-01',endDate:'2026-11-01',auto:1},{id:'new',racketId:'r',startDate:'2026-11-01',time:'10:00',endDate:null}];
A.db={rackets:[{id:'r'}],stringJobs:jobs(),overgripJobs:[],entries:[],workouts:[],sessionMetrics:[],settings:{}};
assert.strictEqual(A.strTarget(A.db.stringJobs[1]),null,'string hours expectation stays unset without completed history');
A.db.stringJobs=[{id:'s1',racketId:'r',endDate:'2026-10-10'},{id:'s2',racketId:'r',endDate:'2026-10-20'},{id:'s3',racketId:'r',endDate:'2026-10-30'},{id:'current',racketId:'r',endDate:null}];
A.db.entries=[{stringJobId:'s1',hours:6},{stringJobId:'s2',hours:12}];
assert.strictEqual(A.strTarget(A.db.stringJobs[3]),null,'two completed jobs are not enough to suggest an expectation');
A.db.entries.push({stringJobId:'s3',hours:30});
assert.strictEqual(A.strTarget(A.db.stringJobs[3]),12,'three completed jobs suggest their median playable hours');
assert.strictEqual(A.strTarget({...A.db.stringJobs[3],targetHours:8}),8,'a saved expectation takes precedence over history');
assert.strictEqual(A.timeLabel(45),'45min');assert.strictEqual(A.timeLabel(60),'1h');assert.strictEqual(A.timeLabel(80),'1h 20min','slider durations use friendly hours/minutes');
assert(A.rangeControls('test',[7,14,28,9999]).includes('>All</button>'),'all-time range chip is available');
A.db.stringJobs=jobs();A.db.entries=[];
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
assert.strictEqual(A.FIT.find(x=>x.key==='confidence').question,'Does it feel stable enough to swing freely?','confidence prompt is concise and stability-linked');
assert.strictEqual(JSON.stringify(A.blockHours([{racketId:'r',minutes:20},{racketId:'r2',minutes:30},{racketId:'r',minutes:15}])),JSON.stringify({r:20/60+15/60,r2:0.5}),'ordered repeated racket blocks aggregate by racket');
assert.strictEqual(JSON.stringify(A.blockHours([{racketId:'r',minutes:0},{racketId:'r2',minutes:-1}])),JSON.stringify({}),'empty or invalid blocks do not add hours');
assert(A.fitDisplay({verdict:5}).includes('Earlier like scale: Loved'),'legacy verdict remains on the original scale');
assert(A.fitDisplay({verdict:5,verdictVersion:1}).includes('Match choice: Golden'),'new verdict uses match-choice scale');
A.db={rackets:[{id:'r',name:'Pure'},{id:'r2',name:'Aero'}],entries:[{sessionId:'new',racketId:'r',lookFlags:['breakage']},{sessionId:'new',racketId:'r2'}],sessionMetrics:[{sessionId:'new',sessionTypes:['Match','Drills'],opponentLevel:'mixed',blocks:[{racketId:'r',minutes:20},{racketId:'r2',minutes:30},{racketId:'r',minutes:15}],pref:{confidence:'r'},cmp:{spin:'r2'}}]};
const sessionText=A.cmpTxt(A.db.entries[0]);assert(sessionText.includes('Kind: Match, Drills')&&sessionText.includes('Opponent: Mixed')&&sessionText.includes('Pure 20 min → Aero 30 min → Pure 15 min'),'session context keeps racket order and durations');assert(sessionText.includes('Preferred for: Confidence: Pure')&&sessionText.includes('Earlier higher / more: Free spin: Aero'),'new preference and legacy comparison remain distinct');assert(sessionText.includes('String-bed: Breakage'),'look condition is shown in session history');
A.db.sessionMetrics.push({sessionId:'multi',opponentLevels:['below','above']});const multiEntry={...A.db.entries[0],sessionId:'multi'};A.db.entries.push(multiEntry);
assert(A.cmpTxt(multiEntry).includes('Opponent: Lower, Higher'),'new sessions display multiple opponent levels');
assert.strictEqual(JSON.stringify(A.LOOK_FLAGS.map(x=>x[0])),JSON.stringify(['fraying','snapback','breakage']),'only observable string-bed conditions are selectable');
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
A.norm();A.norm();A.upgradeFatigueScale();
const s5=A.db.entries.find(e=>e.id==='e2');assert.strictEqual(s5.stringJobId,'s1','09:00 session on 10:00 restring day -> old strings');
const s5b=A.db.entries.find(e=>e.id==='e3');assert.strictEqual(s5b.stringJobId,'s2','untimed same-day session -> new strings');
let out='';A.buildIx();vm.runInContext("chartPrefs['racket-home-r']={days:9999};chartPrefs['racket-r']={days:9999}",ctx);assert(A.wkBlock(A.db.rackets[0]).includes('All time'),'racket home card supports all-time range');assert(A.racketOverview(A.db.rackets[0],A.db.entries).includes('All time'),'racket detail chart supports all-time range');out+=A.mainList();A.tab='O';out+=A.detail('r');A.tab='S';out+=A.detail('r');A.tab='U';out+=A.detail('r');
for(const k of['P','L'])A.bt=k,out+=A.bodyView();
assert(!/NaN|undefined/.test(out),'builder HTML has NaN/undefined: '+(out.match(/.{40}(NaN|undefined).{40}/)||[''])[0]);
const bodies=A.db.entries.filter(e=>e.body&&e.checkId==='C1');assert.strictEqual(bodies.length,1,'duplicate per-racket check-ins merged');assert.strictEqual(bodies[0].racketId,null);assert.strictEqual(JSON.stringify(bodies[0].legacy.racketIds.slice().sort()),'["r","r2"]','legacy racket link kept as data');assert.strictEqual(bodies[0].body.when,undefined);
{const F=A.fatSeries(),a=A.CS['fatigue-level']?null:null;A.buildIx();const G=A.fatSeries(),dts=vm.runInContext('IX.dates',ctx),ix=n=>dts.indexOf(T(n));
 assert.strictEqual(G.lv[ix(8)]+G.kd[ix(8)],'4k');assert.strictEqual(G.lv[ix(6)]+G.kd[ix(6)],'4a','gap between two exhausted days stays exhausted (assumed)');
 assert.strictEqual(G.lv[ix(4)]+G.kd[ix(4)],'1a','gap before a 1 is recovering (assumed)');assert.strictEqual(G.kd[ix(2)],'u','after last entry = unknown');assert.strictEqual(G.lv[ix(2)],0);
 assert(G.st[ix(2)]<G.st[ix(3)]&&G.st[ix(1)]<G.st[ix(2)],'strain only decays on unknown days');
 {const RL=vm.runInContext('runLoad()',ctx);assert(RL[ix(6)]>0&&RL[ix(6)]<RL[ix(12)],'rest days decay the balance, not reset it');assert(RL[ix(5)]>0);const Z=vm.runInContext('zones()',ctx);assert.strictEqual(Z.red,3.5,'fallback zones until 3 episodes')}const E=A.episodes();assert.strictEqual(E.length,1);assert.strictEqual(E[0].d,4);assert.strictEqual(E[0].back,4);assert.strictEqual(E[0].tip.tipDate,T(6),'tipping point attached');}
{const un=A.slideH({k:'o',l:'Onset',min:30,max:150,step:5,bare:1,v:null}),old=A.slideH({k:'o',l:'Onset',min:30,max:150,step:5,bare:1,v:20}),pn=A.slideH({k:'e',l:'Elbow',min:0,max:10,u:'/10',v:null}),ch=A.chipsH({k:'iv',l:'Intensity',o:[['1','Low'],['2','Normal']],v:2});
 assert(/min=25 max=150/.test(un)&&/value=""/.test(un)&&!/Not recorded|<b data-sv>:/.test(un),'onset: unset stop below 30, bare label');assert(/min=15/.test(old)&&/value="20"/.test(old),'existing onset 20 preserved, range widened');
 assert(/min=-1 max=10/.test(pn)&&/Elbow<b data-sv>: –/.test(pn),'pain: unset at left');assert(!/Not recorded/.test(ch)&&/chip on" data-v="2"/.test(ch),'chips: no unset chip');
const sj=vm.runInContext("sessF.toString()",ctx);assert(!/rel/.test(sj.match(/Log session[\s\S]{0,400}/)[0].replace(/relative|rel=/g,'')),'rel field gone');assert(sj.includes("['2','A bit tired']")&&sj.includes("['3','Very tired']")&&sj.includes("['4','Exhausted']"),'session Body at start uses the four fatigue levels');assert(sj.includes('Select multiple for mixed levels')&&sj.includes('Your physical effort; opponent level is separate'),'session guidance is inline with its heading');assert(!sj.includes('data-block-up')&&!sj.includes('data-block-down'),'racket allocation rows no longer include reorder buttons');assert(sj.includes('useBlocks=sel.length>1')&&sj.includes('hidden=sel.length<2||!useBlocks'),'racket allocation activates only with multiple rackets');assert(html.includes('.chip{padding:6px 12px;font-size:12px}')&&!html.includes('compact-choice'),'chips and session context headings use consistent styling');}
for(const f of[()=>A.sessF('r'),()=>A.sessF('r',A.db.entries.find(e=>e.sessionId)),()=>A.bodyF(),()=>A.fatF(),()=>A.workoutF(),()=>A.bodyF(A.db.entries.find(e=>e.body)),()=>A.fatF(A.db.fatigue[0])])f();
A.buildIx();out='';A.tab='O';out+=A.mainList()+A.detail('r');for(const k of['P','L'])A.bt=k,out+=A.bodyView();assert(!/NaN|undefined/.test(out),'re-render has NaN/undefined: '+(out.match(/.{40}(NaN|undefined).{40}/)||[''])[0]);const ids=Object.keys(A.CS);assert(ids.length>=9,'charts registered: '+ids.length);
for(const id of ids){const el={dataset:{chart:id},clientWidth:330,scrollWidth:4000,scrollLeft:0,innerHTML:'',previousElementSibling:{style:{},innerHTML:''},firstChild:{}};els.push(el);}
A.bindChartScrolls();
for(const el of els){assert(/^<svg/.test(el.innerHTML),el.dataset.chart+' drew');assert(!/NaN|undefined|Infinity/.test(el.innerHTML),el.dataset.chart+' has NaN/undefined/Infinity in SVG');}
A.buildIx();const pv=vm.runInContext("padelView()+(tab='O',detail('p'))",ctx);assert(!/NaN|undefined/.test(pv),'padel html');assert(A.CS['padel']&&A.CS['padel-cumulative']&&A.CS['racket-p'],'padel charts');const w=A.CS['padel'];assert.strictEqual(w.dates.length>=28,true);
console.log('OK: logic asserts passed;',ids.length,'charts built and drawn without NaN:',ids.join(', '));
