// Reuse the same vertices: coincident summed curves branch into their components.
export function writeSignalPositions(target,merged,component,spread,offsetY=0,depthZ=0){
  if(target.length!==merged.length||component.length!==merged.length||target.length%3)throw new RangeError('Signal XYZ arrays must have matching lengths.');
  if(!Number.isFinite(spread))throw new RangeError('Signal spread must be finite.');
  const s=Math.max(0,Math.min(1,spread));
  for(let i=0;i<target.length;i+=3){
    target[i]=merged[i]+(component[i]-merged[i])*s;
    target[i+1]=merged[i+1]+(component[i+1]-merged[i+1]+offsetY)*s;
    target[i+2]=merged[i+2]+(component[i+2]-merged[i+2]+depthZ)*s;
  }
  return target;
}

export function signalButtonState(spread,target=null){
  if(target===1)return {splitDisabled:true,joinDisabled:false};
  if(target===0)return {splitDisabled:false,joinDisabled:true};
  return {splitDisabled:spread>=1,joinDisabled:spread<=0};
}
