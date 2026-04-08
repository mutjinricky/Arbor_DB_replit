import { useState, useEffect, useMemo } from "react";
import {
  Sprout, Search, Download, MapPin, CheckCircle2, Eye, AlertTriangle,
  Star, ChevronRight, Info, History, BarChart3,
} from "lucide-react";
import Map, { NavigationControl } from "react-map-gl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TreeLayer from "@/components/TreeLayer";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import {
  calculateIQTRI, calculateSoilScore, calculatePestControl,
  calculateSoilCauses,
  SOIL_COLORS, SOIL_LABELS,
  type SoilGrade, type TreeFullData,
  type RiskGrade, type PestGrade,
  type CauseChip,
} from "@/lib/riskCalculations";
import { CauseChips } from "@/components/CauseChips";
import { useWeatherData } from "@/hooks/useWeatherData";

// ─── 기존 프로젝트 이력 (Projects.tsx / ProjectDetail.tsx 동일 데이터) ──────
const PROJECT_HISTORY = [
  {
    id: "P-001", name: "산수유 마을 가지치기",
    type: "가지치기", status: "in_progress" as const,
    period: "2024-03-01 ~ 2024-05-31",
    contractor: "그린케어 수목병원", budget: 45000000,
    result: "시행 중 — 1~2단계 완료",
    zoneKeywords: ["주거", "마을"],
  },
  {
    id: "P-002", name: "병해충 방제",
    type: "병해충 방제", status: "bidding" as const,
    period: "2024-04-01 ~ 2024-04-30",
    contractor: "에코페스트 솔루션", budget: 28000000,
    result: "입찰 진행 중",
    zoneKeywords: ["도로", "간선"],
  },
  {
    id: "P-003", name: "수목 건강 조사 1분기",
    type: "조사·진단", status: "completed" as const,
    period: "2024-01-01 ~ 2024-03-15",
    contractor: "서울 수목 진단", budget: 15000000,
    result: "완료 — D등급 127주 확인",
    zoneKeywords: [],
  },
  {
    id: "P-004", name: "긴급 수목 제거",
    type: "제거", status: "planning" as const,
    period: "2024-04-15 ~ 2024-04-25",
    contractor: "세이프트리 긴급 서비스", budget: 12000000,
    result: "계획 중",
    zoneKeywords: ["학교"],
  },
];

// ─── 헬퍼: 필요 사업 (K-UTSI 등급 + 원인칩 기반) ───────────────────────────
function getRequiredWorks(grade: SoilGrade, chips: CauseChip[]): string[] {
  const works: string[] = [];
  if (grade === "E") works.push("긴급 토양 개량");
  if (grade === "D") works.push("토양 개량 사업");
  if (grade === "C") works.push("정밀 진단");
  const codes = chips.map((c) => c.displayCode);
  if (codes.includes("OM"))  works.push("유기물 개선·시비");
  if (codes.includes("PH"))  works.push("pH 교정");
  if (codes.includes("SAL")) works.push("염류 세척·제거");
  if (codes.includes("CEC")) works.push("토양 개량제 투입");
  if (codes.includes("H"))   works.push("경반층 파쇄");
  if (codes.includes("TEX")) works.push("토성 개선");
  return works.length > 0 ? works : ["현상 유지"];
}

// ─── 타입 ────────────────────────────────────────────────────────────────────
interface EnrichedTree {
  id: string; species: string; district: string;
  lat: number; lng: number;
  soilScore: number; soilGrade: SoilGrade;
  causeChips: CauseChip[];
  requiredWorks: string[];
  iqtriScore: number; iqtriGrade: RiskGrade;
  pestGrade: PestGrade; pestName: string; pestDays: number;
  priority: "urgent" | "watch" | "normal";
}

interface ZoneData {
  name: string;
  total: number; aCount: number; bCount: number; cCount: number;
  dCount: number; eCount: number;
  avgScore: number;
  causeCodes: Record<string, number>;
  isHighTraffic: boolean;
  priorityScore: number;
  requiredWorks: string[];
  trees: EnrichedTree[];
  linkedProjects: typeof PROJECT_HISTORY;
}

const GRADE_FILTER_OPTIONS = [
  { key: "all",    label: "전체",    color: "" },
  { key: "normal", label: "정상",    color: "#22c55e" },
  { key: "watch",  label: "관찰",    color: "#eab308" },
  { key: "action", label: "조치 필요", color: "#f97316" },
] as const;

const STATUS_META = {
  in_progress: { label: "진행 중",   cls: "bg-blue-100 text-blue-700"   },
  bidding:     { label: "입찰",      cls: "bg-amber-100 text-amber-700" },
  completed:   { label: "완료",      cls: "bg-green-100 text-green-700" },
  planning:    { label: "검토대기",  cls: "bg-slate-100 text-slate-700" },
};

const STATUS_ORDER: Record<string, number> = {
  bidding: 0, in_progress: 1, planning: 2, completed: 3,
};

// ─── 구역명 정규화 ───────────────────────────────────────────────────────────
function normalizeZone(district: string): string {
  if (!district) return "기타";
  if (district.includes("아파트") || district.includes("단지")) return "아파트 단지";
  if (district.includes("주거") || district.includes("마을")) return "주거지역";
  if (district.includes("간선") || district.includes("대로")) return "간선도로";
  if (district.includes("도로") || district.includes("도로변")) return "도로변";
  if (district.includes("학교") || district.includes("놀이터")) return "학교·놀이터";
  if (district.includes("공원") || district.includes("산책")) return "공원·산책로";
  return district.slice(0, 8);
}

function isHighTrafficZone(zoneName: string): boolean {
  return ["아파트 단지", "주거지역", "간선도로", "학교·놀이터"].includes(zoneName);
}

function getLinkedProjects(zoneName: string) {
  return PROJECT_HISTORY
    .filter((p) =>
      p.zoneKeywords.length === 0 ||
      p.zoneKeywords.some((kw) => zoneName.includes(kw) || kw.includes(zoneName.slice(0, 2)))
    )
    .sort((a, b) => {
      const so = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      if (so !== 0) return so;
      const dateA = a.period.split(" ~ ")[0] ?? "";
      const dateB = b.period.split(" ~ ")[0] ?? "";
      return dateB.localeCompare(dateA);
    });
}

// ─── 등급 배지 ───────────────────────────────────────────────────────────────
function SoilBadge({ grade }: { grade: SoilGrade }) {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[11px] font-black shadow-sm"
      style={{ backgroundColor: SOIL_COLORS[grade] }}
    >
      {grade}
    </span>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function SoilManagement() {
  const [rawTreesJson, setRawTreesJson] = useState<Record<string, TreeFullData> | null>(null);
  const [rawGeoJson, setRawGeoJson] = useState<any>(null);
  const [mapState, setMapState] = useState({ longitude: 127.4704, latitude: 37.34111, zoom: 13 });
  const [gradeFilter, setGradeFilter] = useState<"all" | "normal" | "watch" | "action">("all");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneTab, setZoneTab] = useState<"overview" | "history">("overview");
  const [treeSearch, setTreeSearch] = useState("");
  const [cursor, setCursor] = useState("grab");
  const { pestDDs } = useWeatherData();

  useEffect(() => {
    Promise.all([
      fetch("/data/trees.geojson").then((r) => r.json()),
      fetch("/data/trees.json").then((r) => r.json()),
    ]).then(([geojson, treesJson]) => {
      setRawGeoJson(geojson);
      setRawTreesJson(treesJson);
    }).catch((e) => console.error(e));
  }, []);

  // ── enriched tree list ────────────────────────────────────────────────────
  const enrichedTrees = useMemo<EnrichedTree[]>(() => {
    if (!rawTreesJson) return [];
    return Object.entries(rawTreesJson).map(([id, tree]) => {
      const soil  = calculateSoilScore(id, tree);
      const iqtri = calculateIQTRI(tree);
      const pest  = calculatePestControl(id, pestDDs as any);
      const chips = calculateSoilCauses(tree);
      const works = getRequiredWorks(soil.grade, chips);
      const priority: EnrichedTree["priority"] =
        soil.grade === "D" || soil.grade === "E" ? "urgent" :
        soil.grade === "C" ? "watch" : "normal";
      return {
        id, species: tree.species || "", district: tree.district || "",
        lat: tree.lat, lng: tree.lng,
        soilScore: soil.score, soilGrade: soil.grade,
        causeChips: chips, requiredWorks: works,
        iqtriScore: iqtri.score, iqtriGrade: iqtri.grade,
        pestGrade: pest.grade, pestName: pest.pestName, pestDays: pest.daysUntilControl,
        priority,
      };
    });
  }, [rawTreesJson, pestDDs]);

  // ── zones ─────────────────────────────────────────────────────────────────
  const zones = useMemo<ZoneData[]>(() => {
    const map: Record<string, EnrichedTree[]> = {};
    enrichedTrees.forEach((t) => {
      const zone = normalizeZone(t.district);
      if (!map[zone]) map[zone] = [];
      map[zone].push(t);
    });
    return Object.entries(map).map(([name, trees]) => {
      const total    = trees.length;
      const aCount   = trees.filter((t) => t.soilGrade === "A").length;
      const bCount   = trees.filter((t) => t.soilGrade === "B").length;
      const cCount   = trees.filter((t) => t.soilGrade === "C").length;
      const dCount   = trees.filter((t) => t.soilGrade === "D").length;
      const eCount   = trees.filter((t) => t.soilGrade === "E").length;
      const avgScore = Math.round(trees.reduce((s, t) => s + t.soilScore, 0) / total);
      // 구역 원인코드 집계: causeName → count
      const causeCodes: Record<string, number> = {};
      trees.forEach((t) => t.causeChips.forEach((c) => { causeCodes[c.causeName] = (causeCodes[c.causeName] || 0) + 1; }));
      const highTraffic    = isHighTrafficZone(name);
      const linkedProjects = getLinkedProjects(name);

      const deRatio      = (dCount + eCount) / total;
      const avgChipCount = trees.reduce((s, t) => s + t.causeChips.length, 0) / total;
      let score = 0;
      score += deRatio * 100;
      score += cCount / total * 30;
      score += avgChipCount * 10;
      if (highTraffic) score += 20;

      const allWorks = Array.from(new Set(trees.flatMap((t) => t.requiredWorks)));
      return {
        name, total, aCount, bCount, cCount, dCount, eCount, avgScore,
        causeCodes, isHighTraffic: highTraffic,
        priorityScore: Math.max(0, Math.round(score)),
        requiredWorks: allWorks,
        trees,
        linkedProjects,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [enrichedTrees]);

  // ── enriched GeoJSON for map ──────────────────────────────────────────────
  const enrichedGeoJson = useMemo(() => {
    if (!rawGeoJson || !rawTreesJson) return null;
    return {
      ...rawGeoJson,
      features: rawGeoJson.features.map((f: any) => {
        const id = f.properties?.id || "";
        const tree = rawTreesJson[id];
        const soil = calculateSoilScore(id, tree);
        const iqtri = tree ? calculateIQTRI(tree) : { score: 0, grade: "low" as RiskGrade };
        const pest = calculatePestControl(id, pestDDs as any);
        return {
          ...f, properties: {
            ...f.properties,
            soilScore: soil.score, soilGrade: soil.grade,
            iqtriScore: iqtri.score, iqtriGrade: iqtri.grade,
            pestGrade: pest.grade, pestName: pest.pestName, pestDays: pest.daysUntilControl,
          },
        };
      }),
    };
  }, [rawGeoJson, rawTreesJson, pestDDs]);

  // ── grade-filter applied ids ──────────────────────────────────────────────
  const gradeFilteredIds = useMemo<string[] | null>(() => {
    if (gradeFilter === "all") return null;
    const grades: SoilGrade[] = gradeFilter === "normal" ? ["A", "B"] : gradeFilter === "watch" ? ["C"] : ["D", "E"];
    return enrichedTrees.filter((t) => grades.includes(t.soilGrade)).map((t) => t.id);
  }, [gradeFilter, enrichedTrees]);

  // ── selected zone ──────────────────────────────────────────────────────────
  const selectedZoneData = useMemo(() => zones.find((z) => z.name === selectedZone) ?? zones[0] ?? null, [zones, selectedZone]);

  // ── summary stats ─────────────────────────────────────────────────────────
  const total = enrichedTrees.length;
  const normalCount = enrichedTrees.filter((t) => ["A", "B"].includes(t.soilGrade)).length;
  const watchCount  = enrichedTrees.filter((t) => t.soilGrade === "C").length;
  const actionCount = enrichedTrees.filter((t) => ["D", "E"].includes(t.soilGrade)).length;
  const topZone = zones[0]?.name ?? "—";

  // ── tree list with search/filter ──────────────────────────────────────────
  const filteredTreeList = useMemo(() => {
    const q = treeSearch.trim().toLowerCase();
    let list = enrichedTrees;
    if (selectedZone) list = list.filter((t) => normalizeZone(t.district) === selectedZone);
    if (q) list = list.filter((t) =>
      t.id.toLowerCase().includes(q) ||
      normalizeZone(t.district).includes(q) ||
      t.species.toLowerCase().includes(q) ||
      t.causeChips.map((c) => c.causeName).join(" ").includes(q)
    );
    return [...list].sort((a, b) => a.soilScore - b.soilScore).slice(0, 80);
  }, [enrichedTrees, selectedZone, treeSearch]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-5">

        {/* ── 헤더 ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sprout className="h-6 w-6 text-green-600" />
              토양 관리
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              K-UTSI 기반 이천시 수목 토양 건전성 현황 및 우선 점검 구역 선정
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="text-sm rounded-lg border border-input px-3 py-1.5 bg-white dark:bg-slate-900">
              <option>이천시 전체</option>
              <option>부발읍</option>
              <option>신둔면</option>
            </select>
            <span className="text-xs text-muted-foreground px-2 py-1.5 rounded-lg border border-input bg-white dark:bg-slate-900">
              기준일: 2026-04-06
            </span>
            <button
              data-testid="button-excel-download"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-input bg-white dark:bg-slate-900 hover:bg-slate-50 transition-colors font-medium"
            >
              <Download className="h-4 w-4 text-green-600" />
              엑셀 다운로드
            </button>
          </div>
        </div>

        {/* ── 요약 카드 5개 ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "총 수목",      value: total.toLocaleString(),       unit: "주",  color: "#6366f1", icon: <Sprout className="h-4 w-4" /> },
            { label: "정상 (A/B)",   value: normalCount.toLocaleString(),  unit: "주",  color: "#22c55e", icon: <CheckCircle2 className="h-4 w-4" /> },
            { label: "관찰 (C)",     value: watchCount.toLocaleString(),   unit: "주",  color: "#eab308", icon: <Eye className="h-4 w-4" /> },
            { label: "조치 필요(D/E)", value: actionCount.toLocaleString(), unit: "주",  color: "#f97316", icon: <AlertTriangle className="h-4 w-4" /> },
            { label: "최우선 점검 구역", value: topZone,                   unit: "",    color: "#dc2626", icon: <Star className="h-4 w-4" /> },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white dark:bg-slate-900 border shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground font-medium leading-tight">{s.label}</span>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + "20", color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-xl font-black tabular-nums leading-tight" style={{ color: s.color }}>{s.value}</p>
              {s.unit && <p className="text-[10px] text-muted-foreground">{s.unit}</p>}
            </div>
          ))}
        </div>

        {/* ── 2단 레이아웃 ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">

          {/* ══ 좌측 컬럼 ══════════════════════════════════════════════ */}
          <div className="space-y-5">

            {/* ① 토양 등급 지도 */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-green-500 inline-block" />
                    토양 등급 지도
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {GRADE_FILTER_OPTIONS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setGradeFilter(f.key as any)}
                        data-testid={`filter-soil-${f.key}`}
                        className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                          gradeFilter === f.key ? "text-white border-transparent" : "bg-white dark:bg-slate-900 text-muted-foreground border-border"
                        }`}
                        style={gradeFilter === f.key ? { backgroundColor: f.color || "#6366f1" } : {}}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-full h-[360px] overflow-hidden rounded-b-2xl">
                  {MAPBOX_TOKEN ? (
                    <Map
                      {...mapState}
                      onMove={(e) => setMapState(e.viewState)}
                      mapStyle="mapbox://styles/mapbox/streets-v12"
                      mapboxAccessToken={MAPBOX_TOKEN}
                      interactiveLayerIds={["trees-point"]}
                      cursor={cursor}
                      onMouseEnter={() => setCursor("pointer")}
                      onMouseLeave={() => setCursor("grab")}
                    >
                      <NavigationControl position="top-right" />
                      {enrichedGeoJson && (
                        <TreeLayer
                          treesData={enrichedGeoJson}
                          mapMode="soil"
                          filteredIds={gradeFilteredIds}
                          selectedTreeIds={[]}
                        />
                      )}
                    </Map>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30">
                      <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">VITE_MAPBOX_TOKEN을 설정해주세요</p>
                    </div>
                  )}

                  {/* 범례 (우하단 고정) */}
                  <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl border shadow-md px-3 py-2 z-10">
                    <p className="text-[10px] font-bold text-muted-foreground mb-1.5">토양 등급</p>
                    {(["A", "B", "C", "D", "E"] as SoilGrade[]).map((g) => (
                      <div key={g} className="flex items-center gap-2 mb-0.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                          style={{ backgroundColor: SOIL_COLORS[g] }}>{g}</div>
                        <span className="text-[10px] text-muted-foreground">{SOIL_LABELS[g].split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ② 수목 상세 목록 */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-slate-500" />
                    수목 상세 목록
                    {selectedZone && <span className="text-[11px] text-muted-foreground font-normal">— {selectedZone}</span>}
                  </CardTitle>
                  {selectedZone && (
                    <button onClick={() => setSelectedZone(null)} className="text-xs text-muted-foreground hover:text-foreground">
                      구역 필터 해제
                    </button>
                  )}
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text" value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    placeholder="수목 ID / 구역명 / 수종 / 원인 검색"
                    data-testid="input-tree-list-search"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b bg-slate-50 dark:bg-slate-800/80">
                        {["수목 ID", "위치", "등급", "원인", "필요 사업", "우선순위"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTreeList.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-xs">로딩 중…</td></tr>
                      ) : filteredTreeList.map((t) => (
                        <tr
                          key={t.id}
                          data-testid={`row-soil-tree-${t.id}`}
                          className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-3 py-2 font-mono font-semibold text-primary">{t.id}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{normalizeZone(t.district)}</td>
                          <td className="px-3 py-2"><SoilBadge grade={t.soilGrade} /></td>
                          <td className="px-3 py-2">
                            <CauseChips
                              chips={[...t.causeChips.filter((c) => c.severity !== "경")].sort(
                                (a, b) => (a.severity === "심" ? 0 : 1) - (b.severity === "심" ? 0 : 1)
                              )}
                              maxVisible={3}
                            />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{t.requiredWorks[0]}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              t.priority === "urgent" ? "bg-red-100 text-red-700" :
                              t.priority === "watch"  ? "bg-amber-100 text-amber-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              {t.priority === "urgent" ? "긴급" : t.priority === "watch" ? "관찰" : "정상"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredTreeList.length >= 80 && (
                  <p className="text-[10px] text-center text-muted-foreground py-1.5 border-t">검색으로 범위를 좁혀 전체 결과를 확인하세요</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ══ 우측 컬럼 ══════════════════════════════════════════════ */}
          <div className="space-y-5">

            {/* ① 점검대상구역 카드 목록 */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  점검대상구역
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {zones.slice(0, 6).map((z, i) => {
                  const isSelected = selectedZone === z.name;
                  return (
                    <div
                      key={z.name}
                      onClick={() => { setSelectedZone(z.name); setZoneTab("overview"); }}
                      data-testid={`card-zone-${z.name}`}
                      className={`rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-md" : "bg-white dark:bg-slate-900 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-sm ${
                          i === 0 ? "bg-red-500" : i === 1 ? "bg-orange-500" : "bg-amber-400"
                        }`}>{i + 1}</span>
                        <p className="text-sm font-bold leading-none">{z.name}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {(["C", "D", "E"] as SoilGrade[]).map((g) => {
                          const cnt = g === "C" ? z.cCount : g === "D" ? z.dCount : z.eCount;
                          if (cnt === 0) return null;
                          return (
                            <span key={g} className="flex items-center gap-0.5">
                              <SoilBadge grade={g} />
                              <span className="text-[10px] text-muted-foreground">{cnt}주</span>
                            </span>
                          );
                        })}
                        <span className="text-[10px] text-muted-foreground ml-auto">총 {z.total}주</span>
                        {z.linkedProjects.some((p) => p.status === "in_progress") && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">진행 중 사업</span>
                        )}
                      </div>

                      {isSelected && <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* ② 선택 구역 상세 */}
            {selectedZoneData && (
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-indigo-500" />
                      {selectedZoneData.name}
                    </CardTitle>
                    <div className="flex gap-0.5 text-[11px]">
                      {(["overview", "history"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setZoneTab(tab)}
                          data-testid={`tab-zone-${tab}`}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            zoneTab === tab ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab === "overview" ? "개요" : "사업 이력"}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3">

                  {/* 개요 탭 */}
                  {zoneTab === "overview" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "총 수목",  value: `${selectedZoneData.total}주` },
                          { label: "최근 사업", value: selectedZoneData.linkedProjects.find((p) => p.status === "in_progress")?.name ?? "없음" },
                        ].map((s) => (
                          <div key={s.label} className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2">
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                            <p className="text-sm font-bold mt-0.5 truncate">{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* 등급 분포 바 */}
                      <div>
                        <p className="text-xs font-semibold mb-1.5">등급 분포</p>
                        <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
                          {(["A","B","C","D","E"] as SoilGrade[]).map((g) => {
                            const cnt = { A: selectedZoneData.aCount, B: selectedZoneData.bCount, C: selectedZoneData.cCount, D: selectedZoneData.dCount, E: selectedZoneData.eCount }[g];
                            const pct = (cnt / selectedZoneData.total) * 100;
                            if (pct === 0) return null;
                            return (
                              <div key={g} className="flex items-center justify-center text-white text-[9px] font-bold"
                                style={{ backgroundColor: SOIL_COLORS[g], width: `${pct}%` }}>
                                {pct >= 10 ? g : ""}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                          {(["A","B","C","D","E"] as SoilGrade[]).map((g) => {
                            const cnt = { A: selectedZoneData.aCount, B: selectedZoneData.bCount, C: selectedZoneData.cCount, D: selectedZoneData.dCount, E: selectedZoneData.eCount }[g];
                            if (!cnt) return null;
                            return <span key={g}><span style={{ color: SOIL_COLORS[g] }}>{g}</span>{cnt}</span>;
                          })}
                        </div>
                      </div>

                      {/* 원인코드 현황: 구역 내 수목 chips 집계 */}
                      {(() => {
                        const dedup: Record<string, CauseChip> = {};
                        const sev: Record<string, number> = { "심": 0, "중": 1, "경": 2 };
                        selectedZoneData.trees.forEach((t) => t.causeChips.forEach((c) => {
                          const ex = dedup[c.displayCode];
                          if (!ex || sev[c.severity] < sev[ex.severity]) dedup[c.displayCode] = c;
                        }));
                        const zoneChips = Object.values(dedup);
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-semibold">원인코드 현황</p>
                              <span className="text-[10px] text-muted-foreground">{zoneChips.length}종 원인</span>
                            </div>
                            <CauseChips chips={zoneChips} size="md" />
                          </div>
                        );
                      })()}

                      {/* 필요 사업 */}
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold mb-1">필요 사업</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedZoneData.requiredWorks.slice(0, 5).map((w) => (
                            <span key={w} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{w}</span>
                          ))}
                        </div>
                      </div>

                      {/* 공무원 업무 메모 */}
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-3">
                        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5" />업무 메모
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          이 구역은 <strong>{Object.entries(selectedZoneData.causeCodes).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "복합"} 등 {Object.keys(selectedZoneData.causeCodes).length}종</strong> 원인이 나타나고 있어 우선 점검이 필요한 구역으로 판단했습니다.
                          발주 전에는 정밀진단 필요 여부와 현장 여건, 최근 사업 이력을 함께 확인하시기 바랍니다.
                        </p>
                      </div>
                    </>
                  )}

                  {/* 사업 이력 탭 */}
                  {zoneTab === "history" && (
                    <div className="space-y-3">
                      {selectedZoneData.linkedProjects.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-xs">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          연결된 사업 이력이 없습니다
                        </div>
                      ) : selectedZoneData.linkedProjects.map((p) => {
                        const meta = STATUS_META[p.status];
                        return (
                          <div key={p.id} className="rounded-xl border bg-white dark:bg-slate-900 p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[10px] font-mono text-muted-foreground">{p.id}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${meta.cls}`}>{meta.label}</span>
                                </div>
                                <p className="text-sm font-bold leading-tight">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{p.period}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 text-[10px] text-muted-foreground pt-1.5 border-t">
                              <span>유형: <strong className="text-foreground">{p.type}</strong></span>
                              <span>시공: <strong className="text-foreground">{p.contractor}</strong></span>
                              <span>예산: <strong className="text-foreground">{(p.budget/1e6).toFixed(0)}백만원</strong></span>
                              <span>결과: <strong className="text-foreground">{p.result}</strong></span>
                            </div>

                            {/* 작업 전/중/후 사진 슬롯 */}
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground mb-1">작업 사진</p>
                              <div className="grid grid-cols-3 gap-1.5">
                                {["작업 전", "작업 중", "작업 후"].map((label) => (
                                  <div key={label} className="rounded-lg bg-slate-100 dark:bg-slate-800 aspect-square flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-600">
                                    <span className="text-[9px] text-muted-foreground">{label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
