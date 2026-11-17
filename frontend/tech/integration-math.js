export const velocity=t=>2-t;
export const displacement=t=>2*t-t*t/2;
export const distance=t=>t<=2?displacement(t):2+(t-2)*(t-2)/2;
export const height=(x,y)=>1+.25*x+.25*y;
export const density=x=>1+x;

function resolution(n){if(!Number.isInteger(n)||n<1||n>128)throw new RangeError('Partition resolution must be an integer from 1 to 128.');}
function result(parts,n,sampling,exact){
  let sum=0,positive=0,negative=0,maxAbs=0;
  for(const part of parts){maxAbs=Math.max(maxAbs,Math.abs(part.value));sum+=part.contribution;part.cumulative=sum;if(part.contribution>=0)positive+=part.contribution;else negative+=part.contribution;}
  return {resolution:n,sampling,parts,sum,error:Math.abs(sum-exact),positive,negative,maxAbs};
}

export function displacementPartition(n){
  resolution(n);const dt=3/n,parts=[];
  for(let i=0;i<n;i++){const t=i*dt,value=velocity(t);parts.push({center:[t+dt/2,value/2,0],size:[dt,Math.abs(value),0],sample:[t,0,0],value,measure:dt,contribution:value*dt});}
  return result(parts,n,'left',1.5);
}

export function volumePartition(n){
  resolution(n);const step=2/n,parts=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=i*step,y=j*step,value=height(x,y),measure=step*step;parts.push({center:[x+step/2,y+step/2,value/2],size:[step,step,value],sample:[x,y,0],value,measure,contribution:value*measure});}
  return result(parts,n,'left',6);
}

export function massPartition(n){
  resolution(n);const step=1/n,parts=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)for(let k=0;k<n;k++){
    const x=i*step,y=j*step,z=k*step,value=density(x),measure=step*step*step;
    parts.push({center:[x+step/2,y+step/2,z+step/2],size:[step,step,step],sample:[x,y,z],value,measure,contribution:value*measure});
  }
  return result(parts,n,'left',1.5);
}

export function fluxOrientation(degrees){
  if(!Number.isFinite(degrees))throw new RangeError('Normal angle must be finite.');
  const radians=degrees*Math.PI/180,clean=x=>Math.abs(x)<1e-12?0:x,cos=clean(Math.cos(radians)),sin=clean(Math.sin(radians));
  const normal=[sin,0,cos],basis={u:[cos,0,-sin],v:[0,1,0]},field=[0,0,2],normalValue=2*cos;
  return {degrees,normal,basis,field,normalValue,area:4,flux:4*normalValue};
}

export function fluxPartition(n,degrees=0){
  resolution(n);const orientation=fluxOrientation(degrees),step=2/n,parts=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    const u=-1+(i+.5)*step,v=-1+(j+.5)*step,center=orientation.basis.u.map((x,k)=>(x*u+orientation.basis.v[k]*v)||0),value=orientation.normalValue,measure=step*step;
    parts.push({center,size:[step,step,0],sample:[...center],value,measure,contribution:value*measure});
  }
  return {...result(parts,n,'constant',orientation.flux),degrees,normal:orientation.normal};
}
