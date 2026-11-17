const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const load=file=>import(pathToFileURL(path.resolve(__dirname,'../frontend/tech',file)).href);
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('Fourier examples preserve normalization, complex phase and inverse reconstruction',async()=>{
 const m=await load('signal-math.js');near(m.pulseTransform(0).re,1);near(m.pulseTransform(2*Math.PI).re,0);near(m.pulseTransform(3*Math.PI).re,-2/(3*Math.PI));
 near(m.fsCoefficient(2).im,-.25);near(m.fsCoefficient(-2).im,.25);
 for(const t of [-2,-.3,.1,2.7])near(m.inverseFS(t),m.series(t));
 const period=Array.from({length:8},(_,n)=>m.series(2*Math.PI*n/8)),coeff=m.dtfs(period);near(coeff[1].re,.5);near(coeff[2].im,-.25);near(coeff[6].im,.25);
 for(let n=-8;n<16;n++)near(m.synthesize(coeff,n),period[(n%8+8)%8]);
 const values=[1,1,1];for(const w of [.3,1.2,Math.PI]){const z=m.dtft(values,w),periodic=m.dtft(values,w+2*Math.PI),conjugate=m.dtft(values,-w);near(z.re,periodic.re);near(z.im,periodic.im);near(z.re,conjugate.re);near(z.im,-conjugate.im);}
 const q=m.dtft(values,Math.PI/2);near(q.re,0);near(q.im,-1);
 for(let n=-2;n<=5;n++)near(m.inverseDTFT(values,n),values[n]||0,1e-8);
 near(m.inverseFT(.5),.5,.04);near(m.inverseFT(0),1,.08);near(m.inverseFT(1.5),0,.04);
});
test('saved signal examples include both inverse phase and accumulation records',async()=>{
 const {SIGNALS}=await load('signal-scenarios.js');assert.equal(SIGNALS.length,4);
 for(const d of SIGNALS){assert.equal(d.input.length,d.inverse.length);for(const n of [...d.input,...d.inverse,...d.partial])assert.ok(Number.isFinite(n));for(const a of d.analyses){assert.equal(a.products.length,a.synthesis.length);assert.equal(a.products.length,a.accumulated.length);near(a.accumulated.at(-1)[0],a.value.re,d.id==='ft'?.004:1e-9);near(a.accumulated.at(-1)[1],a.value.im,d.id==='ft'?.004:1e-9);}}
 const ft=SIGNALS.find(d=>d.id==='ft');assert.equal(ft.analyses[1].phase,null);assert.ok(ft.analyses[2].value.re<0);
});
test('charge lesson separates channel formation from drift and preserves pMOS voltage polarity',async()=>{
 const {deviceLesson}=await load('device-lesson.js');for(const p of ['n','p']){const s=deviceLesson(p);assert.equal(s.length,5);assert.equal(s[2].inversion,1);assert.equal(s[2].source,s[2].drain);assert.notEqual(s[3].source,s[3].drain);assert.equal(s[4].inversion,0);if(p==='p')assert.ok(s[2].gate<s[2].source);else assert.ok(s[2].gate>s[2].source);}
});

test('complementary component waves really add to the saved inverse and harmonic examples',async()=>{
 const {COMPONENTS}=await load('signal-components.js'),{SIGNALS}=await load('signal-scenarios.js');
 for(const d of COMPONENTS){
  const reference=SIGNALS.find(s=>s.id===d.id);assert.equal(d.parts.length,['fs','dtfs'].includes(d.id)?2:4);
  for(let i=0;i<d.time.length;i++){const sum=d.parts.reduce((s,p)=>s+p.values[i],0);near(sum,d.sum[i]);near(sum,reference.inverse[i],1e-8);if(d.exact)near(sum,d.input[i],1e-8);}
  near(d.probe.values.reduce((a,b)=>a+b,0),d.probe.sum);assert.ok(d.parts.every(p=>p.values.every(Number.isFinite)));
 }
 const ft=COMPONENTS.find(d=>d.id==='ft');assert.equal(ft.exact,false);assert.ok(ft.error>.05);assert.equal(ft.parts.at(-1).high,6*Math.PI);
 const fs=COMPONENTS.find(d=>d.id==='fs');near(fs.probe.sum,Math.SQRT1_2+.5);
});
test('turning Gate off restores majority carriers while drain junction reverse bias remains',async()=>{
 const {chargeState}=await load('device-lesson.js');
 assert.equal(chargeState(1).depletion,1);assert.equal(chargeState(2).fill,1);assert.equal(chargeState(3).junction,1);
 assert.equal(chargeState(4).fill,0);assert.equal(chargeState(4).depletion,0);assert.equal(chargeState(4).junction,1);assert.equal(chargeState(0).junction,0);
});
