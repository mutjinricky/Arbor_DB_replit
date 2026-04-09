// src/lib/zones.ts
// 구역 정규화 + 구역별 토양데이터 (K-UTSI 기준)

/** district 마지막 단어 → 도로 | 마을 | 축제장 | 전답 | 농가 */
export function normalizeZone(district: string): string {
  if (!district) return "기타";
  const parts = district.trim().split(/\s+/);
  return parts[parts.length - 1];
}

export const ZONE_COLORS: Record<string, string> = {
  "도로":   "#64748B",
  "마을":   "#22C55E",
  "축제장": "#A855F7",
  "전답":   "#EAB308",
  "농가":   "#F97316",
};

export const ZONE_TYPES = ["도로", "마을", "축제장", "전답", "농가"] as const;
export type ZoneType = typeof ZONE_TYPES[number];

// ─── 구역별 실측 토양데이터 (K-UTSI) ─────────────────────────────────────────
export interface ZoneSoilData {
  hardness:      number; hardnessScore:  number; // 토양경도 (mm)
  texture:       string; textureScore:   number; // 토성
  som:           number; somScore:       number; // SOM (%)
  ph:            number; phScore:        number; // pH
  ec:            number; ecScore:        number; // EC (dS/m)
  cec:           number; cecScore:       number; // CEC (me/100g)
  totalScore:    number;                         // 총점 (30점 만점)
  kutsi:         number;                         // K-UTSI 환산점수
  grade:         "A" | "B" | "C" | "D" | "E";  // 최종등급
}

export const ZONE_SOIL_DATA: Record<string, ZoneSoilData> = {
  "도로":   { hardness:28.5, hardnessScore:1, texture:"식양토", textureScore:3, som:2.4, somScore:1, ph:7.8, phScore:1, ec:1.3, ecScore:3, cec:4.8, cecScore:3, totalScore:12, kutsi:40.0, grade:"D" },
  "마을":   { hardness:22.0, hardnessScore:5, texture:"양토",   textureScore:5, som:4.5, somScore:5, ph:6.4, phScore:5, ec:1.2, ecScore:3, cec:5.0, cecScore:3, totalScore:26, kutsi:86.7, grade:"B" },
  "축제장": { hardness:30.8, hardnessScore:0, texture:"양토",   textureScore:5, som:3.4, somScore:3, ph:6.8, phScore:5, ec:1.4, ecScore:3, cec:5.2, cecScore:3, totalScore:19, kutsi:63.3, grade:"C" },
  "전답":   { hardness:25.8, hardnessScore:3, texture:"사토",   textureScore:1, som:2.6, somScore:1, ph:5.3, phScore:3, ec:1.6, ecScore:1, cec:4.5, cecScore:3, totalScore:12, kutsi:40.0, grade:"D" },
  "농가":   { hardness:24.5, hardnessScore:3, texture:"양토",   textureScore:5, som:3.5, somScore:3, ph:6.2, phScore:5, ec:1.2, ecScore:3, cec:5.0, cecScore:3, totalScore:22, kutsi:73.3, grade:"C" },
};

/** 구역 이름 → SoilResult 호환 객체 반환 */
export function getZoneSoilResult(zoneName: string) {
  const d = ZONE_SOIL_DATA[zoneName];
  if (!d) {
    return {
      score: 50, grade: "C" as const,
      breakdown: { h: 3, tex: 3, som: 3, ph: 3, ec: 3, cec: 3 },
      data: null as ZoneSoilData | null,
    };
  }
  return {
    score: d.kutsi,
    grade: d.grade,
    breakdown: { h: d.hardnessScore, tex: d.textureScore, som: d.somScore, ph: d.phScore, ec: d.ecScore, cec: d.cecScore },
    data: d,
  };
}

type CauseSeverity = "경" | "중" | "심";
type ZoneCauseChip = {
  detailCode: string;
  displayCode: string;
  causeName: string;
  severity: CauseSeverity;
};

function _severity(score: number): CauseSeverity {
  if (score >= 3) return "경";
  if (score >= 1) return "중";
  return "심";
}

/** 구역 이름 → 원인 칩 배열 반환 (score < 5인 항목만) */
export function getZoneSoilCauses(zoneName: string): ZoneCauseChip[] {
  const d = ZONE_SOIL_DATA[zoneName];
  if (!d) return [];
  const entries = [
    { detail: "H_HAR",  display: "H",   name: "토양 경도 불량",      score: d.hardnessScore },
    { detail: "TEX_TX", display: "TEX", name: "부적정 토성",          score: d.textureScore  },
    { detail: "SOM_OM", display: "OM",  name: "유기물 부족",          score: d.somScore      },
    { detail: "PH_AC",  display: "PH",  name: "pH 이상",              score: d.phScore       },
    { detail: "EC_SAL", display: "SAL", name: "염류·전기전도도 과다", score: d.ecScore       },
    { detail: "CEC_LO", display: "CEC", name: "양이온치환용량 부족",  score: d.cecScore      },
  ];
  return entries
    .filter((e) => e.score < 5)
    .map((e) => ({ detailCode: e.detail, displayCode: e.display, causeName: e.name, severity: _severity(e.score) }));
}
