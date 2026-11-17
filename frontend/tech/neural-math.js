// Two inputs, four tanh hidden units, one sigmoid output. Full-batch XOR training.
export const XOR_DATA=Object.freeze([
  {x:[0,0],y:0},{x:[0,1],y:1},{x:[1,0],y:1},{x:[1,1],y:0}
]);
export class XORNetwork {
  constructor(seed=7193){
    let value=seed;const random=()=>{value=value*16807%2147483647;return(value-1)/2147483646;};
    this.w1=Array.from({length:4},()=>[random()*2-1,random()*2-1]);
    this.b1=[0,0,0,0];this.w2=Array.from({length:4},()=>((random()*2-1)*Math.sqrt(6/5)));this.b2=0;
    this.epochs=0;
  }
  forward(input){
    if(input.length!==2||!input.every(Number.isFinite))throw Error('Two finite inputs required');
    const z=this.w1.map((weights,j)=>weights[0]*input[0]+weights[1]*input[1]+this.b1[j]);
    const h=z.map(Math.tanh),logit=h.reduce((sum,v,j)=>sum+v*this.w2[j],this.b2);
    const output=logit>=0?1/(1+Math.exp(-logit)):Math.exp(logit)/(1+Math.exp(logit));
    return {input:[...input],z,h,logit,output};
  }
  loss(){return XOR_DATA.reduce((sum,{x,y})=>{const z=this.forward(x).logit;return sum+Math.max(z,0)-y*z+Math.log1p(Math.exp(-Math.abs(z)));},0)/XOR_DATA.length;}
  gradients(){
    const g={w1:Array.from({length:4},()=>[0,0]),b1:[0,0,0,0],w2:[0,0,0,0],b2:0};
    for(const {x,y} of XOR_DATA){
      const {h,output}=this.forward(x),d=(output-y)/XOR_DATA.length;g.b2+=d;
      for(let j=0;j<4;j++){g.w2[j]+=d*h[j];const hidden=d*this.w2[j]*(1-h[j]*h[j]);g.b1[j]+=hidden;for(let k=0;k<2;k++)g.w1[j][k]+=hidden*x[k];}
    }
    return g;
  }
  train(epochs=1,rate=.5){
    if(!Number.isInteger(epochs)||epochs<1||epochs>10000||!Number.isFinite(rate)||rate<=0||rate>2)throw Error('Invalid training parameters');
    let gradient;
    for(let n=0;n<epochs;n++){
      gradient=this.gradients();
      for(let j=0;j<4;j++){for(let k=0;k<2;k++)this.w1[j][k]-=rate*gradient.w1[j][k];this.b1[j]-=rate*gradient.b1[j];this.w2[j]-=rate*gradient.w2[j];}
      this.b2-=rate*gradient.b2;this.epochs++;
    }
    return gradient;
  }
}
