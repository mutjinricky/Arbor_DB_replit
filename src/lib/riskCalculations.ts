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
    h:   number;  // 토양 경도 (0-5)
    tex: number;  // 토성 (0-5)
    som: number;  // 유기물 함량 (0-5)
    ph:  number;  // 토양 산도 (0-5)
    ec:  number;  // 전기전도도 (0-5)
    cec: number;  // 양이온치환용량 (0-5)
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
//   6개 평가항목 동일 가중치 합산 → 30점 만점 → 100점 환산
//   A≥90 / B≥75 / C≥60 / D≥40 / E<40
// ─────────────────────────────────────────────
export function calculateSoilScore(
  treeId: string,
  treeData?: TreeFullData
): SoilResult {
  if (!treeData) {
    // treeData 없을 때: ID 기반 시뮬레이션 (fallback)
    const id  = parseInt(treeId) || 0;
    const raw = 40 + ((id * 13 + 7) % 50);
    const score = Math.min(100, raw);
    return {
      score, grade: _soilGrade(score),
      breakdown: { h: 3, tex: 3, som: 3, ph: 3, ec: 3, cec: 3 },
    };
  }

  const d        = treeData.district || "";
  const isRoad   = d.includes("도로") || d.includes("대로");
  const isPark   = d.includes("공원") || d.includes("산책");
  const isArtery = d.includes("대로");

  // ① H: 토양 경도 — damage_area / cavity_depth 역상관 프록시
  //    5점: <23mm / 3점: 23~26.9mm / 1점: 27~29.9mm / 0점: ≥30mm
  const h = (treeData.damage_area === 0 && treeData.cavity_depth === 0) ? 5
    : (treeData.damage_area <= 3  && treeData.cavity_depth <= 3)  ? 3
    : (treeData.damage_area <= 10 && treeData.cavity_depth <= 10) ? 1
    : 0;

  // ② TEX: 토성 — 지구 유형 기반 추정
  //    5점: 양토/사양토(공원) / 3점: 식양토(일반) / 1점: 사토/식토(도로) / 0점: 자갈/건설폐기물(간선도로)
  const tex = isPark    ? 5
    : isArtery  ? 0
    : isRoad    ? 1
    : 3;

  // ③ SOM: 유기물 함량 — need_nutrient + 지구 유형
  //    5점: 4.0~6.0% / 3점: 3.0~3.9% 또는 6.1~8.0% / 1점: 1.0~2.9% 또는 8.0% 초과 / 0점: 1.0% 미만
  const som = treeData.need_nutrient ? 0
    : isPark    ? 5
    : 3;

  // ④ pH: 토양 산도 — need_nutrient + 지구 유형
  //    5점: 5.5~7.0 / 3점: 5.0~5.4 또는 7.1~7.5 / 1점: 4.5~4.9 또는 7.6~8.5 / 0점: 4.5 미만 또는 8.5 초과
  const ph = (treeData.need_nutrient && isRoad) ? 0
    : treeData.need_nutrient                     ? 1
    : isArtery                                   ? 3
    : 5;

  // ⑤ EC: 전기전도도 — 제설 염화물 / 도로 오염 프록시
  //    5점: 1.0 dS/m 이하 / 3점: 1.1~1.5 / 1점: 1.6~2.0 / 0점: 2.0 초과
  const ec = isArtery ? 1
    : isRoad  ? 3
    : 5;

  // ⑥ CEC: 양이온치환용량 — 수령 + 영양상태 프록시
  //    5점: 6 me/100g 이상 / 3점: 4~5.9 / 1점: 2~3.9 / 0점: 2 미만
  const age = treeData.age || 10;
  const cec = treeData.need_nutrient    ? 1
    : (age >= 30 && isPark)             ? 5
    : age >= 15                         ? 3
    : 1;

  const rawTotal = h + tex + som + ph + ec + cec;
  const score    = Math.round((rawTotal / 30) * 100);

  return {
    score,
    grade: _soilGrade(score),
    breakdown: { h, tex, som, ph, ec, cec },
  };
}

function _soilGrade(score: number): SoilGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

// ─────────────────────────────────────────────
// C-04D: 토양 건강도 원인코드 (K-UTSI 세부 지표 → 통합 원인칩)
// 5점=정상(표시안함), 3점=경, 1점=중, 0점=심
// ─────────────────────────────────────────────
export type CauseSeverity = "경" | "중" | "심";

export interface CauseChip {
  detailCode: string;   // DB 저장용 세부코드 (e.g. "ERA_RS")
  displayCode: string;  // 화면 표시 통합코드 (e.g. "RS")
  causeName: string;    // 원인명 (e.g. "뿌리공간 부족")
  severity: CauseSeverity;
}

export const CAUSE_SEVERITY_STYLES: Record<CauseSeverity, { bg: string; border: string; text: string }> = {
  "경": { bg: "#fefce8", border: "#fde047", text: "#713f12" },
  "중": { bg: "#fff7ed", border: "#fb923c", text: "#7c2d12" },
  "심": { bg: "#fef2f2", border: "#f87171", text: "#7f1d1d" },
};

function _chipSeverity(score: number): CauseSeverity | null {
  if (score >= 5) return null;
  if (score >= 3) return "경";
  if (score >= 1) return "중";
  return "심";
}

export function calculateSoilCauses(treeData: TreeFullData): CauseChip[] {
  // calculateSoilScore와 동일한 6개 지표 재계산
  const d        = treeData.district || "";
  const isRoad   = d.includes("도로") || d.includes("대로");
  const isPark   = d.includes("공원") || d.includes("산책");
  const isArtery = d.includes("대로");

  // H: <23mm=5 / 23~26.9mm=3 / 27~29.9mm=1 / ≥30mm=0
  const h   = (treeData.damage_area === 0 && treeData.cavity_depth === 0) ? 5
    : (treeData.damage_area <= 3  && treeData.cavity_depth <= 3)  ? 3
    : (treeData.damage_area <= 10 && treeData.cavity_depth <= 10) ? 1
    : 0;
  // TEX: 양토/사양토=5 / 식양토=3 / 사토·식토=1 / 자갈·건설폐기물=0
  const tex = isPark ? 5 : isArtery ? 0 : isRoad ? 1 : 3;
  // SOM: 4.0~6.0%=5 / 3.0~3.9% or 6.1~8.0%=3 / 1.0~2.9% or >8.0%=1 / <1.0%=0
  const som = treeData.need_nutrient ? 0 : isPark ? 5 : 3;
  // pH: 5.5~7.0=5 / 5.0~5.4 or 7.1~7.5=3 / 4.5~4.9 or 7.6~8.5=1 / <4.5 or >8.5=0
  const ph  = (treeData.need_nutrient && isRoad) ? 0
    : treeData.need_nutrient ? 1 : isArtery ? 3 : 5;
  // EC: ≤1.0 dS/m=5 / 1.1~1.5=3 / 1.6~2.0=1 / >2.0=0
  const ec  = isArtery ? 1 : isRoad ? 3 : 5;
  // CEC: ≥6 me/100g=5 / 4~5.9=3 / 2~3.9=1 / <2=0
  const age = treeData.age || 10;
  const cec = treeData.need_nutrient ? 1
    : (age >= 30 && isPark) ? 5 : age >= 15 ? 3 : 1;

  type RawEntry = { detail: string; display: string; name: string; score: number };
  const raw: RawEntry[] = [
    { detail: "H_HAR",  display: "H",   name: "토양 경도 불량",     score: h   },
    { detail: "TEX_TX", display: "TEX", name: "부적정 토성",         score: tex },
    { detail: "SOM_OM", display: "OM",  name: "유기물 부족",         score: som },
    { detail: treeData.need_nutrient ? "PH_AC" : "PH_AL",
                        display: "PH",  name: "pH 이상",             score: ph  },
    { detail: "EC_SAL", display: "SAL", name: "염류·전기전도도 과다", score: ec  },
    { detail: "CEC_LO", display: "CEC", name: "양이온치환용량 부족",  score: cec },
  ];

  return raw
    .filter((e) => e.score < 5)
    .map((e) => ({
      detailCode:  e.detail,
      displayCode: e.display,
      causeName:   e.name,
      severity:    _chipSeverity(e.score)!,
    }));
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
  A: "A등급 · Excellent (90~100)",
  B: "B등급 · Good (75~89)",
  C: "C등급 · Fair (60~74)",
  D: "D등급 · Poor (40~59)",
  E: "E등급 · Critical (<40)",
};

export function getComplaintCount(treeId: string): number {
  const id = parseInt(treeId) || 0;
  return (id * 7 + 3) % 25;
}
