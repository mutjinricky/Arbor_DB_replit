import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceDot, ResponsiveContainer,
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

const PEACH_GENERATIONS = [214, 660, 1380, 1950];

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

// ─── 막대바 타임라인 상수 ──────────────────────────────────────────────────────
const TL_MONTH_START = 2; // March
const TL_MONTH_END   = 10; // November
const TL_DAY_START   = MONTH_START_DAY[TL_MONTH_START];
const TL_DAY_END     = MONTH_START_DAY[TL_MONTH_END];
const TL_DAYS_TOTAL  = TL_DAY_END - TL_DAY_START;

function dayOfYearToPct(doy: number): number {
  return Math.max(0, Math.min(100, (doy - TL_DAY_START) / TL_DAYS_TOTAL * 100));
}

function ddToDayOfYear(baseTemp: number, targetDD: number): number {
  let cum = 0;
  for (let m = 0; m < 12; m++) {
    const dailyDD = Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp);
    const monthDD = dailyDD * MONTH_DAYS[m];
    if (cum + monthDD >= targetDD && dailyDD > 0) {
      const day = Math.min(Math.ceil((targetDD - cum) / dailyDD), MONTH_DAYS[m]);
      return MONTH_START_DAY[m] + day - 1;
    }
    cum += monthDD;
  }
  return 365;
}

function doyToLabel(doy: number): string {
  for (let m = 0; m < 12; m++) {
    const end = MONTH_START_DAY[m] + MONTH_DAYS[m];
    if (doy < end) return `${m + 1}월 ${doy - MONTH_START_DAY[m] + 1}일`;
  }
  return "";
}


// ─── 유틸 ────────────────────────────────────────────────────────────────────
function estimateDateForDD(baseTemp: number, targetDD: number): string {
  return doyToLabel(ddToDayOfYear(baseTemp, targetDD));
}

function getClosestPeachGenIdx(currentDD: number): number {
  for (let i = 0; i < PEACH_GENERATIONS.length; i++) {
    if (currentDD < PEACH_GENERATIONS[i]) return i;
  }
  return PEACH_GENERATIONS.length - 1;
}

function getMilestoneDates(baseTemp: number, target: number) {
  const p70  = ddToDayOfYear(baseTemp, target * 0.70);
  const p85  = ddToDayOfYear(baseTemp, target * 0.85);
  const p90  = ddToDayOfYear(baseTemp, target * 0.90);
  const p100 = ddToDayOfYear(baseTemp, target);
  const p107 = ddToDayOfYear(baseTemp, target * 1.075);
  return { p70, p85, p90, p100, p107 };
}

// 방제시기 그래프용 누적 DD 빌더
function buildMonthlyDD(baseTemp: number): number[] {
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

const ZOOM_STEPS = [1, 3, 6, 12] as const;
type ZoomStep = typeof ZOOM_STEPS[number];

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function PestCalendar() {
  const { pestDDs, isRealData, isLoading } = useWeatherData();
  const nowMonth = new Date().getMonth();

  const [selectedPest, setSelectedPest] = useState("복숭아순나방");
  const [peachCardGenIdx, setPeachCardGenIdx] = useState(0);
  const [barSelectedGens, setBarSelectedGens] = useState<boolean[]>([true, true, true, true]);
  const [barPest, setBarPest] = useState("복숭아순나방");

  // 누적 DD 라인차트 상태
  const [lineOpen, setLineOpen] = useState(false);
  const [linePest, setLinePest] = useState("복숭아순나방");
  const [lineGenIdx, setLineGenIdx] = useState(0);
  const [lineZoom, setLineZoom] = useState<ZoomStep>(3);
  const [linePan, setLinePan] = useState(0); // start month index
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPan = useRef(0);
  const userSetGen = useRef(false); // 사용자가 수동으로 세대 선택했는지 여부

  // 최초 데이터 수신 시에만 자동으로 세대 설정 (사용자 수동 선택 이후엔 재설정 안 함)
  useEffect(() => {
    if (userSetGen.current) return;
    const currentDD = pestDDs["복숭아순나방"]?.currentDD ?? 0;
    setPeachCardGenIdx(getClosestPeachGenIdx(currentDD));
  }, [pestDDs]);

  const toggleGen = (idx: number) => {
    setBarSelectedGens(prev => {
      const next = [...prev];
      const willAllBeOff = next.filter((v, i) => i !== idx && v).length === 0 && next[idx];
      if (willAllBeOff) return prev;
      next[idx] = !next[idx];
      return next;
    });
  };

  // 라인차트 스크롤/드래그
  const clampPan = useCallback((pan: number, zoom: ZoomStep) => {
    return Math.max(0, Math.min(12 - zoom, pan));
  }, []);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      setLineZoom(prev => {
        const idx = ZOOM_STEPS.indexOf(prev);
        const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + dir))] as ZoomStep;
        setLinePan(p => clampPan(p, next));
        return next;
      });
    };
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartPan.current = 0;
      setLinePan(p => { dragStartPan.current = p; return p; });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStartX.current;
      const monthsPerPx = lineZoom / el.clientWidth;
      const delta = Math.round(-dx * monthsPerPx);
      setLinePan(clampPan(dragStartPan.current + delta, lineZoom));
    };
    const onMouseUp = () => { isDragging.current = false; };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [lineZoom, clampPan]);

  // 라인차트 데이터 계산
  const linePestObj = useMemo(() => PEST_TARGETS.find(p => p.name === linePest) ?? PEST_TARGETS[0], [linePest]);
  const lineIsMultiGen = linePest === "복숭아순나방";
  const lineDailyData = useMemo(() => buildDailyDD(linePestObj.baseTemp), [linePestObj]);

  const lineChartData = useMemo(() => {
    const startMonth = linePan;
    const endMonth = Math.min(12, linePan + lineZoom);
    const startDay = MONTH_START_DAY[startMonth];
    const endDay = endMonth === 12 ? 365 : MONTH_START_DAY[endMonth];
    return lineDailyData.slice(startDay, endDay).map((pt, i) => ({
      ...pt,
      index: startDay + i,
    }));
  }, [lineDailyData, linePan, lineZoom]);

  const lineGenTarget = useMemo(() => {
    if (lineIsMultiGen) return PEACH_GENERATIONS[lineGenIdx];
    return linePestObj.targetDD;
  }, [linePestObj, lineGenIdx, lineIsMultiGen]);

  const lineMilestones = useMemo(() => ({
    p70:  lineGenTarget * 0.70,
    p85:  lineGenTarget * 0.85,
    p90:  lineGenTarget * 0.90,
    p100: lineGenTarget,
    p107: lineGenTarget * 1.075,
  }), [lineGenTarget]);

  const lineColor = useMemo(() => PEST_COLOR[linePest] ?? "#ef4444", [linePest]);

  const lineMaxDD = useMemo(() => {
    const vals = lineChartData.map(d => d.cumulative);
    return vals.length ? Math.max(...vals) : lineGenTarget * 1.2;
  }, [lineChartData, lineGenTarget]);

  // 마일스톤 도달 날짜 (x축 day-of-year 값)
  const lineMilestoneDays = useMemo(() => ({
    p70:  ddToDayOfYear(linePestObj.baseTemp, lineGenTarget * 0.70),
    p90:  ddToDayOfYear(linePestObj.baseTemp, lineGenTarget * 0.90),
    p100: ddToDayOfYear(linePestObj.baseTemp, lineGenTarget),
  }), [linePestObj, lineGenTarget]);

  // zoom 구간에 맞는 X축 눈금 (1개월: 10일 단위, 그 외: 월 단위)
  const lineXTicks = useMemo(() => {
    const startDay = MONTH_START_DAY[linePan];
    const endMonth = Math.min(12, linePan + lineZoom);
    const endDay = endMonth === 12 ? 365 : MONTH_START_DAY[endMonth];
    const ticks: number[] = [];
    if (lineZoom === 1) {
      for (let day = startDay; day < endDay; day++) {
        const pt = lineDailyData[day];
        if (pt && (pt.dayOfMonth === 1 || pt.dayOfMonth === 11 || pt.dayOfMonth === 21)) ticks.push(day);
      }
    } else {
      for (let m = linePan; m < linePan + lineZoom && m < 12; m++) {
        ticks.push(MONTH_START_DAY[m]);
      }
    }
    return ticks;
  }, [lineZoom, linePan, lineDailyData]);

  const xTickFormatter = useCallback((idx: number) => {
    if (idx < 0 || idx >= lineDailyData.length) return "";
    const pt = lineDailyData[idx];
    if (lineZoom === 1) return `${pt.monthIdx + 1}/${pt.dayOfMonth}`;
    if (pt.dayOfMonth === 1) return `${pt.monthIdx + 1}월`;
    return "";
  }, [lineDailyData, lineZoom]);

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

  const peachGenData = useMemo(() => {
    const pest = PEST_TARGETS.find(p => p.name === "복숭아순나방")!;
    const currentDD = pestDDs["복숭아순나방"]?.currentDD ?? 0;
    return PEACH_GENERATIONS.map((target) => {
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
      return { target, pct, status, dates, daysLeft };
    });
  }, [pestDDs]);

  const barPestObj = PEST_TARGETS.find(p => p.name === barPest) ?? PEST_TARGETS[0];
  const isBarMultiGen = barPest === "복숭아순나방";
  const barGenerations = isBarMultiGen ? PEACH_GENERATIONS : [barPestObj.targetDD];
  const barVisibleGens = isBarMultiGen
    ? barGenerations.filter((_, i) => barSelectedGens[i])
    : barGenerations;

  const todayDOY = MONTH_START_DAY[nowMonth] + new Date().getDate() - 1;
  const todayPct = dayOfYearToPct(todayDOY);

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
          <PeachCard
            genData={peachGenData}
            genIdx={peachCardGenIdx}
            setGenIdx={(i) => { userSetGen.current = true; setPeachCardGenIdx(i); }}
            currentDD={Math.round(pestDDs["복숭아순나방"]?.currentDD ?? 0)}
            isSelected={selectedPest === "복숭아순나방"}
            onClick={() => setSelectedPest("복숭아순나방")}
          />
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
                    <CardTitle className="text-base font-semibold" style={{ color: PEST_COLOR[p.name] }}>{p.name}</CardTitle>
                    <Badge variant="outline" className={s.badge}>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">발육영점온도 {p.baseTemp}°C</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DDProgressBar pct={p.pct} bar={s.bar} label={s.label} />
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <MilestoneRow icon="·····" label="예찰 시작" date={p.dates.surveyStart} color="#22c55e" />
                    <MilestoneRow icon="≈≈≈≈" label="집중예찰"  date={`${p.dates.intenseStart} ~ ${p.dates.controlStart}`} color="#eab308" />
                    <MilestoneRow icon="·····" label="방제 시작" date={p.dates.controlStart} color="#f97316" />
                    <MilestoneRow icon="━━━━" label="방제 최적" date={p.dates.controlBest}  color="#ef4444" bold />
                    <MilestoneRow icon="·····" label="방제 종료" date={p.dates.controlEnd}   color="#ef4444" />
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

        {/* ── 방제기간 막대바 (항상 표시) ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">방제기간 막대바</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  해충별 예찰·방제 기간을 막대바로 확인하세요 · 막대에 마우스를 올리면 상세 날짜, 클릭하면 세부 정보
                </p>
              </div>
            </div>

            {/* 해충 선택 탭 */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {PEST_TARGETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => { setBarPest(p.name); setBarSelectedGens([true,true,true,true]); }}
                  data-testid={`tab-bar-pest-${p.name}`}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                    barPest === p.name ? "text-white border-transparent" : "bg-transparent text-muted-foreground border-border hover:border-primary"
                  }`}
                  style={barPest === p.name ? { backgroundColor: PEST_COLOR[p.name] } : {}}
                >
                  {p.name}
                </button>
              ))}

              {/* 다세대 토글 */}
              {isBarMultiGen && (
                <div className="flex gap-1.5 ml-2 border-l pl-3">
                  {PEACH_GENERATIONS.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleGen(idx)}
                      data-testid={`checkbox-gen-${idx + 1}`}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-200 ${
                        barSelectedGens[idx]
                          ? "text-white shadow-sm scale-105"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                      style={barSelectedGens[idx] ? { backgroundColor: PEST_COLOR[barPest], boxShadow: `0 2px 8px ${PEST_COLOR[barPest]}50` } : {}}
                    >
                      {idx + 1}세대
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <BarTimeline
              pestName={barPest}
              baseTemp={barPestObj.baseTemp}
              pestColor={PEST_COLOR[barPest]}
              generations={barVisibleGens}
              genLabels={isBarMultiGen
                ? PEACH_GENERATIONS.map((_, i) => `${i + 1}세대`).filter((_, i) => barSelectedGens[i])
                : [barPest]}
              todayPct={todayPct}
            />
          </CardContent>
        </Card>

        {/* ── 누적 DD 라인차트 (토글, 맨 아래) ── */}
        <Card className="mt-4">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setLineOpen(o => !o)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  방제시기 그래프 (누적 DD)
                  {!lineOpen && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">(클릭하여 펼치기)</span>
                  )}
                </CardTitle>
                {lineOpen && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    스크롤로 확대/축소, 드래그로 이동 · 기준온도 이상 누적 도일(DD) 추이
                  </p>
                )}
              </div>
              <div className="p-1 rounded hover:bg-muted transition-colors" data-testid="button-toggle-linechart">
                {lineOpen
                  ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>

            {lineOpen && (
              <div className="flex flex-wrap items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                {/* 해충 탭 */}
                {PEST_TARGETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => { setLinePest(p.name); setLineGenIdx(0); setLinePan(0); }}
                    data-testid={`tab-line-pest-${p.name}`}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                      linePest === p.name ? "text-white border-transparent" : "bg-transparent text-muted-foreground border-border hover:border-primary"
                    }`}
                    style={linePest === p.name ? { backgroundColor: PEST_COLOR[p.name] } : {}}
                  >
                    {p.name}
                  </button>
                ))}

                {/* 복숭아순나방: 세대 선택 */}
                {lineIsMultiGen && (
                  <div className="flex gap-1 ml-2 border-l pl-3">
                    {PEACH_GENERATIONS.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setLineGenIdx(idx)}
                        data-testid={`btn-line-gen-${idx + 1}`}
                        className={`text-xs px-2 py-1 rounded border transition-all ${
                          lineGenIdx === idx ? "text-white border-transparent" : "text-muted-foreground border-border hover:border-primary"
                        }`}
                        style={lineGenIdx === idx ? { backgroundColor: lineColor } : {}}
                      >
                        {idx + 1}세대
                      </button>
                    ))}
                  </div>
                )}

                {/* 확대 버튼 */}
                <div className="flex gap-1 ml-auto border-l pl-3">
                  {ZOOM_STEPS.map(z => (
                    <button
                      key={z}
                      onClick={() => { setLineZoom(z); setLinePan(p => clampPan(p, z)); }}
                      data-testid={`btn-zoom-${z}`}
                      className={`text-xs px-2 py-1 rounded border transition-all ${
                        lineZoom === z ? "bg-primary text-primary-foreground border-transparent" : "text-muted-foreground border-border hover:border-primary"
                      }`}
                    >
                      {z}개월
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>

          {lineOpen && (
            <CardContent>
              <div
                ref={chartContainerRef}
                className="cursor-grab active:cursor-grabbing select-none"
                style={{ userSelect: "none" }}
              >
                {/* 차트 */}
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={lineChartData} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.12)" />
                    <XAxis
                      dataKey="index"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      ticks={lineXTicks}
                      tickFormatter={xTickFormatter}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      label={{ value: "누적 DD", angle: -90, position: "insideLeft", fontSize: 11 }}
                      domain={[0, Math.ceil(lineMaxDD * 1.1)]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-background border rounded p-2 text-xs shadow">
                            <p className="font-semibold">{pt.monthIdx + 1}월 {pt.dayOfMonth}일</p>
                            <p style={{ color: lineColor }}>누적 DD: {pt.cumulative.toFixed(0)}</p>
                          </div>
                        );
                      }}
                    />

                    {/* 수직 기준선 — 예찰 시작 (p70) */}
                    {lineMilestoneDays.p70 >= lineChartData[0]?.index && lineMilestoneDays.p70 <= lineChartData[lineChartData.length - 1]?.index && <>
                      <ReferenceLine
                        x={lineMilestoneDays.p70}
                        stroke="#22c55e"
                        strokeDasharray="5 4"
                        strokeWidth={1.5}
                      />
                      <ReferenceDot x={lineMilestoneDays.p70} y={Math.round(lineGenTarget * 0.70)} r={5} fill="#22c55e" stroke="white" strokeWidth={2} />
                    </>}

                    {/* 수직 기준선 — 방제 시작 (p90) */}
                    {lineMilestoneDays.p90 >= lineChartData[0]?.index && lineMilestoneDays.p90 <= lineChartData[lineChartData.length - 1]?.index && <>
                      <ReferenceLine
                        x={lineMilestoneDays.p90}
                        stroke="#f97316"
                        strokeDasharray="5 4"
                        strokeWidth={1.5}
                      />
                      <ReferenceDot x={lineMilestoneDays.p90} y={Math.round(lineGenTarget * 0.90)} r={5} fill="#f97316" stroke="white" strokeWidth={2} />
                    </>}

                    {/* 수직 기준선 — 방제 적기 (p100) */}
                    {lineMilestoneDays.p100 >= lineChartData[0]?.index && lineMilestoneDays.p100 <= lineChartData[lineChartData.length - 1]?.index && <>
                      <ReferenceLine
                        x={lineMilestoneDays.p100}
                        stroke={lineColor}
                        strokeDasharray="5 4"
                        strokeWidth={2}
                      />
                      <ReferenceDot x={lineMilestoneDays.p100} y={lineGenTarget} r={6} fill={lineColor} stroke="white" strokeWidth={2} />
                    </>}

                    {/* 오늘 세로선 */}
                    {(() => {
                      const todayDoy = MONTH_START_DAY[nowMonth] + new Date().getDate() - 1;
                      return todayDoy >= lineChartData[0]?.index && todayDoy <= lineChartData[lineChartData.length - 1]?.index ? (
                        <ReferenceLine
                          x={todayDoy}
                          stroke="#60a5fa"
                          strokeWidth={2}
                          label={{ value: "오늘", fontSize: 10, fill: "#60a5fa", position: "top" }}
                        />
                      ) : null;
                    })()}

                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke={lineColor}
                      strokeWidth={2}
                      fill={lineColor}
                      fillOpacity={0.15}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 범례 */}
              <div className="flex flex-wrap gap-4 mt-2 mb-4 text-xs text-muted-foreground px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-0 h-3 border-l-2 border-dashed border-green-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  예찰 시작
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-0 h-3 border-l-2 border-dashed border-orange-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                  방제 시작
                </span>
                <span className="flex items-center gap-1.5" style={{ color: lineColor }}>
                  <span className="w-0 h-3 border-l-2 border-dashed inline-block" style={{ borderColor: lineColor }} />
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: lineColor }} />
                  방제 적기
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-0 h-3 border-l-2 border-blue-400 inline-block" />
                  오늘
                </span>
              </div>

              {/* 하단 요약 카드 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { title: "예찰 시작", doy: lineMilestoneDays.p70,  dd: Math.round(lineGenTarget * 0.70), color: "#22c55e" },
                  { title: "방제 시작", doy: lineMilestoneDays.p90,  dd: Math.round(lineGenTarget * 0.90), color: "#f97316" },
                  { title: "방제 적기", doy: lineMilestoneDays.p100, dd: lineGenTarget,                    color: lineColor },
                ].map(card => (
                  <div
                    key={card.title}
                    className="rounded-lg border p-3 text-center"
                    style={{ borderColor: card.color + "50", backgroundColor: card.color + "10" }}
                  >
                    <p className="text-[11px] text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-sm font-bold" style={{ color: card.color }}>{doyToLabel(card.doy)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{card.dd} DD</p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  );
}

// ─── 방제기간 막대바 ──────────────────────────────────────────────────────────
type BarTooltip = { rowIdx: number; content: { title: string; range: string; color: string }[]; midPct: number };

const BAR_COLORS = {
  survey:   { bg: "#fef9c3", border: "#fde047", gradient: "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)" },
  focus:    { bg: "#fed7aa", gradient: "linear-gradient(135deg, #fdba74 0%, #fb923c 100%)" },
  control:  { bg: "#fecaca", gradient: "linear-gradient(135deg, #fca5a5 0%, #f87171 100%)" },
};

function BarTimeline({
  pestName, baseTemp, pestColor, generations, genLabels, todayPct,
}: {
  pestName: string;
  baseTemp: number;
  pestColor: string;
  generations: number[];
  genLabels: string[];
  todayPct: number;
}) {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<BarTooltip | null>(null);

  useEffect(() => { setSelectedRow(null); setTooltip(null); }, [pestName, generations]);

  const monthRuler = useMemo(() => {
    const ruler: { label: string; pct: number }[] = [];
    for (let m = TL_MONTH_START; m < TL_MONTH_END; m++) {
      ruler.push({ label: MONTHS_KO[m], pct: dayOfYearToPct(MONTH_START_DAY[m]) });
    }
    return ruler;
  }, []);

  const rows = useMemo(() => {
    return generations.map((target, i) => {
      const ms = getMilestoneDates(baseTemp, target);
      return {
        label: genLabels[i],
        target,
        p70:  dayOfYearToPct(ms.p70),
        p85:  dayOfYearToPct(ms.p85),
        p90:  dayOfYearToPct(ms.p90),
        p100: dayOfYearToPct(ms.p100),
        p107: dayOfYearToPct(ms.p107),
        doy70:  ms.p70,  doy85:  ms.p85,
        doy90:  ms.p90,  doy100: ms.p100,  doy107: ms.p107,
      };
    });
  }, [generations, genLabels, baseTemp]);

  const showTooltip = (rowIdx: number, row: typeof rows[0]) => {
    setTooltip({
      rowIdx,
      midPct: (row.p70 + row.p107) / 2,
      content: [
        { title: "예찰 시기",      range: `${doyToLabel(row.doy70)} ~ ${doyToLabel(row.doy90)}`,   color: "#ca8a04" },
        { title: "├ 집중 예찰",   range: `${doyToLabel(row.doy85)} ~ ${doyToLabel(row.doy90)}`,   color: "#ea580c" },
        { title: "방제 시기",      range: `${doyToLabel(row.doy90)} ~ ${doyToLabel(row.doy100)}`,  color: "#ef4444" },
        { title: "방제 종료",      range: `${doyToLabel(row.doy100)} ~ ${doyToLabel(row.doy107)}`, color: "#dc2626" },
      ],
    });
  };

  return (
    <div className="w-full">
      {/* ── 범례 ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5">
            <span className="inline-block w-6 h-3 rounded-l-full" style={{ background: BAR_COLORS.survey.gradient }} />
            <span className="inline-block w-3 h-3 rounded-r-full" style={{ background: BAR_COLORS.focus.gradient }} />
          </span>
          <span>예찰 <span className="opacity-60">(└집중)</span></span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-full" style={{ background: BAR_COLORS.control.gradient }} />
          방제 시기
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-4 rounded-full bg-blue-400" />
          <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold">Today</span>
        </span>
      </div>

      {/* ── 타임라인 본체 ── */}
      <div className="relative">

        {/* 전체 높이 그리드선 레이어 (모든 바 뒤에) */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {monthRuler.map(r => (
            <div
              key={r.label}
              className="absolute top-0 bottom-0 border-l border-dashed border-slate-200 dark:border-slate-700"
              style={{ left: `${r.pct}%` }}
            />
          ))}
          {todayPct > 0 && todayPct < 100 && (
            <div
              className="absolute top-0 bottom-0 w-[2px] z-10"
              style={{ left: `${todayPct}%`, background: "linear-gradient(to bottom, #60a5fa, #3b82f6)" }}
            />
          )}
        </div>

        {/* 월 눈금 헤더 */}
        <div className="relative h-10 mb-2">
          {monthRuler.map(r => (
            <div
              key={r.label}
              className="absolute flex flex-col items-center"
              style={{ left: `${r.pct}%`, transform: "translateX(-50%)" }}
            >
              <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap tracking-tight">{r.label}</span>
            </div>
          ))}
          {/* Today 배지 */}
          {todayPct > 0 && todayPct < 100 && (
            <div
              className="absolute flex flex-col items-center gap-0.5"
              style={{ left: `${todayPct}%`, transform: "translateX(-50%)", top: 0 }}
            >
              <div className="bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-md font-bold tracking-wide">
                Today
              </div>
              <div className="w-[2px] h-2 bg-blue-400 rounded-full" />
            </div>
          )}
        </div>

        {/* ── 바 행들 ── */}
        {rows.map((row, rowIdx) => {
          const isSelected = selectedRow === rowIdx;
          return (
            <div key={rowIdx} className="mb-4 relative z-10">

              {/* 세대 레이블 */}
              {generations.length > 1 && (
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold" style={{ color: pestColor }}>{row.label}</span>
                  <span className="text-xs text-slate-400 font-normal">목표 {row.target} DD</span>
                  {isSelected && <span className="text-[10px] text-slate-400 ml-auto">클릭하여 닫기 ↑</span>}
                </div>
              )}

              {/* 클릭 가능한 바 카드 */}
              <div
                className={`group relative cursor-pointer rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? "shadow-xl"
                    : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700 hover:-translate-y-[2px] hover:shadow-lg hover:border-slate-200"
                }`}
                style={isSelected ? {
                  backgroundColor: pestColor + "0a",
                  borderColor: pestColor + "50",
                  boxShadow: `0 8px 30px ${pestColor}18`,
                } : {}}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => setSelectedRow(r => r === rowIdx ? null : rowIdx)}
              >
                {/* 프로그레스 트랙 */}
                <div className="relative h-12 overflow-hidden rounded-2xl">

                  {/* 예찰 구간 (p70 ~ p90) */}
                  {row.p90 > row.p70 && (
                    <div
                      className="absolute top-1.5 bottom-1.5 overflow-hidden transition-opacity duration-150 group-hover:opacity-90"
                      style={{
                        left: `${row.p70}%`,
                        width: `${row.p90 - row.p70}%`,
                        background: BAR_COLORS.survey.gradient,
                        borderRadius: "999px 0 0 999px",
                      }}
                      onMouseEnter={() => showTooltip(rowIdx, row)}
                    >
                      {/* 집중 예찰 (p85 ~ p90) */}
                      {row.p90 > row.p85 && (
                        <div
                          className="absolute top-0 right-0 bottom-0 transition-opacity duration-150"
                          style={{
                            width: `${((row.p90 - row.p85) / (row.p90 - row.p70)) * 100}%`,
                            background: BAR_COLORS.focus.gradient,
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* 방제 시기 (p90 ~ p107) */}
                  {row.p107 > row.p90 && (
                    <div
                      className="absolute top-1.5 bottom-1.5 transition-opacity duration-150 group-hover:opacity-90"
                      style={{
                        left: `${row.p90}%`,
                        width: `${row.p107 - row.p90}%`,
                        background: BAR_COLORS.control.gradient,
                        borderRadius: "0 999px 999px 0",
                      }}
                      onMouseEnter={() => showTooltip(rowIdx, row)}
                    />
                  )}

                  {/* 오늘 선 (트랙 내) */}
                  {todayPct > 0 && todayPct < 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] z-20"
                      style={{ left: `${todayPct}%`, background: "linear-gradient(to bottom, #60a5fa, #3b82f6)" }}
                    />
                  )}

                  {/* Hover 툴팁 */}
                  {tooltip?.rowIdx === rowIdx && (
                    <div
                      className="absolute bottom-full mb-3 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-2xl px-4 py-3 pointer-events-none min-w-[210px]"
                      style={{ left: `${Math.min(Math.max(tooltip.midPct, 12), 68)}%`, transform: "translateX(-50%)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pestColor }} />
                        <p className="text-xs font-bold" style={{ color: pestColor }}>{row.label}</p>
                      </div>
                      <div className="space-y-1">
                        {tooltip.content.map((item, ci) => (
                          <div key={ci} className="flex justify-between gap-4 text-[11px]">
                            <span className="text-slate-400">{item.title}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{item.range}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 클릭 상세 패널 */}
              {isSelected && (
                <div
                  className="mt-2 rounded-2xl border bg-white dark:bg-slate-900 p-4 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 shadow-lg"
                  style={{ borderColor: pestColor + "30" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pestColor }} />
                    <p className="font-bold text-sm" style={{ color: pestColor }}>{row.label} 방제 일정 상세</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {[
                      { label: "예찰 시작",         doy: row.doy70,  color: "#ca8a04" },
                      { label: "집중 예찰 시작",    doy: row.doy85,  color: "#d97706" },
                      { label: "방제 시작",         doy: row.doy90,  color: "#f87171" },
                      { label: "방제 최적 (100%)",  doy: row.doy100, color: "#ef4444" },
                      { label: "방제 종료",         doy: row.doy107, color: "#dc2626" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="font-bold tabular-nums" style={{ color: item.color }}>{doyToLabel(item.doy)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3" style={{ borderColor: pestColor + "20" }}>
                    <p className="font-semibold text-[11px] mb-1.5 text-slate-400 uppercase tracking-wide">권장 조치사항</p>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      {pestName === "복숭아순나방"
                        ? "페로몬 트랩 설치 후 예찰 시작 → 집중예찰 구간 주 2회 이상 모니터링 → 90% 도달 시 스피노사드·사이퍼메트린계 약제 살포"
                        : pestName === "꽃매미"
                        ? "약충 부화 초기 집중 방제 → 카보설판·클로르피리포스계 등록약제 살포 → 성충 이동 전 완료"
                        : "약충 발생 초기(4월 하순~5월) 집중 방제 → 이미다클로프리드·아세타미프리드계 약제 적용 → 알 집단 제거 병행"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 복숭아순나방 다세대 카드 ─────────────────────────────────────────────────
function PeachCard({
  genData, genIdx, setGenIdx, currentDD, isSelected, onClick,
}: {
  genData: { target: number; pct: number; status: PestStatus; dates: Record<string, string>; daysLeft: number }[];
  genIdx: number;
  setGenIdx: (i: number) => void;
  currentDD: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const gen = genData[genIdx];
  const s = STATUS_STYLE[gen.status];

  return (
    <Card
      data-testid="card-pest-복숭아순나방"
      className={`cursor-pointer transition-all relative overflow-hidden ${isSelected ? "ring-2 ring-primary" : "hover:shadow-md"}`}
      onClick={onClick}
    >
      <button
        onClick={e => { e.stopPropagation(); setGenIdx(Math.max(0, genIdx - 1)); }}
        disabled={genIdx === 0}
        className="absolute left-0 top-0 bottom-0 w-9 flex items-center justify-center bg-gradient-to-r from-black/5 to-transparent hover:from-black/15 disabled:opacity-0 transition-all z-10"
        data-testid="button-gen-prev"
      >
        <ChevronLeft className="h-5 w-5 text-foreground/50" />
      </button>
      <button
        onClick={e => { e.stopPropagation(); setGenIdx(Math.min(PEACH_GENERATIONS.length - 1, genIdx + 1)); }}
        disabled={genIdx === PEACH_GENERATIONS.length - 1}
        className="absolute right-0 top-0 bottom-0 w-9 flex items-center justify-center bg-gradient-to-l from-black/5 to-transparent hover:from-black/15 disabled:opacity-0 transition-all z-10"
        data-testid="button-gen-next"
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
        <p className="text-xs text-muted-foreground">목표 {gen.target} DD · 발육영점 7.2°C</p>
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
        <div className="text-xs text-muted-foreground text-center">현재 누적: {currentDD} / {gen.target} DD</div>
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
