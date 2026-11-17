import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {velocity,displacement,distance,height,displacementPartition,volumePartition,massPartition,fluxOrientation,fluxPartition} from '../frontend/tech/integration-math.js';

export function buildIntegrationScenarios(){
  const displacementLevels=[4,12,48].map(displacementPartition),volumeLevels=[2,4,8].map(volumePartition),massLevels=[2,4,6].map(massPartition);
  const orientations=[0,60,90,180].map(degrees=>({...fluxOrientation(degrees),levels:[2,4,8].map(n=>fluxPartition(n,degrees))}));
  const steps=(intro,coarse,fine,finish)=>[intro,coarse,fine,finish].map((s,i)=>({...s,level:i===0?null:i-1}));
  return [
    {id:'displacement',title:'속도를 쌓으면 변위',quantity:'변위',unit:'m',valueUnit:'m/s',measureUnit:'s',domain:{t:[0,3]},exact:1.5,totalDistance:2.5,formula:'Δx = ∫₀³ (2−t) dt = 1.5 m',localFormula:'작은 변위 ≈ v(tᵢ) Δt',sampling:'left',levels:displacementLevels,
      samples:Array.from({length:61},(_,i)=>{const t=i/20;return {t,value:velocity(t),accumulated:displacement(t),distance:distance(t)};}),
      steps:steps(
        {title:'속도는 위치가 바뀌는 빠르기예요',why:'0~2초에는 앞으로, 2~3초에는 뒤로 움직입니다. 속도의 부호는 방향을 나타냅니다.',watch:'이동 물체와 속도 곡선을 비교하세요. 물체의 위치는 실제 적분값으로 저장했습니다.'},
        {title:'짧은 시간 동안 속도를 고정해요',why:'구간의 왼쪽 속도에 시간 폭 Δt를 곱하면 작은 변위를 근사합니다. 아래쪽 직사각형은 음의 변위입니다.',watch:'네 조각의 부호 있는 넓이를 더해보세요. 4조각의 왼쪽 합은 2.625 m로 아직 실제 변위와 다릅니다.'},
        {title:'시간 폭을 더 작게 나눠요',why:'구간의 왼쪽 값을 쓰는 근사이므로, 시간 폭을 줄이면 계단이 실제 속도 곡선에 가까워집니다.',watch:'12조각의 합 1.875 m가 실제 변위 1.5 m에 더 가까워집니다.'},
        {title:'양의 변화와 음의 변화를 함께 쌓아요',why:'48조각의 합 1.59375 m는 유한 근사입니다. Δt가 0으로 가는 극한의 적분값은 1.5 m입니다.',watch:'최종 변위는 1.5 m이고 총 이동 거리는 2.5 m입니다. 음의 넓이를 절댓값으로 더하면 이동 거리가 됩니다.'}
      ),source:'https://openstax.org/books/calculus-volume-1/pages/5-4-integration-formulas-and-the-net-change-theorem'},
    {id:'volume',title:'높이를 면적에 쌓으면 부피',quantity:'부피',unit:'m³',valueUnit:'m',measureUnit:'m²',domain:{x:[0,2],y:[0,2]},exact:6,formula:'V = ∬ᴰ (1+0.25x+0.25y) dA = 6 m³',localFormula:'작은 부피 ≈ 높이 f(xᵢ,yⱼ) ΔA',sampling:'left',levels:volumeLevels,
      surface:Array.from({length:17},(_,i)=>Array.from({length:17},(_,j)=>{const x=i/8,y=j/8;return [x,y,height(x,y)];})),
      steps:steps(
        {title:'평면의 각 위치에 높이가 있어요',why:'바닥 영역은 0≤x,y≤2인 정사각형이고, 그 위에 z=1+0.25x+0.25y라는 높이 곡면이 있습니다.',watch:'높이 아래의 공간을 채우려 합니다. 구하는 것은 곡면 넓이가 아니라 바닥과 높이 사이의 부피입니다.'},
        {title:'바닥을 나누고 작은 기둥을 세워요',why:'각 작은 셀의 왼쪽 아래 높이에 바닥 넓이 ΔA를 곱해 기둥 부피를 근사합니다.',watch:'2×2 기둥의 부피 합은 5 m³입니다. 기둥 꼭대기는 아직 경사진 곡면을 충분히 따라가지 못합니다.'},
        {title:'기둥을 더 가늘게 나눠요',why:'작은 셀 안에서 높이가 변하는 차이가 줄어, 왼쪽 아래 값으로 만든 계단이 실제 곡면에 가까워집니다.',watch:'4×4 기둥의 합은 5.5 m³입니다. 바닥 넓이 전체는 4 m²로 그대로입니다.'},
        {title:'모든 작은 기둥의 부피를 더해요',why:'8×8 기둥의 합은 5.75 m³입니다. 셀 넓이가 0으로 가는 극한에서는 정확한 부피 6 m³가 됩니다.',watch:'높이[m] × 바닥 넓이[m²] = 부피[m³]라는 단위를 확인하세요. ∬ f dA는 이 예제에서 높이 아래의 부피입니다.'}
      ),source:'https://openstax.org/books/calculus-volume-3/pages/5-1-double-integrals-over-rectangular-regions'},
    {id:'flux',title:'면을 통과하는 흐름을 더해요',quantity:'체적 유량',unit:'m³/s',valueUnit:'m/s',measureUnit:'m²',domain:{u:[-1,1],v:[-1,1]},exact:8,formula:'Q = ∬ˢ F·n̂ dS = 8 cosθ m³/s',localFormula:'작은 통과 유량 = (F·n̂) ΔS',sampling:'constant',levels:orientations[0].levels,orientations,
      steps:steps(
        {title:'흐름 방향과 면의 방향을 비교해요',why:'물의 속도 F=(0,0,2) m/s가 면적 4 m²의 면을 통과합니다. n̂는 면에 수직인 단위 법선입니다.',watch:'흐름은 고정하고 면의 기울기와 법선 방향을 바꿔보세요. 면적과 방향은 서로 다른 정보입니다.'},
        {title:'면을 나누고 수직 성분만 취해요',why:'내적 F·n̂=|F|cosθ는 면에 수직인 속도입니다. 이 성분에 작은 면적 ΔS를 곱하면 그 조각을 통과하는 체적 유량이 됩니다.',watch:'흐름과 법선이 같으면 θ=0°이고 모든 속도가 통과에 기여합니다. 접선 방향 성분은 면을 통과하지 않습니다.'},
        {title:'더 작은 면 조각을 살펴봐요',why:'이 예제는 평면 위의 일정한 흐름이므로 어느 조각에서도 F·n̂가 같습니다. 조각 수를 늘려도 합은 이미 정확합니다.',watch:'기울기 60°이면 절반인 4 m³/s, 90°이면 0입니다. 분할 수보다 법선과 흐름 사이의 각도가 결과를 바꿉니다.'},
        {title:'방향이 있는 통과량을 합쳐요',why:'0°/60°/90°/180°의 유량은 각각 8/4/0/−8 m³/s입니다. 법선을 뒤집으면 부호가 바뀌지만 실제 물의 흐름 방향은 그대로입니다.',watch:'이것은 벡터 흐름의 면적분입니다. ∫∫1 dS로 구하는 면 넓이나, 높이 아래 부피와 구분하세요.'}
      ),source:'https://openstax.org/books/calculus-volume-3/pages/6-6-surface-integrals'},
    {id:'mass',title:'밀도를 부피에 쌓으면 질량',quantity:'질량',unit:'kg',valueUnit:'kg/m³',measureUnit:'m³',domain:{x:[0,1],y:[0,1],z:[0,1]},exact:1.5,formula:'M = ∭ⱽ (1+x) dV = 1.5 kg',localFormula:'작은 질량 ≈ 밀도 ρ(xᵢ,yⱼ,zₖ) ΔV',sampling:'left',levels:massLevels,
      steps:steps(
        {title:'물체 안의 위치마다 밀도가 달라요',why:'한 변 1 m인 정육면체의 밀도는 ρ=1+x kg/m³입니다. x가 커질수록 같은 부피에 더 많은 질량이 들어 있습니다.',watch:'밀도는 기둥 높이가 아닙니다. 같은 크기의 부피 조각에서 색이나 입자 농도가 달라지는 양입니다.'},
        {title:'작은 부피에 밀도를 곱해요',why:'각 셀의 왼쪽 아래 꼭짓점 밀도를 대표값으로 사용합니다. 밀도에 셀 부피 ΔV를 곱하면 작은 질량을 근사합니다.',watch:'2×2×2 셀의 질량 합은 1.25 kg입니다. 색이 짙은 셀은 같은 부피에서도 더 무겁습니다.'},
        {title:'밀도 변화를 더 세밀하게 나눠요',why:'셀을 나누면 한 셀 안의 밀도 차이가 줄어, 왼쪽 아래 값으로 구한 합이 실제 질량에 가까워집니다.',watch:'4×4×4 셀의 합은 1.375 kg입니다. 셀 개수가 늘어도 전체 물체 부피는 1 m³로 같습니다.'},
        {title:'물체 전체의 작은 질량을 더해요',why:'6×6×6 셀의 합은 약 1.416667 kg입니다. 셀 부피가 0으로 가는 극한에서는 정확한 질량 1.5 kg가 됩니다.',watch:'밀도[kg/m³] × 작은 부피[m³] = 질량[kg]입니다. 부피 자체의 적분과 밀도를 가중한 질량 적분을 구분하세요.'}
      ),source:'https://openstax.org/books/calculus-volume-3/pages/5-4-triple-integrals'}
  ];
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  await writeFile(new URL('../frontend/tech/integration-scenarios.js',import.meta.url),'// Generated by npm run tech:build-integration. Runtime reads saved values only.\nexport const INTEGRATION_CASES='+JSON.stringify(buildIntegrationScenarios())+';\n');
  console.log('Saved displacement, height-volume, oriented flux and density-mass partitions.');
}
