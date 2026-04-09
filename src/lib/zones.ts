// src/lib/zones.ts
// 세 화면(SoilManagement 점검구역탭, 토양등급지도, TreeInventory 토양지도)이 공유하는
// 공통 구역 정규화 로직 — zones.geojson location_type 기준 5개 구역

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
