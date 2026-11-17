const mi=s=>`<mi>${s}</mi>`,mn=n=>`<mn>${n}</mn>`,mo=s=>`<mo${s==='('||s===')'?' stretchy="false"':''}>${s}</mo>`,row=s=>`<mrow>${s}</mrow>`,frac=(a,b)=>`<mfrac>${row(a)}${row(b)}</mfrac>`,sub=(a,b)=>`<msub>${a}${b}</msub>`,sup=(a,b)=>`<msup>${a}${row(b)}</msup>`;
const math=(s,label)=>`<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${label}">${row(s)}</math>`;
const pi=mi('π'),w=mi('ω'),j=mi('j');
const argument=d=>d.discrete?mi('n'):mi('t');
const symbol=(d,i)=>sub(mi('s'),mn(i+1))+(d.discrete?mo('['):mo('('))+argument(d)+(d.discrete?mo(']'):mo(')'));
const bound=v=>Math.abs(v)<1e-10?mn(0):mn(Number((v/Math.PI).toFixed(2)))+pi;
export function componentFormula(d,p,i){
 let rhs;
 if(p.kind==='band'){
  const X=d.id==='ft'?mi('X')+mo('(')+w+mo(')'):mi('X')+mo('(')+sup(mi('e'),j+w)+mo(')');
  const integrand=mi('Re')+mo('{')+X+sup(mi('e'),j+w+argument(d))+mo('}');
  rhs=frac(mn(1),pi)+`<msubsup><mo>∫</mo>${row(bound(p.low))}${row(bound(p.high))}</msubsup>`+integrand+mi('dω');
 }else{
  const angle=d.discrete?frac(mn(2)+pi+mn(p.harmonic)+mi('n'),mn(8)):(p.harmonic===1?'':mn(p.harmonic))+mi('t');
  rhs=(p.amplitude===1?'':mn(p.amplitude))+mi(p.kind)+mo('(')+angle+mo(')');
 }
 return math(symbol(d,i)+mo('=')+rhs,`성분 ${i+1}의 수식`);
}
export function sumFormula(d){
 const x=mi('x')+(d.discrete?mo('['):mo('('))+argument(d)+(d.discrete?mo(']'):mo(')'));
 return math(x+mo(d.exact?'=':'≈')+d.parts.map((_,i)=>symbol(d,i)).join(mo('+')),'성분을 합친 전체 신호');
}
