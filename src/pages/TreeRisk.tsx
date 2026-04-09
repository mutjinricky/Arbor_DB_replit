import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, AlertTriangle, Eye, Layers, ArrowUpDown, TreePine, TrendingUp, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import MapGL, { NavigationControl } from "react-map-gl";
import TreeLayer from "@/components/TreeLayer";
import { TreeProfileModal } from "@/components/TreeProfileModal";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { calculateTreeRiskGrade, type TreeFullData } from "@/lib/riskCalculations";

// ─── 타입 ──────────────────────────────────────────────────────────────────────
type RiskGrade = "extreme" | "high" | "moderate" | "low";

type EnrichedTree = {
  id: string;
  species: string;
  district: string;
  diameterCm: number;
  risk: string;
  age: number;
  riskGrade: RiskGrade;
  visualGrade: RiskGrade;
  decayGrade: RiskGrade;
  tiltGrade: RiskGrade;
  visualValue: string;
  decayValue: number;
  tiltValue: number;
};

// ─── 등급 스타일 상수 ──────────────────────────────────────────────────────────
const GRADE_META: Record<RiskGrade, { label: string; color: string; bg: string; border: string; text: string }> = {
  extreme: { label: "극심",  color: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "text-red-700"    },
  high:    { label: "심",    color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", text: "text-orange-700" },
  moderate:{ label: "중",    color: "#ca8a04", bg: "#fefce8", border: "#fef08a", text: "text-yellow-700" },
  low:     { label: "경",    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "text-green-700"  },
};

const PIE_COLORS = ["#dc2626", "#ea580c", "#ca8a04", "#16a34a"];

const RISK_FILTER_OPTIONS = [
  { key: "all",      label: "전체",  color: "" },
  { key: "extreme",  label: "극심",  color: "#dc2626" },
  { key: "high",     label: "심",    color: "#f97316" },
  { key: "moderate", label: "중",    color: "#eab308" },
  { key: "low",      label: "경",    color: "#22c55e" },
] as const;

// ─── 최종 위험 등급 뱃지 ──────────────────────────────────────────────────────
function RiskGradeBadge({ grade }: { grade: RiskGrade }) {
  const meta = GRADE_META[grade];
  const actionText = grade === "extreme" ? "즉시 조치 필요" : grade === "high" ? "우선 점검 대상" : grade === "moderate" ? "정기 모니터링" : "정상 관리";
  return (
    <div className="flex flex-col items-center gap-2 min-w-[100px]">
      <div
        className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-4"
        style={{ borderColor: meta.color, backgroundColor: meta.bg }}
      >
        <span className="text-2xl font-black" style={{ color: meta.color }}>{meta.label}</span>
        <span className="text-[10px] text-muted-foreground font-medium">위험 등급</span>
      </div>
      <span className="text-[11px] text-center text-muted-foreground">{actionText}</span>
    </div>
  );
}

// ─── 지표 카드 컴포넌트 ───────────────────────────────────────────────────────
function IndicatorCard({ label, valueText, grade, icon, desc, color }: {
  label: string;
  valueText: string;
  grade: RiskGrade;
  icon: React.ReactNode;
  desc: string;
  color: string;
}) {
  const gradeMeta = GRADE_META[grade];
  return (
    <div className="flex-1 rounded-2xl border p-4 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
            <span style={{ color }}>{icon}</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">{label}</span>
        </div>
        <span className="text-2xl font-black" style={{ color }}>{valueText}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">{desc}</p>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: gradeMeta.color }}>
        {gradeMeta.label}
      </span>
    </div>
  );
}

// ─── 커스텀 Pie 레이블 ────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, outerRadius, percent, name }: any) {
  if (percent < 0.05) return null;
  const RAD = Math.PI / 180;
  const r = outerRadius + 22;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} fill="#64748b" fontSize={11} fontWeight={600}>
      {name}
    </text>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function TreeRisk() {
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResult, setSearchResult] = useState<EnrichedTree | null | "notfound">(null);
  const [filter, setFilter]             = useState<"all" | "산수유 나무">("all");
  const [tableOpen, setTableOpen]       = useState(false);

  // ── 모달 ────────────────────────────────────────────────────────────────────
  const [selectedTreeId, setSelectedTreeId]     = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // ── 위험도 지도 상태 ────────────────────────────────────────────────────────
  const [rawGeoJson, setRawGeoJson]           = useState<any>(null);
  const [rawTreesJson, setRawTreesJson]       = useState<Record<string, TreeFullData> | null>(null);
  const [mapState, setMapState]               = useState({ longitude: 127.4704, latitude: 37.34111, zoom: 13 });
  const [riskGradeFilter, setRiskGradeFilter] = useState<"all" | "extreme" | "high" | "moderate" | "low">("all");
  const [mapCursor, setMapCursor]             = useState("grab");
  const [hoveredTree, setHoveredTree]         = useState<{
    id: string; species: string; riskGrade: RiskGrade;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/trees.geojson").then(r => r.json()),
      fetch("/data/trees.json").then(r => r.json()),
    ]).then(([geojson, treesJson]: [any, Record<string, TreeFullData>]) => {
      setRawGeoJson(geojson);
      setRawTreesJson(treesJson);
    }).catch(e => console.error(e));
  }, []);

  const riskEnrichedGeoJson = useMemo(() => {
    if (!rawGeoJson || !rawTreesJson) return null;
    const features = rawGeoJson.features
      .filter((f: any) => f.properties && f.geometry)
      .map((f: any) => {
        const id = f.properties?.id;
        const tree = id ? rawTreesJson[id] : null;
        if (!tree) return f;
        const { grade } = calculateTreeRiskGrade(tree);
        return { ...f, properties: { ...f.properties, riskGrade: grade } };
      });
    return { ...rawGeoJson, features };
  }, [rawGeoJson, rawTreesJson]);

  const riskFilteredIds = useMemo(() => {
    if (!riskEnrichedGeoJson || riskGradeFilter === "all") return null;
    return riskEnrichedGeoJson.features
      .filter((f: any) => f.properties?.riskGrade === riskGradeFilter)
      .map((f: any) => f.properties?.id as string);
  }, [riskEnrichedGeoJson, riskGradeFilter]);

  // 실제 수목 데이터 — trees.json을 단일 소스로 사용
  const realTreesWithRisk = useMemo<EnrichedTree[]>(() => {
    if (!rawTreesJson) return [];
    return Object.entries(rawTreesJson).map(([id, tree]) => {
      const { grade, visualGrade, decayGrade, tiltGrade, visualValue, decayValue, tiltValue } = calculateTreeRiskGrade(tree);
      return {
        id,
        species: tree.species || "",
        district: tree.district || "",
        diameterCm: tree.diameter || 0,
        risk: tree.risk || "",
        age: tree.age || 0,
        riskGrade: grade,
        visualGrade,
        decayGrade,
        tiltGrade,
        visualValue,
        decayValue: parseFloat(decayValue.toFixed(1)),
        tiltValue: parseFloat(tiltValue.toFixed(1)),
      };
    });
  }, [rawTreesJson]);

  // 검색 실행 + 지도 이동
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return;
    const found = realTreesWithRisk.find(t =>
      t.id.toUpperCase() === q ||
      t.id.replace("IC-", "").replace(/^0+/, "") === q.replace("IC-", "").replace(/^0+/, "")
    );
    setSearchResult(found ?? "notfound");
    if (found && rawGeoJson) {
      const feature = rawGeoJson.features.find((f: any) => f.properties?.id === found.id);
      if (feature?.geometry?.coordinates) {
        const [lng, lat] = feature.geometry.coordinates;
        setMapState({ longitude: lng, latitude: lat, zoom: 19 });
      }
    }
  }, [searchQuery, realTreesWithRisk, rawGeoJson]);

  // 지도 이벤트 핸들러
  const onTreeLayerClick = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      const id = event.features[0].properties?.id;
      if (id) { setSelectedTreeId(id); setProfileModalOpen(true); }
    }
  }, []);

  const onTreeLayerHover = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      const p = event.features[0].properties || {};
      const rect = event.target.getContainer().getBoundingClientRect();
      setMapCursor("pointer");
      setHoveredTree({
        id: p.id || "",
        species: p.species || "",
        riskGrade: (p.riskGrade || "low") as RiskGrade,
        position: {
          x: (event.point.x / rect.width)  * 100,
          y: (event.point.y / rect.height) * 100,
        },
      });
    } else {
      setMapCursor("grab");
      setHoveredTree(null);
    }
  }, []);

  const onTreeLayerLeave = useCallback(() => {
    setHoveredTree(null);
    setMapCursor("grab");
  }, []);

  // 필터된 수목 목록
  const filteredTrees = useMemo(
    () => filter === "all" ? realTreesWithRisk : realTreesWithRisk.filter(t => t.species === "산수유 나무"),
    [filter, realTreesWithRisk],
  );

  // 파이차트 데이터 (위험도 등급별 수목 수)
  const pieData = useMemo(() => {
    const counts: Record<RiskGrade, number> = { extreme: 0, high: 0, moderate: 0, low: 0 };
    filteredTrees.forEach(t => counts[t.riskGrade]++);
    return [
      { name: "극심",  value: counts.extreme,  grade: "extreme"  as RiskGrade },
      { name: "심",    value: counts.high,     grade: "high"     as RiskGrade },
      { name: "중",    value: counts.moderate, grade: "moderate" as RiskGrade },
      { name: "경",    value: counts.low,      grade: "low"      as RiskGrade },
    ].filter(d => d.value > 0);
  }, [filteredTrees]);

  // 막대차트 데이터 (3대 지표별 심 이상 수목 수)
  const barData = useMemo(() => {
    const visualHigh = filteredTrees.filter(t => t.visualGrade === "high" || t.visualGrade === "extreme").length;
    const decayHigh  = filteredTrees.filter(t => t.decayGrade  === "high" || t.decayGrade  === "extreme").length;
    const tiltHigh   = filteredTrees.filter(t => t.tiltGrade   === "high" || t.tiltGrade   === "extreme").length;
    return [
      { factor: "육안진단", value: visualHigh, color: "#ef4444", desc: "육안진단 심 이상" },
      { factor: "부후도",   value: decayHigh,  color: "#f97316", desc: "부후도 40% 이상"  },
      { factor: "기울기",   value: tiltHigh,   color: "#8b5cf6", desc: "기울기 15% 이상"  },
    ];
  }, [filteredTrees]);

  // 전체 요약 통계
  const stats = useMemo(() => {
    const total    = filteredTrees.length;
    const extreme  = filteredTrees.filter(t => t.riskGrade === "extreme").length;
    const highRisk = filteredTrees.filter(t => t.riskGrade === "high" || t.riskGrade === "extreme").length;
    const lowRisk  = filteredTrees.filter(t => t.riskGrade === "low").length;
    return { total, extreme, highRisk, lowRisk };
  }, [filteredTrees]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── 페이지 헤더 ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              수목 위험도 분석
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              이천시 수목 위험도 지수 현황
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">관리 수목 총계</p>
            <p className="text-2xl font-black text-primary">2,985</p>
          </div>
        </div>

        {/* ── 수목 ID 검색 ── */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6 pb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="수목 ID 검색 (예: 1349)"
                  data-testid="input-tree-search"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-input bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                data-testid="button-tree-search"
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                조회
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ── 검색 결과: 위험도 카드 ── */}
        {searchResult === "notfound" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 font-medium text-center">
            수목 ID를 찾을 수 없습니다. 수목 재고 관리 탭에서 ID를 확인해 주세요.
          </div>
        )}

        {searchResult && searchResult !== "notfound" && (() => {
          const t = searchResult;
          const meta = GRADE_META[t.riskGrade];
          return (
            <div
              className="rounded-2xl border-2 p-5 shadow-lg animate-in fade-in slide-in-from-top-2"
              style={{ borderColor: meta.border, backgroundColor: meta.bg }}
            >
              <div className="flex items-start gap-2 mb-4">
                <TreePine className="h-5 w-5 mt-0.5" style={{ color: meta.color }} />
                <div>
                  <p className="font-bold text-sm">{t.id} — {t.species}</p>
                  <p className="text-xs text-muted-foreground">{t.district} · 흉고직경 {t.diameterCm}cm · 수령 {t.age}년</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* 최종 등급 뱃지 */}
                <RiskGradeBadge grade={t.riskGrade} />

                {/* 3대 지표 카드 */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                  <IndicatorCard
                    label="육안진단"
                    valueText={t.visualValue}
                    grade={t.visualGrade}
                    icon={<Eye className="h-4 w-4" />}
                    desc="수목 외관 상태 (경/중/심/극심)"
                    color="#ef4444"
                  />
                  <IndicatorCard
                    label="수목 부후도"
                    valueText={`${t.decayValue}%`}
                    grade={t.decayGrade}
                    icon={<Layers className="h-4 w-4" />}
                    desc="목재 부후 비율 (≥50%: 극심)"
                    color="#f97316"
                  />
                  <IndicatorCard
                    label="수목 기울기"
                    valueText={`${t.tiltValue}%`}
                    grade={t.tiltGrade}
                    icon={<ArrowUpDown className="h-4 w-4" />}
                    desc="경사 기울기 비율 (≥25%: 극심)"
                    color="#8b5cf6"
                  />
                </div>
              </div>

            </div>
          );
        })()}

        {/* ── 수목위험도 지도 ── */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-red-500 inline-block" />
                수목위험도 지도
              </CardTitle>
              <div className="flex items-center gap-1">
                {RISK_FILTER_OPTIONS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setRiskGradeFilter(f.key as any)}
                    data-testid={`filter-risk-${f.key}`}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                      riskGradeFilter === f.key
                        ? "text-white border-transparent"
                        : "bg-white dark:bg-slate-900 text-muted-foreground border-border"
                    }`}
                    style={riskGradeFilter === f.key ? { backgroundColor: f.color || "#6366f1" } : {}}
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
                <MapGL
                  {...mapState}
                  onMove={(e: any) => setMapState(e.viewState)}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  mapboxAccessToken={MAPBOX_TOKEN}
                  interactiveLayerIds={["trees-point"]}
                  cursor={mapCursor}
                  onClick={onTreeLayerClick}
                  onMouseMove={onTreeLayerHover}
                  onMouseLeave={onTreeLayerLeave}
                >
                  <NavigationControl position="top-right" />
                  {riskEnrichedGeoJson && (
                    <TreeLayer
                      treesData={riskEnrichedGeoJson}
                      mapMode="risk"
                      filteredIds={riskFilteredIds}
                      selectedTreeIds={selectedTreeId ? [selectedTreeId] : []}
                    />
                  )}
                </MapGL>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">VITE_MAPBOX_TOKEN을 설정해주세요</p>
                </div>
              )}

              {/* hover 툴팁 */}
              {hoveredTree && (
                <div
                  className="absolute z-20 bg-card border border-border rounded-xl shadow-xl p-3 pointer-events-none min-w-[160px]"
                  style={{
                    left: `${hoveredTree.position.x}%`,
                    top:  `${hoveredTree.position.y}%`,
                    transform: "translate(-50%, -120%)",
                  }}
                >
                  <p className="font-semibold text-sm mb-1">{hoveredTree.species} · {hoveredTree.id}</p>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-bold text-white"
                    style={{ backgroundColor: GRADE_META[hoveredTree.riskGrade].color }}
                  >
                    위험도: {GRADE_META[hoveredTree.riskGrade].label}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">클릭하여 상세 정보 확인</p>
                </div>
              )}

              {/* 범례 (우하단 고정) */}
              <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-xl border shadow-md px-3 py-2 z-10">
                <p className="text-[10px] font-bold text-muted-foreground mb-1.5">수목 위험도 등급</p>
                {(["extreme", "high", "moderate", "low"] as const).map(g => (
                  <div key={g} className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-black"
                      style={{ backgroundColor: GRADE_META[g].color }}
                    />
                    <span className="text-[10px] text-muted-foreground">{GRADE_META[g].label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 필터 토글 ── */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">데이터 범위</span>
          <div className="flex gap-1.5 ml-2">
            {([
              { key: "all",  label: "수목 전체" },
              { key: "산수유 나무", label: "산수유 나무" },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                data-testid={`filter-${f.key}`}
                className={`text-xs px-4 py-1.5 rounded-full font-semibold border transition-all duration-200 ${
                  filter === f.key
                    ? "text-white border-transparent shadow-md"
                    : "bg-white dark:bg-slate-900 text-muted-foreground border-border hover:border-primary"
                }`}
                style={filter === f.key ? { backgroundColor: "#6366f1", boxShadow: "0 2px 10px #6366f150" } : {}}
              >
                {f.label}
                <span className={`ml-1.5 text-[10px] ${filter === f.key ? "opacity-80" : "text-muted-foreground"}`}>
                  ({f.key === "all" ? realTreesWithRisk.length : realTreesWithRisk.filter(t => t.species === "산수유 나무").length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 차트 대시보드 (1:1) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* 좌: 위험도 등급별 수목 수 (Doughnut) */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full inline-block bg-indigo-500" />
                수목 위험도 등급별 수목 수
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                {filter === "all" ? "전체 수목" : "산수유 나무"} · 총 {filteredTrees.length}주
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={PieLabel}
                    animationBegin={0}
                    animationDuration={600}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={GRADE_META[entry.grade].color} />
                    ))}
                  </Pie>
                  <ReTooltip
                    formatter={(value: number, name: string) => [`${value}주`, name]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* 범례 */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(["extreme","high","moderate","low"] as RiskGrade[]).map(g => {
                  const meta = GRADE_META[g];
                  const count = filteredTrees.filter(t => t.riskGrade === g).length;
                  return (
                    <div key={g} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
                      </div>
                      <span className="text-xs font-black tabular-nums" style={{ color: meta.color }}>{count}주</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 우: 주요 위험 요인 분포 (Bar) */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full inline-block bg-orange-500" />
                주요 위험 요인 분포
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                3대 지표별 심 이상(위험) 수목 수
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="factor"
                    tick={{ fontSize: 11, fontWeight: 600, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <ReTooltip
                    formatter={(value: number, _: string, entry: any) => [
                      `${value}주 (${entry.payload.desc})`,
                      entry.payload.factor,
                    ]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={600}>
                    {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* 지표 설명 */}
              <div className="space-y-1.5 mt-2">
                {[
                  { label: "육안진단", color: "#ef4444", desc: "육안 진단 등급 심(심) 이상 — 눈에 띄는 손상·부후 징후" },
                  { label: "부후도",   color: "#f97316", desc: "수목 부후 비율 40% 이상 — 목재 내부 부패 심각" },
                  { label: "기울기",   color: "#8b5cf6", desc: "수목 기울기 15% 이상 — 뿌리 약화·쓰러짐 위험" },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-2 text-[11px]">
                    <div className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: f.color }} />
                    <span className="text-muted-foreground"><strong style={{ color: f.color }}>{f.label}</strong> {f.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── 위험 수목 목록 테이블 (아코디언) ── */}
        <Card className="border-0 shadow-md">
          <CardHeader
            className="pb-2 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-t-2xl transition-colors"
            onClick={() => setTableOpen(v => !v)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full inline-block bg-red-500" />
                  위험 수목 목록
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {filter === "all" ? "전체 수목" : "산수유 나무"} — 위험도 등급 기준 정렬 (상위 100주)
                </p>
              </div>
              {tableOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          {tableOpen && <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                    {["수목 ID","수종","위치","흉고직경","육안진단","부후도","기울기","최종 등급"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filteredTrees]
                    .sort((a, b) => {
                      const ORDER: Record<RiskGrade, number> = { extreme: 3, high: 2, moderate: 1, low: 0 };
                      return ORDER[b.riskGrade] - ORDER[a.riskGrade];
                    })
                    .slice(0, 100)
                    .map((t, i) => {
                      const meta = GRADE_META[t.riskGrade];
                      return (
                        <tr
                          key={t.id}
                          data-testid={`row-tree-${t.id}`}
                          className={`border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${i === 0 && t.riskGrade === "extreme" ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}
                        >
                          <td className="px-4 py-2.5 font-mono font-semibold text-primary">{t.id}</td>
                          <td className="px-4 py-2.5">{t.species}</td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{t.district}</td>
                          <td className="px-4 py-2.5 tabular-nums">{t.diameterCm}cm</td>
                          <td className="px-4 py-2.5 font-semibold" style={{ color: GRADE_META[t.visualGrade].color }}>{t.visualValue}</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold" style={{ color: GRADE_META[t.decayGrade].color }}>{t.decayValue}%</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold" style={{ color: GRADE_META[t.tiltGrade].color }}>{t.tiltValue}%</td>
                          <td className="px-4 py-2.5">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white whitespace-nowrap"
                              style={{ backgroundColor: meta.color }}
                            >
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>}
        </Card>

      </div>

      {/* ── 수목 상세 모달 ── */}
      <TreeProfileModal
        treeId={selectedTreeId}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}
