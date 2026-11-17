export const TAU=2*Math.PI;
export const pulse=t=>Math.abs(Math.abs(t)-.5)<1e-10?.5:Math.abs(t)<.5?1:0;
export const pulseTransform=w=>Math.abs(w)<1e-10?{re:1,im:0}:{re:2*Math.sin(w/2)/w,im:0};
export const series=t=>Math.cos(t)+.5*Math.sin(2*t);
export function fsCoefficient(k){return {re:Math.abs(k)===1?.5:0,im:k===2?-.25:k===-2?.25:0};}
export function dtft(values,w){return values.reduce((z,x,n)=>({re:z.re+x*Math.cos(w*n),im:z.im-x*Math.sin(w*n)}),{re:0,im:0});}
export function dtfs(values){return values.map((_,k)=>{const z=dtft(values,TAU*k/values.length);return {re:z.re/values.length,im:z.im/values.length};});}
export function synthesize(coefficients,n){return coefficients.reduce((s,c,k)=>s+c.re*Math.cos(TAU*k*n/coefficients.length)-c.im*Math.sin(TAU*k*n/coefficients.length),0);}
export function integral(fn,a,b,steps=1200){let sum=0;for(let i=0;i<=steps;i++){const y=fn(a+(b-a)*i/steps);sum+=y*(i===0||i===steps?.5:1);}return sum*(b-a)/steps;}
export function inverseFT(t,limit=6*Math.PI){return integral(w=>{const z=pulseTransform(w);return z.re*Math.cos(w*t)-z.im*Math.sin(w*t);},-limit,limit)/TAU;}
export function inverseDTFT(values,n){return integral(w=>{const z=dtft(values,w);return z.re*Math.cos(w*n)-z.im*Math.sin(w*n);},-Math.PI,Math.PI)/TAU;}
export function inverseFS(t,limit=2){let sum=0;for(let k=-limit;k<=limit;k++){const c=fsCoefficient(k);sum+=c.re*Math.cos(k*t)-c.im*Math.sin(k*t);}return sum;}
