// components/TreeLayer.jsx
import React from 'react';
import { Source, Layer } from 'react-map-gl';

// Risk 등급에 따른 색상 매핑
const riskColors = {
  riskHigh: 'hsl(0, 70%, 50%)',     // --destructive
  riskMedium: 'hsl(38, 92%, 50%)',   // --warning
  riskLow: 'hsl(142, 76%, 36%)',     // --success
  riskOther: 'hsl(150, 8%, 45%)',    // --muted-foreground
  selected: 'hsl(10, 0%, 100%)',     
  stroke: 'hsl(0, 0%, 100%)',
};

const riskColorMapping = [
  'match',
  ['get', 'risk'], // properties.risk 값을 가져옵니다.
  'high', riskColors.riskHigh, // 상: 높은 위험
  'medium', riskColors.riskMedium, // 중: 중간 위험
  'low', riskColors.riskLow, // 하: 낮은 위험
  riskColors.riskOther // 기타
];

// 줌 레벨에 따른 원 크기 계산 함수
const getCircleRadius = (zoom) => {
  // 줌 레벨에 따라 원의 크기를 동적으로 계산
  // 줌이 높을수록(가까울수록) 원이 커짐
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    14, 5,  
    18, 7,  
    19, 7,
    23, 30,  
    25, 50,  
  ];
};

const treeLayerStyle = {
  id: 'trees-point', // 레이어 ID
  type: 'circle',
  paint: {
    'circle-radius': getCircleRadius(),
    'circle-color': riskColorMapping,
    'circle-stroke-width': 0.1,
    'circle-stroke-color': riskColors.stroke
  }
};

// 선택된 나무를 강조하기 위한 레이어 스타일
const selectedTreeLayerStyle = {
  id: 'trees-selected',
  type: 'circle',
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
        14, 5,  
        18, 7,  
        19, 7,
        23, 30,  
        25, 50,  
    ],
    'circle-color': 'transparent', // 안은 비우고
    'circle-stroke-width': 3,
    'circle-stroke-color': riskColors.selected
  }
};

// 선택된 나무에 체크 표시를 위한 symbol 레이어 스타일
const selectedCheckLayerStyle = {
  id: 'trees-selected-check',
  type: 'symbol',
  layout: {
    'text-field': '✓', // 체크마크 유니코드
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      14, 8,
      18, 10,
      19, 12,
      23, 20,
      25, 30,
    ],
    'text-anchor': 'center',
    'text-allow-overlap': true,
    'text-ignore-placement': true,
  },
  paint: {
    'text-color': riskColors.selected,
    'text-halo-color': riskColors.selected,
    'text-halo-width': 2,
  }
};

function TreeLayer({ treesData, selectedTreeIds = [] }) {
  // selectedTreeIds가 비어있으면 필터가 제대로 동작하지 않을 수 있으므로
  // ['in', 'id', ''] 같은 빈 값을 방지합니다.
  const filter =
    selectedTreeIds.length > 0
      ? ['in', ['get', 'id'], ['literal', selectedTreeIds]]
      : ['==', ['get', 'id'], '']; // 절대 매치되지 않는 필터

  return (
    <Source id="trees-data" type="geojson" data={treesData}>
      {/* 1. 모든 나무를 Risk 색상으로 그리는 레이어 */}
      <Layer {...treeLayerStyle} />

      {/* 2. 선택된 나무만 강조하는 레이어 */}
      <Layer {...selectedTreeLayerStyle} filter={filter} />

      {/* 3. 선택된 나무에 체크 표시 */}
      <Layer {...selectedCheckLayerStyle} filter={filter} />
    </Source>
  );
}

export default React.memo(TreeLayer);

