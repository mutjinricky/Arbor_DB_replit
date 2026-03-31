import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useWeatherData, PEST_TARGETS } from "@/hooks/useWeatherData";

// ─── 상수 ───────────────────────────────────────────────────────────────────
const ICHEON_MONTHLY_AVG = [-3.4, -0.6, 5.9, 12.9, 18.1, 22.4, 25.6, 26.0, 20.7, 13.8, 6.0, -0.7];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const MONTH_START_DAY = MONTH_DAYS.reduce<number[]>((acc, d, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + MONTH_DAYS[i - 1]);
  return acc;
}, []);

const PEST_COLOR: Record<string, string> = {
  복숭아순나방: "#ef4444",
  꽃매미: "#f97316",
  갈색날개매미충: "#8b5cf6",
};

// 복숭아순나방 다세대 목표 누적 DD (PDF 7항)
const PEACH_GENERATIONS = [214, 660, 1380, 1950];

// PDF 8항 — 월별 방제 시기표
type MarkType = "primary" | "secondary" | "observe" | "none";
const MONTHLY_SCHEDULE: Record<string, MarkType[]> = {
  복숭아순나방: ["none","none","none","none","primary","primary","secondary","primary","secondary","none","none","none"],
  꽃매미:      ["none","none","none","observe","primary","secondary","secondary","primary","observe","none","none","none"],
  갈색날개매미충:["none","none","none","observe","primary","secondary","observe","primary","secondary","none","none","none"],
};

type PestStatus = "정상" | "예찰" | "준비" | "실행";
function getPestStatus(pct: number): PestStatus {
  if (pct >= 100) return "실행";
  if (pct >= 90)  return "준비";
  if (pct >= 70)  return "예찰";
  return "정상";
}
const STATUS_STYLE: Record<PestStatus, { badge: string; bar: string; label: string }> = {
  정상: { badge: "bg-green-100 text-green-700 border-green-200",  bar: "#22c55e", label: "정보 조회 중심" },
  예찰: { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", bar: "#eab308", label: "현장 조사 필요" },
  준비: { badge: "bg-orange-100 text-orange-700 border-orange-200", bar: "#f97316", label: "방제 준비 알림" },
  실행: { badge: "bg-red-100 text-red-700 border-red-200",   bar: "#ef4444", label: "방제 실행 권고" },
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────
function buildMonthlyDD(baseTemp: number) {
  let cum = 0;
  return ICHEON_MONTHLY_AVG.map((avg, i) => {
    cum += Math.max(0, avg - baseTemp) * MONTH_DAYS[i];
    return Math.round(cum);
  });
}

function buildDailyDD(baseTemp: number) {
  const points: { label: string; dayOfMonth: number; monthIdx: number; cumulative: number }[] = [];
  let cum = 0;
  for (let m = 0; m < 12; m++) {
    const dailyDD = Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp);
    for (let d = 0; d < MONTH_DAYS[m]; d++) {
      cum += dailyDD;
      points.push({ label: `${d + 1}일`, dayOfMonth: d + 1, monthIdx: m, cumulative: Math.round(cum) });
    }
  }
  return points;
}

function estimateDateForDD(baseTemp: number, targetDD: number): string {
  let cum = 0;
  for (let m = 0; m < 12; m++) {
    const monthDD = Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp) * MONTH_DAYS[m];
    if (cum + monthDD >= targetDD) {
      const dailyDD = Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp);
      const day = dailyDD > 0 ? Math.min(Math.ceil((targetDD - cum) / dailyDD), MONTH_DAYS[m]) : MONTH_DAYS[m];
      return `${m + 1}월 ${day}일`;
    }
    cum += monthDD;
  }
  return "—";
}

function estimateMonthForDD(baseTemp: number, targetDD: number): number {
  let cum = 0;
  for (let m = 0; m < 12; m++) {
    cum += Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp) * MONTH_DAYS[m];
    if (cum >= targetDD) return m;
  }
  return 11;
}

function getMilestones(targetDD: number) {
  return {
    surveyStart:  Math.round(targetDD * 0.70),
    intenseStart: Math.round(targetDD * 0.85),
    controlStart: Math.round(targetDD * 0.90),
    controlBest:  targetDD,
    controlEnd:   Math.round(targetDD * 1.075),
  };
}

function getClosestPeachGenIdx(currentDD: number): number {
  for (let i = 0; i < PEACH_GENERATIONS.length; i++) {
    if (currentDD < PEACH_GENERATIONS[i]) return i;
  }
  return PEACH_GENERATIONS.length - 1;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function PestCalendar() {
  const { pestDDs, isRealData, isLoading } = useWeatherData();
  const nowMonth = new Date().getMonth();

  // 카드 선택 / 세대 상태
  const [selectedPest, setSelectedPest] = useState("복숭아순나방");
  const [peachCardGenIdx, setPeachCardGenIdx] = useState<number>(() => {
    return 0; // 실제 값은 pestDDs 로드 후 설정
  });

  // pestDDs 로드되면 가장 근접한 세대 설정
  useEffect(() => {
    const currentDD = pestDDs["복숭아순나방"]?.currentDD ?? 0;
    setPeachCardGenIdx(getClosestPeachGenIdx(currentDD));
  }, [pestDDs]);

  // 그래프 상태
  const [graphOpen, setGraphOpen] = useState(false);
  const [zoomMonths, setZoomMonths] = useState<number>(3);
  const [panStart, setPanStart] = useState<number>(Math.max(0, nowMonth - 1));
  const [peachGraphGenIdx, setPeachGraphGenIdx] = useState(0);

  // refs for stable event handlers
  const zoomRef = useRef(zoomMonths);
  const panRef  = useRef(panStart);
  useEffect(() => { zoomRef.current = zoomMonths; }, [zoomMonths]);
  useEffect(() => { panRef.current = panStart; }, [panStart]);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Scroll → zoom, Drag → pan
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || !graphOpen) return;

    const ZOOM_STEPS = [1, 3, 6, 12];

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomMonths(prev => {
        const idx = ZOOM_STEPS.indexOf(prev);
        if (e.deltaY < 0) return ZOOM_STEPS[Math.max(0, idx - 1)];
        return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, idx + 1)];
      });
    };

    let dragStartX = 0;
    let dragStartPan = 0;
    let dragging = false;

    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      dragStartX = e.clientX;
      dragStartPan = panRef.current;
      el.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const w = el.offsetWidth;
      const pxPerUnit = w / zoomRef.current;
      const delta = Math.round((dragStartX - e.clientX) / pxPerUnit);
      const max = zoomRef.current === 1 ? 11 : 12 - zoomRef.current;
      setPanStart(Math.max(0, Math.min(max, dragStartPan + delta)));
    };
    const onMouseUp = () => {
      dragging = false;
      el.style.cursor = "grab";
    };

    el.style.cursor = "grab";
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.style.cursor = "";
    };
  }, [graphOpen]);

  // 세대 탭 클릭 → 해당 세대 방제 시기로 pan 이동
  const handleGraphGenChange = useCallback((idx: number) => {
    setPeachGraphGenIdx(idx);
    const target = PEACH_GENERATIONS[idx];
    const pestBase = PEST_TARGETS.find(p => p.name === "복숭아순나방")!;
    const controlMonth = estimateMonthForDD(pestBase.baseTemp, target);
    const newStart = Math.max(0, Math.min(12 - zoomRef.current, controlMonth - 1));
    setPanStart(newStart);
  }, []);

  // ── 카드 데이터 ──
  const pestCards = useMemo(() => {
    return PEST_TARGETS.map(pest => {
      const dd = pestDDs[pest.name];
      const currentDD = dd?.currentDD ?? 0;
      const target = pest.targetDD;
      const pct = Math.min(110, Math.round((currentDD / target) * 100));
      const status = getPestStatus(pct);
      const remaining = Math.max(0, target - currentDD);
      const avgDailyDD = Math.max(0.5, 12 - pest.baseTemp);
      const daysLeft = Math.round(remaining / avgDailyDD);
      const dates = {
        surveyStart: estimateDateForDD(pest.baseTemp, target * 0.70),
        intenseStart: estimateDateForDD(pest.baseTemp, target * 0.85),
        controlStart: estimateDateForDD(pest.baseTemp, target * 0.90),
        controlBest:  estimateDateForDD(pest.baseTemp, target),
        controlEnd:   estimateDateForDD(pest.baseTemp, target * 1.075),
      };
      return { ...pest, currentDD: Math.round(currentDD), pct, status, dates, daysLeft };
    });
  }, [pestDDs]);

  // 복숭아순나방 세대별 데이터
  const peachGenData = useMemo(() => {
    const pest = PEST_TARGETS.find(p => p.name === "복숭아순나방")!;
    const currentDD = pestDDs["복숭아순나방"]?.currentDD ?? 0;
    return PEACH_GENERATIONS.map((target, idx) => {
      const pct = Math.min(110, Math.round((currentDD / target) * 100));
      const status = getPestStatus(pct);
      const remaining = Math.max(0, target - currentDD);
      const avgDailyDD = Math.max(0.5, 12 - pest.baseTemp);
      const daysLeft = Math.round(remaining / avgDailyDD);
      const dates = {
        surveyStart: estimateDateForDD(pest.baseTemp, target * 0.70),
        intenseStart: estimateDateForDD(pest.baseTemp, target * 0.85),
        controlStart: estimateDateForDD(pest.baseTemp, target * 0.90),
        controlBest:  estimateDateForDD(pest.baseTemp, target),
        controlEnd:   estimateDateForDD(pest.baseTemp, target * 1.075),
      };
      return { idx, target, pct, status, dates, daysLeft };
    });
  }, [pestDDs]);

  // ── 그래프 데이터 ──
  const pestBase = PEST_TARGETS.find(p => p.name === selectedPest) ?? PEST_TARGETS[0];
  const isMultiGen = selectedPest === "복숭아순나방";
  const graphTarget = isMultiGen ? PEACH_GENERATIONS[peachGraphGenIdx] : pestBase.targetDD;

  const allMonthly = useMemo(() => buildMonthlyDD(pestBase.baseTemp), [pestBase.baseTemp]);
  const allDaily   = useMemo(() => buildDailyDD(pestBase.baseTemp), [pestBase.baseTemp]);

  const isDailyView = zoomMonths === 1;

  const chartData = useMemo(() => {
    if (isDailyView) {
      const start = MONTH_START_DAY[panStart];
      return allDaily.slice(start, start + MONTH_DAYS[panStart]).map((d, i) => ({
        label: i % 5 === 0 ? `${d.dayOfMonth}일` : "",
        fullLabel: `${panStart + 1}월 ${d.dayOfMonth}일`,
        cumulative: d.cumulative,
      }));
    }
    const clipped = Math.min(panStart, 12 - zoomMonths);
    return allMonthly.slice(clipped, clipped + zoomMonths).map((cum, i) => ({
      label: MONTHS_KO[clipped + i],
      fullLabel: MONTHS_KO[clipped + i],
      cumulative: cum,
    }));
  }, [isDailyView, allDaily, allMonthly, panStart, zoomMonths]);

  const milestones = getMilestones(graphTarget);
  const currentDDForChart = Math.round(pestDDs[selectedPest]?.currentDD ?? allMonthly[nowMonth] ?? 0);
  const yMax = Math.max(...chartData.map(d => d.cumulative), milestones.controlEnd) * 1.08;
  const nowCardStatus = pestCards.find(p => p.name === selectedPest)?.status ?? "정상";
  const clampedPanStart = Math.min(panStart, 12 - zoomMonths);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bug className="h-8 w-8 text-primary" />
              해충 방제 달력
            </h1>
            <p className="text-muted-foreground mt-1">
              이천시 수목 해충 유효적산온도(Degree-Day) 기반 방제 시기 가이드
            </p>
          </div>
          <span
            data-testid="status-weather-pest-calendar"
            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              isLoading ? "bg-muted text-muted-foreground border-border"
              : isRealData ? "bg-blue-100 text-blue-700 border-blue-200"
              : "bg-yellow-100 text-yellow-700 border-yellow-200"
            }`}
          >
            {isLoading ? "기상 로딩 중…" : isRealData ? "기상청 실측 ●" : "평년값 시뮬레이션"}
          </span>
        </div>

        {/* ── 해충별 상태 카드 ── */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {/* 복숭아순나방 — 다세대 슬라이드 카드 */}
          <PeachCard
            genData={peachGenData}
            genIdx={peachCardGenIdx}
            setGenIdx={setPeachCardGenIdx}
            currentDD={Math.round(pestDDs["복숭아순나방"]?.currentDD ?? 0)}
            isSelected={selectedPest === "복숭아순나방"}
            onClick={() => {
              setSelectedPest("복숭아순나방");
              setPeachGraphGenIdx(peachCardGenIdx);
              const target = PEACH_GENERATIONS[peachCardGenIdx];
              const pest = PEST_TARGETS.find(p => p.name === "복숭아순나방")!;
              const cm = estimateMonthForDD(pest.baseTemp, target);
              setPanStart(Math.max(0, Math.min(12 - zoomMonths, cm - 1)));
            }}
          />

          {/* 꽃매미 / 갈색날개매미충 */}
          {pestCards.filter(p => p.name !== "복숭아순나방").map(p => {
            const s = STATUS_STYLE[p.status];
            return (
              <Card
                key={p.name}
                data-testid={`card-pest-${p.name}`}
                className={`cursor-pointer transition-all ${selectedPest === p.name ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                onClick={() => setSelectedPest(p.name)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold" style={{ color: PEST_COLOR[p.name] }}>
                      {p.name}
                    </CardTitle>
                    <Badge variant="outline" className={s.badge}>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">발육영점온도 {p.baseTemp}°C</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DDProgressBar pct={p.pct} bar={s.bar} label={s.label} />
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <MilestoneRow icon="·····" label="예찰 시작" date={p.dates.surveyStart} color="#22c55e" />
                    <MilestoneRow icon="≈≈≈≈" label="집중예찰" date={`${p.dates.intenseStart} ~ ${p.dates.controlStart}`} color="#eab308" />
                    <MilestoneRow icon="·····" label="방제 시작" date={p.dates.controlStart} color="#f97316" />
                    <MilestoneRow icon="━━━━" label="방제 최적" date={p.dates.controlBest} color="#ef4444" bold />
                    <MilestoneRow icon="·····" label="방제 종료" date={p.dates.controlEnd} color="#ef4444" />
                  </div>
                  <div className="text-center text-xs font-semibold" style={{ color: s.bar }}>
                    {p.daysLeft > 0 ? `D-${p.daysLeft}일` : "방제 실행 권고"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── 월별 방제 시기표 ── */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">월별 방제 시기표</CardTitle>
            <p className="text-xs text-muted-foreground">
              ● 주요 방제 &nbsp;◎ 추가·2차 방제 &nbsp;○ 예찰·보조관리 &nbsp;— 해당 없음
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-36">해충명</th>
                    {MONTHS_KO.map(m => (
                      <th key={m} className="text-center py-2 px-1 font-medium text-muted-foreground w-10">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(MONTHLY_SCHEDULE).map(([name, schedule]) => (
                    <tr key={name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 font-medium" style={{ color: PEST_COLOR[name] }}>{name}</td>
                      {schedule.map((mark, i) => <ScheduleCell key={i} mark={mark} color={PEST_COLOR[name]} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <p>• <strong>복숭아순나방</strong>: 연 4세대 — 1세대(214 DD), 2세대(660 DD), 3세대(1,380 DD), 4세대(1,950 DD)</p>
              <p>• <strong>꽃매미</strong>: 5월 약충 부화 이후 방제 집중 (목표 355 DD)</p>
              <p>• <strong>갈색날개매미충</strong>: 4~5월 약충 발생 초기 방제 (목표 202 DD)</p>
              <p className="text-primary font-medium">※ 방제 시기는 기상청 실시간 데이터 연동 시 자동 업데이트됩니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* ── 방제 시기 그래프 (토글, 맨 아래) ── */}
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setGraphOpen(o => !o)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  방제 시기 그래프
                  {!graphOpen && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (클릭하여 펼치기)
                    </span>
                  )}
                </CardTitle>
                {graphOpen && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    스크롤로 확대/축소 · 드래그로 이동 · 현재 표시: {isDailyView ? `${panStart + 1}월 (일별)` : `${MONTHS_KO[clampedPanStart]} ~ ${MONTHS_KO[Math.min(11, clampedPanStart + zoomMonths - 1)]}`}
                  </p>
                )}
              </div>
              <div className="p-1 rounded hover:bg-muted transition-colors" data-testid="button-toggle-graph">
                {graphOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>

            {/* 해충 필터 + 세대 탭 */}
            {graphOpen && (
              <div className="flex flex-wrap items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                {PEST_TARGETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setSelectedPest(p.name);
                      if (p.name !== "복숭아순나방") {
                        const cm = estimateMonthForDD(p.baseTemp, p.targetDD);
                        setPanStart(Math.max(0, Math.min(12 - zoomMonths, cm - 1)));
                      }
                    }}
                    data-testid={`tab-pest-${p.name}`}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      selectedPest === p.name ? "text-white border-transparent" : "bg-transparent text-muted-foreground border-border hover:border-primary"
                    }`}
                    style={selectedPest === p.name ? { backgroundColor: PEST_COLOR[p.name] } : {}}
                  >
                    {p.name}
                  </button>
                ))}

                {/* 복숭아순나방 세대 탭 */}
                {isMultiGen && (
                  <div className="flex gap-1 ml-2 border-l pl-2" onClick={e => e.stopPropagation()}>
                    {PEACH_GENERATIONS.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleGraphGenChange(idx)}
                        data-testid={`tab-gen-${idx + 1}`}
                        className={`text-xs px-2.5 py-1 rounded border transition-all ${
                          peachGraphGenIdx === idx
                            ? "bg-red-500 text-white border-red-500"
                            : "border-border text-muted-foreground hover:border-red-400"
                        }`}
                      >
                        {idx + 1}세대
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardHeader>

          {graphOpen && (
            <CardContent>
              <div ref={chartContainerRef} className="select-none" style={{ userSelect: "none" }}>
                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={chartData} margin={{ top: 16, right: 44, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval={isDailyView ? 4 : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      unit=" DD"
                      domain={[0, Math.ceil(yMax / 50) * 50]}
                      width={68}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
                      formatter={(value: number) => [`${value} DD`, "누적 DD"]}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />

                    {/* 집중예찰 반투명 띠 */}
                    <ReferenceArea y1={milestones.intenseStart} y2={milestones.controlStart} fill="#eab308" fillOpacity={0.13} ifOverflow="extendDomain" />
                    {/* 방제 권장기간 반투명 띠 */}
                    <ReferenceArea y1={milestones.controlStart} y2={milestones.controlEnd} fill="#ef4444" fillOpacity={0.10} ifOverflow="extendDomain" />

                    {/* 마일스톤 기준선 */}
                    <ReferenceLine y={milestones.surveyStart}  stroke="#22c55e" strokeDasharray="5 4" strokeWidth={1.5}
                      label={{ value: "예찰(70%)", position: "insideTopRight", fontSize: 9, fill: "#22c55e" }} />
                    <ReferenceLine y={milestones.controlStart} stroke="#f97316" strokeDasharray="5 4" strokeWidth={1.5}
                      label={{ value: "방제시작(90%)", position: "insideTopRight", fontSize: 9, fill: "#f97316" }} />
                    <ReferenceLine y={milestones.controlBest}  stroke="#ef4444" strokeWidth={2}
                      label={{ value: "최적(100%)", position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />
                    <ReferenceLine y={milestones.controlEnd}   stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5}
                      label={{ value: "종료(107%)", position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />

                    {/* 현재 DD */}
                    <ReferenceLine
                      y={currentDDForChart}
                      stroke={STATUS_STYLE[nowCardStatus].bar}
                      strokeWidth={2}
                      strokeDasharray="8 3"
                      label={{ value: `현재 ${currentDDForChart} DD`, position: "insideBottomRight", fontSize: 10, fill: STATUS_STYLE[nowCardStatus].bar }}
                    />

                    {/* 누적 DD 곡선 */}
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      name="누적 DD"
                      stroke={PEST_COLOR[selectedPest]}
                      fill={PEST_COLOR[selectedPest]}
                      fillOpacity={0.08}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 범례 */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-dashed border-green-500" />예찰 시작(70%)</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-3 bg-yellow-300/50 border border-yellow-400 rounded-sm" />집중예찰(85~90%)</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-dashed border-orange-500" />방제 시작(90%)</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-red-500" />방제 최적(100%)</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-dashed border-red-400" />방제 종료(107%)</span>
                <span className="flex items-center gap-1.5 ml-2 text-muted-foreground/60 italic">↕ 스크롤로 확대/축소 · ↔ 드래그로 이동</span>
              </div>
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  );
}

// ─── 복숭아순나방 다세대 카드 ─────────────────────────────────────────────────
function PeachCard({
  genData, genIdx, setGenIdx, currentDD, isSelected, onClick,
}: {
  genData: ReturnType<typeof Array.prototype.map>;
  genIdx: number;
  setGenIdx: (i: number) => void;
  currentDD: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const gen = genData[genIdx] as {
    idx: number; target: number; pct: number; status: PestStatus;
    dates: Record<string, string>; daysLeft: number;
  };
  const s = STATUS_STYLE[gen.status];

  return (
    <Card
      data-testid="card-pest-복숭아순나방"
      className={`cursor-pointer transition-all relative overflow-hidden ${isSelected ? "ring-2 ring-primary" : "hover:shadow-md"}`}
      onClick={onClick}
    >
      {/* 왼쪽 화살표 */}
      <button
        onClick={e => { e.stopPropagation(); setGenIdx(Math.max(0, genIdx - 1)); }}
        disabled={genIdx === 0}
        className="absolute left-0 top-0 bottom-0 w-9 flex items-center justify-center bg-gradient-to-r from-black/5 to-transparent hover:from-black/15 disabled:opacity-0 transition-all z-10"
        data-testid="button-gen-prev"
        aria-label="이전 세대"
      >
        <ChevronLeft className="h-5 w-5 text-foreground/50" />
      </button>

      {/* 오른쪽 화살표 */}
      <button
        onClick={e => { e.stopPropagation(); setGenIdx(Math.min(PEACH_GENERATIONS.length - 1, genIdx + 1)); }}
        disabled={genIdx === PEACH_GENERATIONS.length - 1}
        className="absolute right-0 top-0 bottom-0 w-9 flex items-center justify-center bg-gradient-to-l from-black/5 to-transparent hover:from-black/15 disabled:opacity-0 transition-all z-10"
        data-testid="button-gen-next"
        aria-label="다음 세대"
      >
        <ChevronRight className="h-5 w-5 text-foreground/50" />
      </button>

      <CardHeader className="pb-2 px-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: PEST_COLOR["복숭아순나방"] }}>
            복숭아순나방
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">
              {genIdx + 1}세대
            </span>
          </CardTitle>
          <Badge variant="outline" className={s.badge}>{gen.status}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">목표 {gen.target} DD · 발육영점 7.2°C</p>
        </div>
        {/* 세대 인디케이터 */}
        <div className="flex gap-1 mt-1">
          {PEACH_GENERATIONS.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setGenIdx(i); }}
              className={`h-1.5 rounded-full transition-all ${i === genIdx ? "w-4 bg-red-500" : "w-1.5 bg-red-200"}`}
              data-testid={`button-gen-dot-${i + 1}`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-10">
        <DDProgressBar pct={gen.pct} bar={s.bar} label={s.label} />
        <div className="text-xs text-muted-foreground text-center">
          현재 누적: {currentDD} / {gen.target} DD
        </div>
        <div className="grid grid-cols-1 gap-1 text-xs">
          <MilestoneRow icon="·····" label="예찰 시작" date={gen.dates.surveyStart}  color="#22c55e" />
          <MilestoneRow icon="≈≈≈≈" label="집중예찰"  date={`${gen.dates.intenseStart} ~ ${gen.dates.controlStart}`} color="#eab308" />
          <MilestoneRow icon="·····" label="방제 시작" date={gen.dates.controlStart} color="#f97316" />
          <MilestoneRow icon="━━━━" label="방제 최적" date={gen.dates.controlBest}  color="#ef4444" bold />
          <MilestoneRow icon="·····" label="방제 종료" date={gen.dates.controlEnd}   color="#ef4444" />
        </div>
        <div className="text-center text-xs font-semibold" style={{ color: s.bar }}>
          {gen.daysLeft > 0 ? `D-${gen.daysLeft}일` : "방제 실행 권고"}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 공통 서브컴포넌트 ────────────────────────────────────────────────────────
function DDProgressBar({ pct, bar, label }: { pct: number; bar: string; label: string }) {
  return (
    <div>
      <div className="relative w-full bg-muted rounded-full h-3">
        <div className="absolute h-3 rounded-full bg-yellow-200/60" style={{ left: "85%", width: "5%", top: 0 }} />
        <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: bar }} />
        {[70, 90].map(p => (
          <div key={p} className="absolute top-0 h-3 w-0.5 bg-white/70" style={{ left: `${p}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
        <span>{pct}% 도달</span>
        <span className="italic">{label}</span>
      </div>
    </div>
  );
}

function MilestoneRow({ icon, label, date, color, bold }: { icon: string; label: string; date: string; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] w-8 shrink-0" style={{ color }}>{icon}</span>
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} text-foreground`} style={bold ? { color } : {}}>
        {date}
      </span>
    </div>
  );
}

function ScheduleCell({ mark, color }: { mark: MarkType; color: string }) {
  if (mark === "primary") return (
    <td className="text-center py-3 px-1">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold" style={{ backgroundColor: color }}>●</span>
    </td>
  );
  if (mark === "secondary") return (
    <td className="text-center py-3 px-1">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-bold" style={{ borderColor: color, color }}>◎</span>
    </td>
  );
  if (mark === "observe") return (
    <td className="text-center py-3 px-1">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs" style={{ borderColor: color + "80", color: color + "99" }}>○</span>
    </td>
  );
  return <td className="text-center py-3 px-1"><span className="text-muted-foreground/30 text-xs">—</span></td>;
}
