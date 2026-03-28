export type RiskGrade = 'extreme' | 'high' | 'moderate' | 'low';
export type PestGrade = 'danger' | 'warning' | 'safe';
export type SoilGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface TreeFullData {
  id: string;
  diameter: number;
  height: number;
  lat: number;
  lng: number;
  district: string;
  damage_area: number;
  cavity_depth: number;
  ice_damage: boolean;
  need_nutrient: boolean;
  risk: string;
  age: number;
  inspection: string;
  species: string;
}

export interface IQTRIResult {
  score: number;
  grade: RiskGrade;
  D: number;
  T: number;
  I: number;
}

export interface PestResult {
  daysUntilControl: number;
  pestName: string;
  grade: PestGrade;
  currentDD: number;
  targetDD: number;
}

export interface SoilResult {
  score: number;
  grade: SoilGrade;
}

export function calculateIQTRI(tree: TreeFullData): IQTRIResult {
  let D = 0.1;
  if (tree.risk === 'high') D = 5.0;
  else if (tree.risk === 'medium') D = 1.0;

  if (tree.damage_area > 0 && tree.risk !== 'high') D = Math.min(D * 1.5, 10.0);
  if (tree.ice_damage) D = Math.min(D * 1.2, 10.0);
  if (tree.cavity_depth > 5) D = Math.min(D * 1.3, 10.0);

  let T = 15;
  const district = tree.district || '';
  if (district.includes('간선') || district.includes('대로')) T = 25;
  else if (district.includes('도로')) T = 25;
  else if (district.includes('주거') || district.includes('아파트')) T = 40;
  else if (district.includes('학교') || district.includes('놀이터')) T = 25;
  else if (district.includes('공원') || district.includes('산책')) T = 15;

  const diameterMM = (tree.diameter || 10) * 10;
  let I = 1;
  if (diameterMM > 750) I = 10;
  else if (diameterMM >= 350) I = 6;
  else if (diameterMM >= 100) I = 4;

  const score = Math.round(D * T * I * 10) / 10;

  let grade: RiskGrade;
  if (score >= 400) grade = 'extreme';
  else if (score >= 100) grade = 'high';
  else if (score >= 40) grade = 'moderate';
  else grade = 'low';

  return { score, grade, D, T, I };
}

const PESTS = [
  { name: '복숭아순나방', baseTemp: 7.2, targetDD: 260 },
  { name: '꽃매미', baseTemp: 8.14, targetDD: 355 },
  { name: '갈색날개매미충', baseTemp: 12.1, targetDD: 202 },
];

const ICHEON_AVG_DAILY_TEMPS_JAN_MAR = [
  -3.5, -2.8, -1.2, 0.5, 2.1, 4.3, 5.8, 7.2, 8.5, 9.1,
  10.2, 11.5, 12.8, 13.1, 11.9, 10.5, 9.8, 9.2, 8.6, 8.1,
  7.5, 7.0, 6.8, 6.5, 6.2, 6.0, 5.8, 5.6,
  4.8, 5.2, 6.1, 7.3, 8.5, 9.2, 10.1, 11.4, 12.5, 13.2,
  12.8, 11.5, 10.8, 10.2, 9.8, 9.5, 9.2, 8.9, 8.6, 8.3,
  8.0, 7.8, 7.5, 7.2, 7.0, 6.8, 6.6, 6.4, 6.2, 6.0,
  7.1, 8.5, 9.8, 11.2, 12.6, 13.8, 14.5, 15.0, 15.5, 16.0,
  15.8, 15.2, 14.8, 14.2, 13.8, 13.2, 12.8, 12.2, 11.8, 11.2,
  10.8, 10.2, 9.8, 9.2, 8.8, 8.2, 7.8,
];

function accumulateDD(temps: number[], baseTemp: number): number {
  return temps.reduce((sum, t) => sum + Math.max(0, t - baseTemp), 0);
}

export function calculatePestControl(treeId: string): PestResult {
  const id = parseInt(treeId) || 0;
  const varianceSeed = ((id * 17 + 31) % 40) - 20;

  let minDays = Infinity;
  let urgentPest = PESTS[0];
  let urgentCurrentDD = 0;
  let urgentTargetDD = 0;

  for (const pest of PESTS) {
    const currentDD = accumulateDD(ICHEON_AVG_DAILY_TEMPS_JAN_MAR, pest.baseTemp) + varianceSeed;
    const remaining = Math.max(0, pest.targetDD - currentDD);
    const avgFutureDaily = Math.max(0.5, 6.5 - pest.baseTemp);
    const days = remaining / avgFutureDaily;

    if (days < minDays) {
      minDays = days;
      urgentPest = pest;
      urgentCurrentDD = Math.round(currentDD);
      urgentTargetDD = pest.targetDD;
    }
  }

  const daysUntilControl = Math.round(minDays);

  let grade: PestGrade;
  if (daysUntilControl < 60) grade = 'danger';
  else if (daysUntilControl < 90) grade = 'warning';
  else grade = 'safe';

  return {
    daysUntilControl,
    pestName: urgentPest.name,
    grade,
    currentDD: urgentCurrentDD,
    targetDD: urgentTargetDD,
  };
}

export function calculateSoilScore(treeId: string): SoilResult {
  const id = parseInt(treeId) || 0;
  const hash = ((id * 13 + 7) % 60);
  const score = 40 + hash;

  let grade: SoilGrade;
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'E';

  return { score, grade };
}

export const IQTRI_COLORS: Record<RiskGrade, string> = {
  extreme: '#dc2626',
  high: '#f97316',
  moderate: '#eab308',
  low: '#22c55e',
};

export const PEST_COLORS: Record<PestGrade, string> = {
  danger: '#dc2626',
  warning: '#eab308',
  safe: '#22c55e',
};

export const SOIL_COLORS: Record<SoilGrade, string> = {
  A: '#3b82f6',
  B: '#22c55e',
  C: '#eab308',
  D: '#f97316',
  E: '#dc2626',
};

export const IQTRI_LABELS: Record<RiskGrade, string> = {
  extreme: '극심',
  high: '고위험',
  moderate: '보통',
  low: '저위험',
};

export const PEST_LABELS: Record<PestGrade, string> = {
  danger: '위험 (<60일)',
  warning: '주의 (60~90일)',
  safe: '안전 (90일+)',
};

export const SOIL_LABELS: Record<SoilGrade, string> = {
  A: 'A등급 (최상급)',
  B: 'B등급 (양호)',
  C: 'C등급 (경계)',
  D: 'D등급 (불량)',
  E: 'E등급 (생육불능)',
};

export function getComplaintCount(treeId: string): number {
  const id = parseInt(treeId) || 0;
  const seed = (id * 7 + 3) % 25;
  return seed;
}
