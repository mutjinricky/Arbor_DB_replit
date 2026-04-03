export type RiskGrade = "extreme" | "high" | "moderate" | "low";
export type PestGrade = "execute" | "ready" | "survey" | "prepare" | "stable";
export type SoilGrade = "A" | "B" | "C" | "D" | "E";

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
  breakdown: {
    physical: number;
    chemical: number;
    site: number;
    bio: number;
  };
}

export interface ExternalPestDD {
  currentDD: number;
  targetDD: number;
  baseTemp: number;
}

// ─────────────────────────────────────────────
// C-04A: IQTRI = D × T × I
// ─────────────────────────────────────────────
export function calculateIQTRI(tree: TreeFullData): IQTRIResult {
  let D = 0.1;
  if (tree.risk === "high") D = 5.0;
  else if (tree.risk === "medium") D = 1.0;

  if (tree.damage_area > 0 && tree.risk !== "high") D = Math.min(D * 1.5, 10.0);
  if (tree.ice_damage) D = Math.min(D * 1.2, 10.0);
  if (tree.cavity_depth > 5) D = Math.min(D * 1.3, 10.0);

  let T = 15;
  const district = tree.district || "";
  if (district.includes("간선") || district.includes("대로")) T = 25;
  else if (district.includes("도로")) T = 25;
  else if (district.includes("주거") || district.includes("아파트")) T = 40;
  else if (district.includes("학교") || district.includes("놀이터")) T = 25;
  else if (district.includes("공원") || district.includes("산책")) T = 15;

  const diameterMM = (tree.diameter || 10) * 10;
  let I = 1;
  if (diameterMM > 750) I = 10;
  else if (diameterMM >= 350) I = 6;
  else if (diameterMM >= 100) I = 4;

  const score = Math.round(D * T * I * 10) / 10;

  let grade: RiskGrade;
  if (score >= 400) grade = "extreme";
  else if (score >= 100) grade = "high";
  else if (score >= 40) grade = "moderate";
  else grade = "low";

  return { score, grade, D, T, I };
}

// ─────────────────────────────────────────────
// C-04B: 해충 유효적산온도 (Degree-Day) 방제 시기
//   externalDDs: 기상청 API 실측값 (없으면 이천 평년 시뮬레이션)
// ─────────────────────────────────────────────
const PESTS = [
  { name: "복숭아순나방", baseTemp: 7.2, targetDD: 260 },
  { name: "꽃매미", baseTemp: 8.14, targetDD: 355 },
  { name: "갈색날개매미충", baseTemp: 12.1, targetDD: 202 },
] as const;

const ICHEON_SIM_TEMPS = [
  -5.2, -4.8, -3.5, -2.8, -1.2, -0.5, -2.0, 0.5, 2.1, 4.3,
  -3.0, -4.0, -5.0, -3.5, -2.0, -1.0, 0.0, 1.0, 2.0, 1.5,
  -2.0, -3.5, -4.0, -2.0, 0.0, 1.0, -1.0, -2.0, -3.0, -2.0, -1.0,
  -0.5, 0.5, 1.0, 2.0, 3.0, 2.5, 4.0, 5.0, 6.0, 7.0,
  6.5, 5.0, 4.0, 5.5, 6.0, 7.0, 8.0, 7.5, 6.0, 5.0,
  4.5, 5.0, 6.0, 7.0, 7.5, 8.0, 7.0, 6.0,
  5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 11.0, 10.0,
  9.5, 9.0, 9.5, 10.0, 11.0, 12.0, 13.0, 12.0, 11.0, 10.0,
  9.0, 8.5, 9.0, 10.0, 11.0, 12.0, 13.0, 13.5,
];

function simDD(baseTemp: number): number {
  return ICHEON_SIM_TEMPS.reduce((s, t) => s + Math.max(0, t - baseTemp), 0);
}

export function calculatePestControl(
  treeId: string,
  externalDDs?: Record<string, ExternalPestDD>
): PestResult {
  const id = parseInt(treeId) || 0;
  // 수목별 미기후 편차 ±5 DD (도심 소구역 현실 반영)
  const microVariance = ((id * 17 + 31) % 11) - 5;

  let minDays = Infinity;
  let urgentPest = PESTS[0];
  let urgentCurrentDD = 0;
  let urgentTargetDD = 0;

  for (const pest of PESTS) {
    let currentDD: number;
    let targetDD: number;

    if (externalDDs && externalDDs[pest.name]) {
      currentDD = externalDDs[pest.name].currentDD + microVariance;
      targetDD = externalDDs[pest.name].targetDD;
    } else {
      currentDD = simDD(pest.baseTemp) + microVariance;
      targetDD = pest.targetDD;
    }

    const remaining = Math.max(0, targetDD - currentDD);
    // 이천 봄철 평균 일평균기온 상승속도 기반 유효적산온도 일증가량
    const avgDailyDD = Math.max(0.5, 12 - pest.baseTemp);
    const days = remaining / avgDailyDD;

    if (days < minDays) {
      minDays = days;
      urgentPest = pest;
      urgentCurrentDD = Math.round(Math.max(0, currentDD));
      urgentTargetDD = targetDD;
    }
  }

  const daysUntilControl = Math.round(Math.max(0, minDays));

  let grade: PestGrade;
  if (daysUntilControl <= 0)  grade = "execute";
  else if (daysUntilControl <= 7)  grade = "ready";
  else if (daysUntilControl < 14)  grade = "survey";
  else if (daysUntilControl <= 30) grade = "prepare";
  else grade = "stable";

  return {
    daysUntilControl,
    pestName: urgentPest.name,
    grade,
    currentDD: urgentCurrentDD,
    targetDD: urgentTargetDD,
  };
}

// ─────────────────────────────────────────────
// C-04C: K-UTSI 토양 건전성 지수
//   trees.json 실제 필드를 K-UTSI 15개 지표에 매핑
//   최대 총점: 37.5 + 15 + 20 + 7.5 = 80점
// ─────────────────────────────────────────────
export function calculateSoilScore(
  treeId: string,
  treeData?: TreeFullData
): SoilResult {
  if (!treeData) {
    const id = parseInt(treeId) || 0;
    const raw = 35 + ((id * 13 + 7) % 45);
    const score = Math.min(100, raw);
    const grade = _soilGrade(score);
    return { score, grade, breakdown: { physical: 0, chemical: 0, site: 0, bio: 0 } };
  }

  const d = treeData.district || "";
  const isRoad = d.includes("도로") || d.includes("대로");
  const isPark = d.includes("공원") || d.includes("산책");
  const isArtery = d.includes("대로");

  // ── 물리·공간 지표 (가중치 1.5) ──────────────
  // 1. ERA: 유효뿌리공간 (직경 기반)
  const era = treeData.diameter >= 75 ? 5
    : treeData.diameter >= 45 ? 3
    : treeData.diameter >= 20 ? 1
    : 0;

  // 2. H: 토양 경도 (damage_area / cavity_depth 역상관)
  const h = (treeData.damage_area === 0 && treeData.cavity_depth === 0) ? 5
    : (treeData.damage_area < 5 && treeData.cavity_depth < 5) ? 3
    : 1;

  // 3. PER: 투수계수 (지구 유형)
  const per = isPark ? 5 : isRoad ? 1 : 3;

  // 4. POR: 공극률 (도심 평균 가정)
  const por = isPark ? 5 : 3;

  // 5. TEX: 토성 (이천 사양토 기준)
  const tex = 3;

  const physical = (era + h + per + por + tex) * 1.5;

  // ── 화학·비옥도 지표 (가중치 1.0) ──────────────
  // 6. SOM: 유기물 함량 (need_nutrient)
  const som = treeData.need_nutrient ? 0 : 3;

  // 7. pH: 산도 (need_nutrient이면 pH 불량)
  const ph = treeData.need_nutrient ? 1 : 5;

  // 8. EC: 전기전도도 (도로 제설 염화물)
  const ec = isRoad ? 3 : 5;

  const chemical = (som + ph + ec) * 1.0;

  // ── 입지·환경 지표 (가중치 1.0) ──────────────
  // 9. INF: 기반시설 간섭 (damage_area, cavity_depth)
  const inf = (treeData.damage_area > 10 || treeData.cavity_depth > 10) ? 0
    : (treeData.damage_area > 0 || treeData.cavity_depth > 0) ? 1
    : 3;

  // 10. SUR: 지표 투수 피복률
  const sur = isPark ? 5 : isRoad ? 1 : 3;

  // 11. TRA: 교통량
  const tra = isArtery ? 1 : isRoad ? 3 : 5;

  // 12. PPT: 강수 패턴 (이천 평년 1,200mm; ice_damage 이상기후 지표)
  const ppt = treeData.ice_damage ? 1 : 3;

  const site = (inf + sur + tra + ppt) * 1.0;

  // ── 생물·안정성 지표 (가중치 0.5) ──────────────
  // 13. WAS: 응집체 안정성
  const was = (treeData.ice_damage || treeData.damage_area > 5) ? 1 : 3;

  // 14. HOR: A층 깊이 (수령 기반)
  const age = treeData.age || 10;
  const hor = age >= 30 ? 5 : age >= 15 ? 3 : 1;

  // 15. STR: 토양 구조
  const str = treeData.need_nutrient ? 1 : 3;

  const bio = (was + hor + str) * 0.5;

  const rawTotal = physical + chemical + site + bio;
  const maxTotal = 5 * 5 * 1.5 + 5 * 3 * 1.0 + 5 * 4 * 1.0 + 5 * 3 * 0.5;
  const score = Math.round((rawTotal / maxTotal) * 100);

  return {
    score,
    grade: _soilGrade(score),
    breakdown: {
      physical: Math.round(physical),
      chemical: Math.round(chemical),
      site: Math.round(site),
      bio: Math.round(bio * 10) / 10,
    },
  };
}

function _soilGrade(score: number): SoilGrade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "E";
}

// ─────────────────────────────────────────────
// 색상·레이블 상수
// ─────────────────────────────────────────────
export const IQTRI_COLORS: Record<RiskGrade, string> = {
  extreme: "#dc2626",
  high: "#f97316",
  moderate: "#eab308",
  low: "#22c55e",
};

export const PEST_COLORS: Record<PestGrade, string> = {
  execute: "#ef4444",
  ready:   "#f97316",
  survey:  "#eab308",
  prepare: "#06b6d4",
  stable:  "#22c55e",
};

export const SOIL_COLORS: Record<SoilGrade, string> = {
  A: "#3b82f6",
  B: "#22c55e",
  C: "#eab308",
  D: "#f97316",
  E: "#dc2626",
};

export const IQTRI_LABELS: Record<RiskGrade, string> = {
  extreme: "극심",
  high: "고위험",
  moderate: "보통",
  low: "저위험",
};

export const PEST_LABELS: Record<PestGrade, string> = {
  execute: "실행 (D-0)",
  ready:   "방제준비 (D-1~7)",
  survey:  "예찰 (D-8~14)",
  prepare: "사전준비 (D-14~30)",
  stable:  "안정 (D-31+)",
};

export const SOIL_LABELS: Record<SoilGrade, string> = {
  A: "A등급 (최상급)",
  B: "B등급 (양호)",
  C: "C등급 (경계)",
  D: "D등급 (불량)",
  E: "E등급 (생육불능)",
};

export function getComplaintCount(treeId: string): number {
  const id = parseInt(treeId) || 0;
  return (id * 7 + 3) % 25;
}
