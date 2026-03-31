import React from 'react';
import { Source, Layer } from 'react-map-gl';

const circleRadius = [
  'interpolate', ['linear'], ['zoom'],
  14, 5,
  18, 7,
  19, 7,
  23, 30,
  25, 50,
];

function buildColorMapping(property, colorMap, fallback) {
  const pairs = Object.entries(colorMap).flatMap(([k, v]) => [k, v]);
  return ['match', ['get', property], ...pairs, fallback];
}

const RISK_COLOR_MAP = {
  extreme: '#dc2626',
  high: '#f97316',
  moderate: '#eab308',
  low: '#22c55e',
};

const PEST_COLOR_MAP = {
  danger: '#dc2626',
  warning: '#eab308',
  safe: '#22c55e',
};

const SOIL_COLOR_MAP = {
  A: '#3b82f6',
  B: '#22c55e',
  C: '#eab308',
  D: '#f97316',
  E: '#dc2626',
};

function getColorExpression(mapMode) {
  if (mapMode === 'pest') return buildColorMapping('pestGrade', PEST_COLOR_MAP, '#6b7280');
  if (mapMode === 'soil') return buildColorMapping('soilGrade', SOIL_COLOR_MAP, '#6b7280');
  return buildColorMapping('iqtriGrade', RISK_COLOR_MAP, '#6b7280');
}

// 위험도 높은 수목이 위쪽에 렌더링되도록 sort-key 설정
function getSortKeyExpression(mapMode) {
  if (mapMode === 'pest') {
    return ['match', ['get', 'pestGrade'], 'danger', 3, 'warning', 2, 'safe', 1, 0];
  }
  if (mapMode === 'soil') {
    return ['match', ['get', 'soilGrade'], 'E', 5, 'D', 4, 'C', 3, 'B', 2, 'A', 1, 0];
  }
  return ['match', ['get', 'iqtriGrade'], 'extreme', 4, 'high', 3, 'moderate', 2, 'low', 1, 0];
}

function TreeLayer({ treesData, selectedTreeIds = [], mapMode = 'risk', filteredIds = null }) {
  const colorExpr = getColorExpression(mapMode);

  const baseLayerStyle = {
    id: 'trees-point',
    type: 'circle',
    layout: {
      'circle-sort-key': getSortKeyExpression(mapMode),
    },
    paint: {
      'circle-radius': circleRadius,
      'circle-color': colorExpr,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': 'rgba(255,255,255,0.6)',
    },
  };

  const selectedLayerStyle = {
    id: 'trees-selected',
    type: 'circle',
    paint: {
      'circle-radius': circleRadius,
      'circle-color': 'transparent',
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  };

  const checkLayerStyle = {
    id: 'trees-selected-check',
    type: 'symbol',
    layout: {
      'text-field': '✓',
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 8, 18, 10, 19, 12, 23, 20, 25, 30],
      'text-anchor': 'center',
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
    },
  };

  const selectedFilter =
    selectedTreeIds.length > 0
      ? ['in', ['get', 'id'], ['literal', selectedTreeIds]]
      : ['==', ['get', 'id'], ''];

  const visibilityFilter =
    filteredIds !== null
      ? (filteredIds.length > 0
          ? ['in', ['get', 'id'], ['literal', filteredIds]]
          : ['==', ['get', 'id'], ''])
      : ['!=', ['get', 'id'], ''];

  const filteredBaseStyle = {
    ...baseLayerStyle,
    filter: visibilityFilter,
  };

  return (
    <Source id="trees-data" type="geojson" data={treesData}>
      <Layer {...filteredBaseStyle} />
      <Layer {...selectedLayerStyle} filter={selectedFilter} />
      <Layer {...checkLayerStyle} filter={selectedFilter} />
    </Source>
  );
}

export default React.memo(TreeLayer);

