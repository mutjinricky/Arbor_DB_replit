import { useState, useMemo, useEffect } from "react";
import { Search, AlertTriangle, Shield, Target, Zap, TreePine, TrendingUp, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import MapGL, { NavigationControl } from "react-map-gl";
import TreeLayer from "@/components/TreeLayer";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { calculateIQTRI, type TreeFullData } from "@/lib/riskCalculations";

// ─── 타입 ──────────────────────────────────────────────────────────────────────
type RiskGrade = "extreme" | "high" | "moderate" | "low";

type EnrichedTree = {
  id: string;
  species: string;
  district: string;
  diameterCm: number;
  risk: string;
  age: number;
  iqtri: { score: number; grade: RiskGrade; D: number; T: number; I: number };
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

// ─── IQTRI 점수 게이지 컴포넌트 ──────────────────────────────────────────────
function ScoreGauge({ score, grade }: { score: number; grade: RiskGrade }) {
  const meta = GRADE_META[grade];
  const maxScore = 400;
  const pct = Math.min(score / maxScore * 100, 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-32 h-32 rounded-full flex items-center justify-center"
        style={{ background: `conic-gradient(${meta.color} ${pct * 3.6}deg, #e5e7eb ${pct * 3.6}deg)` }}
      >
        <div className="absolute inset-2 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color: meta.color }}>{score}</span>
          <span className="text-[10px] text-muted-foreground font-medium">수목 위험도</span>
        </div>
      </div>
      <span
        className="text-xs px-3 py-1 rounded-full font-bold text-white shadow-sm"
        style={{ backgroundColor: meta.color }}
      >
        {meta.label} 위험
      </span>
    </div>
  );
}

// ─── D/T/I 카드 컴포넌트 ─────────────────────────────────────────────────────
function DTICard({ label, value, icon, desc, color }: { label: string; value: number; icon: React.ReactNode; desc: string; color: string }) {
  return (
    <div className="flex-1 rounded-2xl border p-4 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
            <span style={{ color }}>{icon}</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">{label}</span>
        </div>
        <span className="text-2xl font-black" style={{ color }}>{value}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
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
  const [filter, setFilter]             = useState<"all" | "산수유">("all");

  // ── 위험도 지도 상태 ────────────────────────────────────────────────────────
  const [rawGeoJson, setRawGeoJson]           = useState<any>(null);
  const [rawTreesJson, setRawTreesJson]       = useState<Record<string, TreeFullData> | null>(null);
  const [mapState, setMapState]               = useState({ longitude: 127.4704, latitude: 37.34111, zoom: 13 });
  const [riskGradeFilter, setRiskGradeFilter] = useState<"all" | "extreme" | "high" | "moderate" | "low">("all");
  const [mapCursor, setMapCursor]             = useState("grab");

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
        const { grade } = calculateIQTRI(tree);
        return { ...f, properties: { ...f.properties, iqtriGrade: grade } };
      });
    return { ...rawGeoJson, features };
  }, [rawGeoJson, rawTreesJson]);

  const riskFilteredIds = useMemo(() => {
    if (!riskEnrichedGeoJson || riskGradeFilter === "all") return null;
    return riskEnrichedGeoJson.features
      .filter((f: any) => f.properties?.iqtriGrade === riskGradeFilter)
      .map((f: any) => f.properties?.id as string);
  }, [riskEnrichedGeoJson, riskGradeFilter]);

  // 실제 수목 데이터 — trees.json을 단일 소스로 사용
  const realTreesWithIQTRI = useMemo<EnrichedTree[]>(() => {
    if (!rawTreesJson) return [];
    return Object.entries(rawTreesJson).map(([id, tree]) => {
      const { score, grade, D, T, I } = calculateIQTRI(tree);
      return {
        id,
        species: tree.species || "",
        district: tree.district || "",
        diameterCm: tree.diameter || 0,
        risk: tree.risk || "",
        age: tree.age || 0,
        iqtri: { score, grade, D: parseFloat(D.toFixed(2)), T, I },
      };
    });
  }, [rawTreesJson]);

  // 검색 실행
  const handleSearch = () => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return;
    const found = realTreesWithIQTRI.find(t =>
      t.id.toUpperCase() === q ||
      t.id.replace("IC-", "").replace(/^0+/, "") === q.replace("IC-", "").replace(/^0+/, "")
    );
    setSearchResult(found ?? "notfound");
  };

  // 필터된 수목 목록 (위험도 점수 내림차순, 상위 100주만 표시)
  const filteredTrees = useMemo(
    () => filter === "all" ? realTreesWithIQTRI : realTreesWithIQTRI.filter(t => t.species === "산수유"),
    [filter, realTreesWithIQTRI],
  );

  // 파이차트 데이터 (위험도 등급별 수목 수)
  const pieData = useMemo(() => {
    const counts: Record<RiskGrade, number> = { extreme: 0, high: 0, moderate: 0, low: 0 };
    filteredTrees.forEach(t => counts[t.iqtri.grade]++);
    return [
      { name: "극심",  value: counts.extreme,  grade: "extreme"  as RiskGrade },
      { name: "심",    value: counts.high,     grade: "high"     as RiskGrade },
      { name: "중",    value: counts.moderate, grade: "moderate" as RiskGrade },
      { name: "경",    value: counts.low,      grade: "low"      as RiskGrade },
    ].filter(d => d.value > 0);
  }, [filteredTrees]);

  // 막대차트 데이터 (D/T/I 위험 요인 분포)
  const barData = useMemo(() => {
    const dHigh  = filteredTrees.filter(t => t.iqtri.D >= 3.0).length;
    const tHigh  = filteredTrees.filter(t => t.iqtri.T >= 25).length;
    const iHigh  = filteredTrees.filter(t => t.iqtri.I >= 6).length;
    return [
      { factor: "D (결함)", value: dHigh,  color: "#ef4444", desc: "결함 점수 ≥3.0" },
      { factor: "T (타겟)", value: tHigh,  color: "#f97316", desc: "타겟 점수 ≥25"  },
      { factor: "I (충돌)", value: iHigh,  color: "#8b5cf6", desc: "충돌 점수 ≥6"   },
    ];
  }, [filteredTrees]);

  // 전체 요약 통계
  const stats = useMemo(() => {
    const total    = filteredTrees.length;
    const extreme  = filteredTrees.filter(t => t.iqtri.grade === "extreme").length;
    const highRisk = filteredTrees.filter(t => t.iqtri.grade === "high" || t.iqtri.grade === "extreme").length;
    const avgScore = total ? Math.round(filteredTrees.reduce((s, t) => s + t.iqtri.score, 0) / total) : 0;
    return { total, extreme, highRisk, avgScore };
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
            <p className="text-sm font-semibold mb-3">수목 ID로 수목 위험도 조회</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="수목 ID 입력  예: IC-0001 / IC-0008 / IC-0013"
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
            <p className="text-[11px] text-muted-foreground mt-2">
              예: IC-0001, IC-1349 등 수목 ID를 입력하세요
            </p>
          </CardContent>
        </Card>

        {/* ── 검색 결과: IQTRI 카드 ── */}
        {searchResult === "notfound" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 font-medium text-center">
            수목 ID를 찾을 수 없습니다. 수목 재고 관리 탭에서 ID를 확인해 주세요.
          </div>
        )}

        {searchResult && searchResult !== "notfound" && (() => {
          const t = searchResult;
          const meta = GRADE_META[t.iqtri.grade];
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
                {/* 게이지 */}
                <ScoreGauge score={t.iqtri.score} grade={t.iqtri.grade} />

                {/* D·T·I 카드 */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                  <DTICard
                    label="D — 결함 지수"
                    value={t.iqtri.D}
                    icon={<Shield className="h-4 w-4" />}
                    desc="수목 결함 상태 (최대 10.0)"
                    color="#ef4444"
                  />
                  <DTICard
                    label="T — 타겟 지수"
                    value={t.iqtri.T}
                    icon={<Target className="h-4 w-4" />}
                    desc="피해 대상 중요도 (15/25/40)"
                    color="#f97316"
                  />
                  <DTICard
                    label="I — 충돌 지수"
                    value={t.iqtri.I}
                    icon={<Zap className="h-4 w-4" />}
                    desc="수목 규모·충돌 가능성 (1~10)"
                    color="#8b5cf6"
                  />
                </div>
              </div>

              {/* 해석 */}
              <div className="mt-4 pt-3 border-t" style={{ borderColor: meta.border }}>
                <p className="text-xs font-medium" style={{ color: meta.color }}>
                  ⚠ 수목 위험도 = {t.iqtri.D} × {t.iqtri.T} × {t.iqtri.I} = <strong>{t.iqtri.score}</strong> →
                  {" "}{meta.label} 수목 위험도 등급
                  {t.iqtri.grade === "extreme" && " — 즉각적인 위험 조치 필요"}
                  {t.iqtri.grade === "high"    && " — 조속한 점검 및 처치 권고"}
                  {t.iqtri.grade === "moderate"&& " — 정기 모니터링 실시"}
                  {t.iqtri.grade === "low"     && " — 현상 유지, 연 1회 예찰"}
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── 요약 통계 카드 ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "조회 수목", value: stats.total,    unit: "주",  color: "#6366f1", icon: <TreePine className="h-4 w-4" /> },
            { label: "극심 위험", value: stats.extreme,  unit: "주",  color: "#dc2626", icon: <AlertTriangle className="h-4 w-4" /> },
            { label: "심 이상",   value: stats.highRisk, unit: "주",  color: "#ea580c", icon: <TrendingUp className="h-4 w-4" /> },
            { label: "평균 위험도", value: stats.avgScore, unit: "점", color: "#0ea5e9", icon: <Shield className="h-4 w-4" /> },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white dark:bg-slate-900 border shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + "20", color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{s.unit}</p>
            </div>
          ))}
        </div>

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
                  onMouseEnter={() => setMapCursor("pointer")}
                  onMouseLeave={() => setMapCursor("grab")}
                >
                  <NavigationControl position="top-right" />
                  {riskEnrichedGeoJson && (
                    <TreeLayer
                      treesData={riskEnrichedGeoJson}
                      mapMode="risk"
                      filteredIds={riskFilteredIds}
                      selectedTreeIds={[]}
                    />
                  )}
                </MapGL>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">VITE_MAPBOX_TOKEN을 설정해주세요</p>
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
              { key: "산수유", label: "산수유 나무" },
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
                  ({filter === f.key && f.key === "산수유" ? filteredTrees.length : f.key === "all" ? realTreesWithIQTRI.length : realTreesWithIQTRI.filter(t => t.species === "산수유").length})
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
                  const count = filteredTrees.filter(t => t.iqtri.grade === g).length;
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
                D·T·I 각 지수 임계치 초과 수목 수
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

              {/* 요인 설명 */}
              <div className="space-y-1.5 mt-2">
                {[
                  { label: "D (결함)", color: "#ef4444", desc: "수목 결함 점수 3.0 이상 — 손상·공동·동해 복합 위험" },
                  { label: "T (타겟)", color: "#f97316", desc: "타겟 점수 25 이상 — 주거·도로·학교 인접 위험 수목" },
                  { label: "I (충돌)", color: "#8b5cf6", desc: "충돌 점수 6 이상 — 흉고직경 35cm 이상 대형 수목" },
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

        {/* ── 위험 수목 목록 테이블 ── */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full inline-block bg-red-500" />
              위험 수목 목록
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {filter === "all" ? "전체 수목" : "산수유 나무"} — 수목 위험도 점수 높은 순 정렬 (상위 100주)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                    {["수목 ID","수종","위치","흉고직경","D","T","I","위험도","등급"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filteredTrees]
                    .sort((a, b) => b.iqtri.score - a.iqtri.score)
                    .slice(0, 100)
                    .map((t, i) => {
                      const meta = GRADE_META[t.iqtri.grade];
                      return (
                        <tr
                          key={t.id}
                          data-testid={`row-tree-${t.id}`}
                          className={`border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${i === 0 && t.iqtri.grade === "extreme" ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}
                        >
                          <td className="px-4 py-2.5 font-mono font-semibold text-primary">{t.id}</td>
                          <td className="px-4 py-2.5">{t.species}</td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{t.district}</td>
                          <td className="px-4 py-2.5 tabular-nums">{t.diameterCm}cm</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold text-red-600">{t.iqtri.D}</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold text-orange-600">{t.iqtri.T}</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold text-violet-600">{t.iqtri.I}</td>
                          <td className="px-4 py-2.5 tabular-nums font-black" style={{ color: meta.color }}>{t.iqtri.score}</td>
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
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
