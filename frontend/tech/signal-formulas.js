const text=s=>`<mi>${s}</mi>`,num=n=>`<mn>${n}</mn>`,sub=(a,b)=>`<msub>${a}${b}</msub>`,sup=(a,b)=>`<msup>${a}<mrow>${b}</mrow></msup>`,row=s=>`<mrow>${s}</mrow>`,fraction=(a,b)=>`<mfrac>${row(a)}${row(b)}</mfrac>`;
const T=sub(text('T'),num(0)),w0=sub(text('ω'),num(0)),ck=sub(text('c'),text('k')),infinity='<mo>∞</mo>',minus='<mo>−</mo>',pi='<mi>π</mi>',j=text('j'),t=text('t'),n=text('n'),k=text('k'),w=text('ω');
const range=(sign,lo,hi)=>`<msubsup><mo>${sign}</mo>${row(lo)}${row(hi)}</msubsup>`;
const integral=(lo,hi)=>range('∫',lo,hi),sum=(lo,hi)=>range('∑',lo,hi),exp=(sign,arg)=>sup(text('e'),sign+j+arg),xt=text('x')+'<mo stretchy="false">(</mo>'+t+'<mo stretchy="false">)</mo>',xn=text('x')+'<mo>[</mo>'+n+'<mo>]</mo>',X=text('X')+'<mo stretchy="false">(</mo>'+w+'<mo stretchy="false">)</mo>',Xd=text('X')+'<mo stretchy="false">(</mo>'+sup(text('e'),j+w)+'<mo stretchy="false">)</mo>';
export function signalFormula(id,inverse){
 let left,right;
 if(id==='ft'){left=inverse?xt:X;right=inverse?fraction(num(1),num(2)+pi)+integral(minus+infinity,infinity)+X+exp('',w+t)+text('dω'):integral(minus+infinity,infinity)+xt+exp(minus,w+t)+text('dt');}
 if(id==='fs'){left=inverse?xt:ck;right=inverse?sum(k+'<mo>=</mo>'+minus+infinity,infinity)+ck+exp('',k+w0+t):fraction(num(1),T)+integral(num(0),T)+xt+exp(minus,k+w0+t)+text('dt');}
 if(id==='dtft'){left=inverse?xn:Xd;right=inverse?fraction(num(1),num(2)+pi)+integral(minus+pi,pi)+Xd+exp('',w+n)+text('dω'):sum(n+'<mo>=</mo>'+minus+infinity,infinity)+xn+exp(minus,w+n);}
 if(id==='dtfs'){left=inverse?xn:ck;right=inverse?sum(k+'<mo>=</mo>'+num(0),text('N')+minus+num(1))+ck+exp('',fraction(num(2)+pi+k+n,text('N'))):fraction(num(1),text('N'))+sum(n+'<mo>=</mo>'+num(0),text('N')+minus+num(1))+xn+exp(minus,fraction(num(2)+pi+k+n,text('N')));}
 return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${id.toUpperCase()} ${inverse?'역변환':'변환'} 공식"><mrow>${left}<mo>=</mo>${right}</mrow></math>`;
}
