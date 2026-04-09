import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceDot, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Camera, History, Siren } from "lucide-react";
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

// ─── 돌발해충 이력 데이터 ─────────────────────────────────────────────────────
type InvasiveSeverity = "low" | "medium" | "high";
interface InvasiveHistoryRecord {
  year: number;
  startDoy: number;
  endDoy: number;
  severity: InvasiveSeverity;
  project?: string;
  note: string;
}
interface InvasiveProject {
  year: number;
  name: string;
  budget: string;
  result: string;
  photos: { label: string; icon: string }[];
}
interface InvasivePestData {
  key: string;
  name: string;
  scientificName: string;
  color: string;
  description: string;
  peakMonths: number[];
  history: InvasiveHistoryRecord[];
  projects: InvasiveProject[];
}

const SEVERITY_CONFIG: Record<InvasiveSeverity, { label: string; color: string }> = {
  low:    { label: "낮음", color: "#22c55e" },
  medium: { label: "보통", color: "#f59e0b" },
  high:   { label: "높음", color: "#ef4444" },
};

const INVASIVE_PEST_DATA: InvasivePestData[] = [
  {
    key: "미국선녀벌레",
    name: "미국선녀벌레",
    scientificName: "Metcalfa pruinosa",
    color: "#0ea5e9",
    description: "북미 원산 침입해충. 약충·성충 모두 식물 즙액 흡즙, 그을음병 유발. 이천시 도심 가로수·조경수에 지속 확산 중.",
    peakMonths: [5, 6, 7, 8],
    history: [
      { year: 2024, startDoy: 152, endDoy: 228, severity: "medium", project: "'24 돌발해충 공동방제", note: "도심 가로수 26개소 집중 방제, 전년比 발생면적 8% 감소" },
      { year: 2023, startDoy: 145, endDoy: 235, severity: "high",   project: "'23 도심공원 긴급방제 사업", note: "종합운동장 일대 대규모 발생, 피해 조경수 142주 확인" },
      { year: 2022, startDoy: 158, endDoy: 220, severity: "medium", note: "전년 대비 발생 면적 15% 증가, 신규 확산지 3개소 확인" },
      { year: 2021, startDoy: 163, endDoy: 215, severity: "low",    note: "예찰 중심 관리, 방제 필요 수준 이하" },
      { year: 2020, startDoy: 170, endDoy: 208, severity: "low",    note: "이천시 초발견, 산발적 소규모 발생" },
    ],
    projects: [
      { year: 2023, name: "'23 도심공원 긴급방제 사업", budget: "₩18,500,000", result: "완료",
        photos: [{ label: "발생 현황", icon: "🦗" }, { label: "약충 피해", icon: "🐛" }, { label: "방제 작업", icon: "💉" }, { label: "방제 후", icon: "✅" }] },
      { year: 2024, name: "'24 돌발해충 공동방제",     budget: "₩12,000,000", result: "완료",
        photos: [{ label: "발생 현황", icon: "🌳" }, { label: "그을음병", icon: "🖤" }, { label: "방제 작업", icon: "💉" }, { label: "방제 후", icon: "✅" }] },
    ],
  },
  {
    key: "매미나방",
    name: "매미나방",
    scientificName: "Lymantria dispar",
    color: "#84cc16",
    description: "식엽성 해충. 대발생 시 활엽수 임상 완전 탈엽. 5~7월 유충 집중 가해, 2~4년 주기 대발생 패턴.",
    peakMonths: [4, 5, 6],
    history: [
      { year: 2024, startDoy: 121, endDoy: 196, severity: "low",    note: "소규모 산발 발생, 자연천적에 의한 자연소멸 확인" },
      { year: 2023, startDoy: 110, endDoy: 200, severity: "medium", project: "'23 솔잎혹파리·매미나방 항공방제", note: "설봉산·원적산 임야 집중 방제 시행" },
      { year: 2022, startDoy: 105, endDoy: 210, severity: "high",   project: "'22 산림해충 긴급방제 사업", note: "기록적 대발생, 활엽수 35ha 완전 탈엽 피해" },
      { year: 2021, startDoy: 118, endDoy: 195, severity: "medium", note: "전년도 대발생 이후 개체수 감소 추세, 지속 예찰" },
      { year: 2020, startDoy: 125, endDoy: 188, severity: "low",    note: "예찰 중심, 국소 방제 1개소 시행" },
    ],
    projects: [
      { year: 2022, name: "'22 산림해충 긴급방제 사업",        budget: "₩42,000,000", result: "완료",
        photos: [{ label: "유충 대발생", icon: "🐛" }, { label: "피해 임상", icon: "🌲" }, { label: "방제 작업", icon: "💉" }, { label: "방제 후", icon: "✅" }] },
      { year: 2023, name: "'23 솔잎혹파리·매미나방 항공방제",  budget: "₩28,500,000", result: "완료",
        photos: [{ label: "항공방제", icon: "🚁" }, { label: "성충", icon: "🦋" }, { label: "알 덩어리", icon: "🥚" }, { label: "방제 후", icon: "✅" }] },
    ],
  },
  {
    key: "솔껍질깍지벌레",
    name: "솔껍질깍지벌레",
    scientificName: "Matsucoccus thunbergianae",
    color: "#f59e0b",
    description: "소나무류 수피 내 기생. 수액 흡즙으로 고사 유발. 4~5월 부화 약충 방제 시기가 핵심.",
    peakMonths: [3, 4, 5],
    history: [
      { year: 2024, startDoy: 91,  endDoy: 152, severity: "medium", project: "'24 소나무류 병해충 방제", note: "군부대 인근 소나무 군락 집중 피해, 수목 주사 처리" },
      { year: 2023, startDoy: 95,  endDoy: 145, severity: "low",    note: "피해 수목 8주, 예방적 수목 주사 처리 완료" },
      { year: 2022, startDoy: 88,  endDoy: 158, severity: "high",   project: "'22 소나무재선충·깍지벌레 통합방제", note: "설봉공원 노거수 12주 고사 피해, 긴급 방제" },
      { year: 2021, startDoy: 98,  endDoy: 148, severity: "medium", note: "방제 구역 확대 (전년도 확산 지역 대응)" },
      { year: 2020, startDoy: 102, endDoy: 143, severity: "low",    note: "초기 발견, 국소 방제 시행 완료" },
    ],
    projects: [
      { year: 2022, name: "'22 소나무재선충·깍지벌레 통합방제", budget: "₩35,000,000", result: "완료",
        photos: [{ label: "성충·약충", icon: "🐞" }, { label: "피해 수피", icon: "🌿" }, { label: "방제 작업", icon: "💉" }, { label: "방제 후", icon: "✅" }] },
      { year: 2024, name: "'24 소나무류 병해충 방제",           budget: "₩9,800,000",  result: "완료",
        photos: [{ label: "피해 수목", icon: "🌲" }, { label: "수목 주사", icon: "💉" }, { label: "방제 현장", icon: "🌿" }, { label: "방제 후", icon: "✅" }] },
    ],
  },
];

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

// ─── 막대바 타임라인 상수 (1~12월 전체) ────────────────────────────────────────
const TL_DAYS_TOTAL = 365;

function dayOfYearToPct(doy: number): number {
  return Math.max(0, Math.min(100, doy / TL_DAYS_TOTAL * 100));
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
  const currentYear = new Date().getFullYear();

  const [selectedPest, setSelectedPest] = useState("복숭아순나방");
  const [peachCardGenIdx, setPeachCardGenIdx] = useState(0);
  const [barSelectedGens, setBarSelectedGens] = useState<boolean[]>([true, true, true, true]);
  const [barPest, setBarPest] = useState("복숭아순나방");
  const [invasivePest, setInvasivePest] = useState(INVASIVE_PEST_DATA[0].key);
  const [invasiveOpen, setInvasiveOpen] = useState(true);

  // 누적 DD 라인차트 상태
  const [lineOpen, setLineOpen] = useState(false);
  const [linePest, setLinePest] = useState("복숭아순나방");
  const [lineGenIdx, setLineGenIdx] = useState(0);
  const [lineRange, setLineRange] = useState<ZoomStep>(3);
  const chartContainerRef = useRef<HTMLDivElement>(null);
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


  // 라인차트 데이터 계산
  const linePestObj = useMemo(() => PEST_TARGETS.find(p => p.name === linePest) ?? PEST_TARGETS[0], [linePest]);
  const lineIsMultiGen = linePest === "복숭아순나방";
  const lineDailyData = useMemo(() => buildDailyDD(linePestObj.baseTemp), [linePestObj]);

  const lineChartData = useMemo(() => {
    const annualTotal = lineDailyData[364]?.cumulative ?? 0;
    const result: (typeof lineDailyData[0] & { index: number; calMonthIdx: number })[] = [];
    for (let mAbs = nowMonth; mAbs < nowMonth + lineRange; mAbs++) {
      const mRel = mAbs % 12;
      const yearOffset = Math.floor(mAbs / 12);
      const mStart = MONTH_START_DAY[mRel];
      const mEnd = mRel === 11 ? 365 : MONTH_START_DAY[mRel + 1];
      for (let d = mStart; d < mEnd; d++) {
        const pt = lineDailyData[d];
        result.push({
          ...pt,
          calMonthIdx: mAbs,
          cumulative: pt.cumulative + yearOffset * annualTotal,
          index: yearOffset * 365 + d,
        });
      }
    }
    return result;
  }, [lineDailyData, lineRange, nowMonth]);

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

  // 범위에 맞는 X축 눈금 (1개월: 10일 단위, 그 외: 월 단위)
  const lineXTicks = useMemo(() => {
    const ticks: number[] = [];
    for (const pt of lineChartData) {
      if (lineRange === 1) {
        if (pt.dayOfMonth === 1 || pt.dayOfMonth === 11 || pt.dayOfMonth === 21) ticks.push(pt.index);
      } else {
        if (pt.dayOfMonth === 1) ticks.push(pt.index);
      }
    }
    return ticks;
  }, [lineChartData, lineRange]);

  const xTickFormatter = useCallback((idx: number) => {
    const pt = lineChartData.find(d => d.index === idx);
    if (!pt) return "";
    const mRel = pt.calMonthIdx % 12;
    const yearOffset = Math.floor(pt.calMonthIdx / 12);
    if (lineRange === 1) return `${mRel + 1}/${pt.dayOfMonth}`;
    if (pt.dayOfMonth === 1) {
      if (yearOffset > 0) return `${String(currentYear + yearOffset).slice(2)}년 ${mRel + 1}월`;
      return `${mRel + 1}월`;
    }
    return "";
  }, [lineChartData, lineRange, currentYear]);

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
                    오늘 기준 선택 범위의 기준온도 이상 누적 도일(DD) 추이
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
                    onClick={() => { setLinePest(p.name); setLineGenIdx(0); }}
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

                {/* 범위 필터 */}
                <div className="flex gap-1 ml-auto border-l pl-3">
                  {ZOOM_STEPS.map(z => (
                    <button
                      key={z}
                      onClick={() => setLineRange(z)}
                      data-testid={`btn-range-${z}`}
                      className={`text-xs px-2 py-1 rounded border transition-all ${
                        lineRange === z ? "bg-primary text-primary-foreground border-transparent" : "text-muted-foreground border-border hover:border-primary"
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
              <div ref={chartContainerRef}>
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
                        const mRel = (pt.calMonthIdx ?? pt.monthIdx) % 12;
                        const yearOffset = Math.floor((pt.calMonthIdx ?? 0) / 12);
                        const yearLabel = yearOffset > 0 ? ` (${currentYear + yearOffset}년)` : "";
                        return (
                          <div className="bg-background border rounded p-2 text-xs shadow">
                            <p className="font-semibold">{mRel + 1}월 {pt.dayOfMonth}일{yearLabel}</p>
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

        {/* ── 돌발해충 발생 이력 ── */}
        <Card className="mt-4">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setInvasiveOpen(o => !o)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Siren className="h-4 w-4 text-orange-500" />
                  돌발해충 발생 이력
                  {!invasiveOpen && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">(클릭하여 펼치기)</span>
                  )}
                </CardTitle>
                {invasiveOpen && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    최근 5년간 이천시 돌발해충 발생 이력 · 방제 사업 현황 · 해충 사진 관리
                  </p>
                )}
              </div>
              <div className="p-1 rounded hover:bg-muted transition-colors" data-testid="button-toggle-invasive">
                {invasiveOpen
                  ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>

            {invasiveOpen && (
              <div className="flex flex-wrap items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                {INVASIVE_PEST_DATA.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setInvasivePest(p.key)}
                    data-testid={`tab-invasive-${p.key}`}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                      invasivePest === p.key ? "text-white border-transparent" : "bg-transparent text-muted-foreground border-border hover:border-primary"
                    }`}
                    style={invasivePest === p.key ? { backgroundColor: p.color, boxShadow: `0 2px 10px ${p.color}50` } : {}}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </CardHeader>

          {invasiveOpen && (
            <CardContent>
              <InvasivePestHistory
                data={INVASIVE_PEST_DATA.find(p => p.key === invasivePest)!}
                todayPct={todayPct}
              />
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
  survey:  "#f59e0b",
  control: "#ef4444",
  end:     "#4ade80",
};

function BarTimeline({
  pestName, baseTemp, pestColor, generations, genLabels,
}: {
  pestName: string;
  baseTemp: number;
  pestColor: string;
  generations: number[];
  genLabels: string[];
}) {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<BarTooltip | null>(null);

  useEffect(() => { setSelectedRow(null); setTooltip(null); }, [pestName, generations]);

  const monthRuler = useMemo(() => {
    const ruler: { label: string; pct: number }[] = [];
    for (let m = 0; m < 12; m++) {
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
        { title: "예찰 시기",   range: `${doyToLabel(row.doy70)} ~ ${doyToLabel(row.doy90)}`,   color: BAR_COLORS.survey  },
        { title: "방제 시기",   range: `${doyToLabel(row.doy90)} ~ ${doyToLabel(row.doy100)}`,  color: BAR_COLORS.control },
        { title: "방제 종료",   range: `${doyToLabel(row.doy100)} ~ ${doyToLabel(row.doy107)}`, color: BAR_COLORS.end     },
      ],
    });
  };

  const LABEL_W = generations.length > 1 ? 56 : 0;

  return (
    <div className="w-full">
      {/* ── 범례 ── */}
      <div className="flex flex-wrap items-center gap-4 mb-5 text-xs text-muted-foreground">
        {[
          { color: BAR_COLORS.survey,  label: "예찰 시기" },
          { color: BAR_COLORS.control, label: "방제 시기" },
          { color: BAR_COLORS.end,     label: "방제 종료" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-3" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* ── 타임라인 본체 ── */}
      <div className="relative">

        {/* 월 눈금 헤더 */}
        <div className="flex items-end mb-1">
          {LABEL_W > 0 && <div style={{ width: LABEL_W }} className="shrink-0" />}
          <div className="relative flex-1 h-6">
            {monthRuler.map(r => (
              <div
                key={r.label}
                className="absolute flex items-end"
                style={{ left: `${r.pct}%`, transform: "translateX(-50%)" }}
              >
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 바 행들 ── */}
        {rows.map((row, rowIdx) => {
          const isSelected = selectedRow === rowIdx;
          return (
            <div key={rowIdx} className="mb-3 relative">

              {/* 행 레이아웃: 레이블 + 트랙 */}
              <div
                className="flex items-center gap-0 cursor-pointer group"
                onMouseLeave={() => setTooltip(null)}
                onClick={() => setSelectedRow(r => r === rowIdx ? null : rowIdx)}
              >
                {/* 레이블 */}
                {generations.length > 1 && (
                  <div
                    className="shrink-0 flex items-center pr-2"
                    style={{ width: LABEL_W }}
                  >
                    <span className="text-xs font-bold leading-none" style={{ color: pestColor }}>{row.label}</span>
                  </div>
                )}

                {/* 트랙 */}
                <div className="relative flex-1 overflow-visible">
                  {/* 배경 바 */}
                  <div className="relative h-8 bg-slate-100 dark:bg-slate-800 overflow-hidden">

                    {/* 그리드선 */}
                    {monthRuler.map(r => (
                      <div
                        key={r.label}
                        className="absolute top-0 bottom-0 border-l border-slate-200 dark:border-slate-700"
                        style={{ left: `${r.pct}%` }}
                      />
                    ))}

                    {/* ① 예찰 구간 (p70 ~ p90) */}
                    {row.p90 > row.p70 && (
                      <div
                        className="absolute top-1 bottom-1 transition-opacity duration-150 group-hover:opacity-90"
                        style={{
                          left: `${row.p70}%`,
                          width: `${row.p90 - row.p70}%`,
                          backgroundColor: BAR_COLORS.survey,
                        }}
                        onMouseEnter={() => showTooltip(rowIdx, row)}
                      />
                    )}

                    {/* ② 방제 시기 (p90 ~ p100) */}
                    {row.p100 > row.p90 && (
                      <div
                        className="absolute top-1 bottom-1 transition-opacity duration-150 group-hover:opacity-90"
                        style={{
                          left: `${row.p90}%`,
                          width: `${row.p100 - row.p90}%`,
                          backgroundColor: BAR_COLORS.control,
                        }}
                        onMouseEnter={() => showTooltip(rowIdx, row)}
                      />
                    )}

                    {/* ③ 방제 종료 (p100 ~ p107) */}
                    {row.p107 > row.p100 && (
                      <div
                        className="absolute top-1 bottom-1 transition-opacity duration-150 group-hover:opacity-90"
                        style={{
                          left: `${row.p100}%`,
                          width: `${row.p107 - row.p100}%`,
                          backgroundColor: BAR_COLORS.end,
                        }}
                        onMouseEnter={() => showTooltip(rowIdx, row)}
                      />
                    )}
                  </div>

                  {/* Hover 툴팁 */}
                  {tooltip?.rowIdx === rowIdx && (
                    <div
                      className="absolute bottom-full mb-2 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl px-3.5 py-2.5 pointer-events-none min-w-[190px]"
                      style={{ left: `${Math.min(Math.max(tooltip.midPct, 10), 70)}%`, transform: "translateX(-50%)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pestColor }} />
                        <p className="text-xs font-bold" style={{ color: pestColor }}>{row.label}</p>
                      </div>
                      <div className="space-y-1">
                        {tooltip.content.map((item, ci) => (
                          <div key={ci} className="flex justify-between gap-3 text-[11px]">
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-2 h-2 shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-slate-400">{item.title}</span>
                            </span>
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
                  className="mt-2 rounded-xl border bg-white dark:bg-slate-900 p-4 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 shadow-lg"
                  style={{ borderColor: pestColor + "30" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pestColor }} />
                    <p className="font-bold text-sm" style={{ color: pestColor }}>{row.label} 방제 일정 상세</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {[
                      { label: "예찰 시작",         doy: row.doy70,  color: BAR_COLORS.survey  },
                      { label: "집중 예찰 시작",    doy: row.doy85,  color: "#d97706"           },
                      { label: "방제 시작",         doy: row.doy90,  color: BAR_COLORS.control  },
                      { label: "방제 최적 (100%)",  doy: row.doy100, color: "#dc2626"           },
                      { label: "방제 종료",         doy: row.doy107, color: BAR_COLORS.end      },
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

// ─── 돌발해충 발생 이력 컴포넌트 ──────────────────────────────────────────────
function InvasivePestHistory({ data, todayPct }: { data: InvasivePestData; todayPct: number }) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [selectedProjectIdx, setSelectedProjectIdx] = useState<number | null>(null);

  const monthRuler = useMemo(() => {
    const ruler: { label: string; pct: number }[] = [];
    for (let m = 0; m < 12; m++) {
      ruler.push({ label: MONTHS_KO[m], pct: dayOfYearToPct(MONTH_START_DAY[m]) });
    }
    return ruler;
  }, []);

  const sortedHistory = useMemo(
    () => [...data.history].sort((a, b) => b.year - a.year),
    [data.history],
  );

  const highestSeverityYear = useMemo(
    () => data.history.reduce((worst, r) => {
      const rank = { low: 0, medium: 1, high: 2 };
      return rank[r.severity] > rank[worst.severity] ? r : worst;
    }),
    [data.history],
  );

  return (
    <div className="space-y-8">

      {/* ── 해충 정보 헤더 ── */}
      <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white"
          style={{ background: `linear-gradient(135deg, ${data.color}cc, ${data.color})` }}
        >
          <Bug className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-sm">{data.name}</span>
            <span className="text-xs text-slate-400 italic">{data.scientificName}</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white ml-auto shrink-0"
              style={{ backgroundColor: SEVERITY_CONFIG[highestSeverityYear.severity].color }}
            >
              최대 발생: {SEVERITY_CONFIG[highestSeverityYear.severity].label} ({highestSeverityYear.year}년)
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{data.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[10px] text-slate-400 mr-1 self-center">주요 발생시기</span>
            {data.peakMonths.map(m => (
              <span
                key={m}
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white"
                style={{ backgroundColor: data.color }}
              >
                {m + 1}월
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5년간 발생 이력 타임라인 ── */}
      <div>
        <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
          <History className="h-4 w-4" style={{ color: data.color }} />
          5년간 발생 이력 타임라인
        </h4>

        <div className="relative">
          {/* 전체 높이 그리드선 레이어 */}
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
          <div className="relative h-10 mb-1">
            {monthRuler.map(r => (
              <div
                key={r.label}
                className="absolute flex flex-col items-center"
                style={{ left: `${r.pct}%`, transform: "translateX(-50%)" }}
              >
                <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.label}</span>
              </div>
            ))}
            {todayPct > 0 && todayPct < 100 && (
              <div
                className="absolute flex flex-col items-center gap-0.5"
                style={{ left: `${todayPct}%`, transform: "translateX(-50%)", top: 0 }}
              >
                <div className="bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-md font-bold">Today</div>
                <div className="w-[2px] h-2 bg-blue-400 rounded-full" />
              </div>
            )}
          </div>

          {/* 연도별 바 행 */}
          {sortedHistory.map(rec => {
            const startPct = dayOfYearToPct(rec.startDoy);
            const endPct   = dayOfYearToPct(rec.endDoy);
            const cfg      = SEVERITY_CONFIG[rec.severity];
            const isHov    = hoveredYear === rec.year;

            return (
              <div key={rec.year} className="mb-3 relative z-10">
                {/* 연도 메타 라벨 */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-500 w-10 shrink-0 tabular-nums">{rec.year}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-white"
                    style={{ backgroundColor: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  {rec.project && (
                    <span className="text-[10px] text-slate-400 truncate">📋 {rec.project}</span>
                  )}
                </div>

                {/* 클릭·hover 가능한 트랙 */}
                <div
                  className="relative h-8 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md"
                  onMouseEnter={() => setHoveredYear(rec.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                  data-testid={`invasive-bar-${rec.year}`}
                >
                  {/* 발생 기간 바 */}
                  <div
                    className="absolute top-1.5 bottom-1.5 rounded-full transition-all duration-200"
                    style={{
                      left: `${startPct}%`,
                      width: `${Math.max(endPct - startPct, 1)}%`,
                      backgroundColor: cfg.color,
                      opacity: isHov ? 1 : 0.7,
                      boxShadow: isHov ? `0 2px 8px ${cfg.color}60` : "none",
                    }}
                  />

                  {/* Today 선 (바 내부) */}
                  {todayPct > 0 && todayPct < 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] z-20 rounded-full"
                      style={{ left: `${todayPct}%`, background: "linear-gradient(to bottom, #60a5fa, #3b82f6)" }}
                    />
                  )}

                  {/* Hover 툴팁 */}
                  {isHov && (
                    <div
                      className="absolute bottom-full mb-2.5 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-2xl px-4 py-3 pointer-events-none min-w-[240px]"
                      style={{
                        left: `${Math.min(Math.max((startPct + endPct) / 2, 15), 62)}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span className="text-xs font-bold">{rec.year}년 발생 이력</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white ml-auto"
                          style={{ backgroundColor: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">발생 기간</span>
                          <span className="font-semibold whitespace-nowrap">{doyToLabel(rec.startDoy)} ~ {doyToLabel(rec.endDoy)}</span>
                        </div>
                        {rec.project && (
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">방제 사업</span>
                            <span className="font-semibold text-right">{rec.project}</span>
                          </div>
                        )}
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700">
                          <p className="text-slate-500 leading-relaxed">{rec.note}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 발생 강도 범례 */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="text-[11px] text-slate-400">발생 강도</span>
            {(["low", "medium", "high"] as InvasiveSeverity[]).map(s => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_CONFIG[s].color }} />
                {SEVERITY_CONFIG[s].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 이전 해충 방제 사업 ── */}
      <div>
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full inline-block" style={{ backgroundColor: data.color }} />
          이전 해충 방제 사업
          <span className="text-[11px] font-normal text-muted-foreground ml-1">— 사업 클릭 시 발생 사진 확인</span>
        </h4>
        <div className="space-y-2">
          {data.projects.map((proj, i) => {
            const isOpen = selectedProjectIdx === i;
            return (
              <div key={i} className="rounded-2xl border bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 overflow-hidden transition-all">
                <button
                  data-testid={`btn-project-${i}`}
                  className="w-full text-left p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  onClick={() => setSelectedProjectIdx(isOpen ? null : i)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold tabular-nums">{proj.year}년</span>
                        <span className="text-xs font-bold truncate">{proj.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white"
                          style={{ backgroundColor: proj.result.includes("진행") ? "#f59e0b" : "#22c55e" }}
                        >
                          {proj.result}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Camera className="h-3 w-3" /> 발생 사진 {isOpen ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color: data.color }}>
                      {proj.budget}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5 border-t border-slate-100 dark:border-slate-700 pt-3">
                    <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {proj.year}년 방제 사업 발생 사진
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {proj.photos.map((photo, pi) => (
                        <div
                          key={pi}
                          data-testid={`photo-slot-${i}-${pi}`}
                          className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 aspect-square flex flex-col items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800/40"
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                            style={{ backgroundColor: data.color + "15" }}
                          >
                            {photo.icon}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">{photo.label}</span>
                          <span className="text-[9px] text-slate-300 dark:text-slate-600 flex items-center gap-0.5">
                            <Camera className="h-2 w-2" /> 사진 추가
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
