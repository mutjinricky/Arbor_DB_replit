import { useState, useMemo, useEffect } from "react";
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
function buildMonthlyDD(baseTemp: number): number[] {
  let cum = 0;
  return ICHEON_MONTHLY_AVG.map((avg, i) => {
    cum += Math.max(0, avg - baseTemp) * MONTH_DAYS[i];
    return Math.round(cum);
  });
}

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

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function PestCalendar() {
  const { pestDDs, isRealData, isLoading } = useWeatherData();
  const nowMonth = new Date().getMonth();

  const [selectedPest, setSelectedPest] = useState("복숭아순나방");
  const [peachCardGenIdx, setPeachCardGenIdx] = useState(0);
  const [graphOpen, setGraphOpen] = useState(false);
  const [barSelectedGens, setBarSelectedGens] = useState<boolean[]>([true, true, true, true]);
  const [barPest, setBarPest] = useState("복숭아순나방");

  useEffect(() => {
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
            setGenIdx={setPeachCardGenIdx}
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

        {/* ── 방제기간 막대바 (토글, 맨 아래) ── */}
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setGraphOpen(o => !o)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  방제기간 막대바
                  {!graphOpen && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">(클릭하여 펼치기)</span>
                  )}
                </CardTitle>
                {graphOpen && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    해충별 예찰·방제 기간을 막대바로 확인하세요
                  </p>
                )}
              </div>
              <div className="p-1 rounded hover:bg-muted transition-colors" data-testid="button-toggle-graph">
                {graphOpen
                  ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>

            {/* 해충 선택 탭 */}
            {graphOpen && (
              <div className="flex flex-wrap items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
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

                {/* 다세대 체크박스 */}
                {graphOpen && isBarMultiGen && (
                  <div className="flex gap-2 ml-2 border-l pl-3" onClick={e => e.stopPropagation()}>
                    {PEACH_GENERATIONS.map((_, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-1 text-xs cursor-pointer select-none"
                        data-testid={`checkbox-gen-${idx + 1}`}
                      >
                        <input
                          type="checkbox"
                          checked={barSelectedGens[idx]}
                          onChange={() => toggleGen(idx)}
                          className="accent-red-500 w-3.5 h-3.5"
                        />
                        <span className={barSelectedGens[idx] ? "text-red-600 font-medium" : "text-muted-foreground"}>
                          {idx + 1}세대
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardHeader>

          {graphOpen && (
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
          )}
        </Card>

      </div>
    </div>
  );
}

// ─── 방제기간 막대바 ──────────────────────────────────────────────────────────
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
  // 월 눈금 계산
  const monthRuler = useMemo(() => {
    const ruler: { label: string; pct: number }[] = [];
    for (let m = TL_MONTH_START; m < TL_MONTH_END; m++) {
      ruler.push({ label: MONTHS_KO[m], pct: dayOfYearToPct(MONTH_START_DAY[m]) });
    }
    return ruler;
  }, []);

  // 각 세대 막대 데이터
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
        doy70:  ms.p70,
        doy85:  ms.p85,
        doy90:  ms.p90,
        doy100: ms.p100,
        doy107: ms.p107,
      };
    });
  }, [generations, genLabels, baseTemp]);

  return (
    <div className="w-full">
      {/* 범례 */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-sm bg-yellow-100 border border-yellow-300" />예찰 시기
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-sm bg-amber-400" />집중 예찰
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-sm" style={{ background: "linear-gradient(to right, #f97316, #dc2626)" }} />방제 시기
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-sm bg-red-200" />방제 종료 구간
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-4 bg-blue-500" />오늘
        </span>
      </div>

      {/* 전체 타임라인 컨테이너 */}
      <div className="relative">
        {/* 월 눈금 헤더 */}
        <div className="relative h-7 mb-1 border-b border-border">
          {monthRuler.map(r => (
            <div
              key={r.label}
              className="absolute flex flex-col items-center"
              style={{ left: `${r.pct}%`, transform: "translateX(-50%)" }}
            >
              <div className="h-2 w-px bg-border mb-0.5" />
              <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">{r.label}</span>
            </div>
          ))}
          {/* 오늘 선 (헤더) */}
          {todayPct > 0 && todayPct < 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
              style={{ left: `${todayPct}%` }}
            />
          )}
        </div>

        {/* 막대 행들 */}
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="mb-6">
            {/* 행 레이블 */}
            {generations.length > 1 && (
              <div className="text-xs font-semibold mb-1.5" style={{ color: pestColor }}>
                {row.label} <span className="text-muted-foreground font-normal">(목표 {row.target} DD)</span>
              </div>
            )}

            {/* 막대 영역 */}
            <div className="relative h-9 rounded-md bg-muted/30 border border-border overflow-visible">
              {/* 예찰 시기 (70~85%) — 연노랑 */}
              {row.p85 > row.p70 && (
                <div
                  className="absolute top-0 h-full bg-yellow-100 border-r border-yellow-300"
                  style={{ left: `${row.p70}%`, width: `${row.p85 - row.p70}%` }}
                />
              )}
              {/* 집중 예찰 (85~90%) — 진노랑 */}
              {row.p90 > row.p85 && (
                <div
                  className="absolute top-0 h-full bg-amber-400 border-r border-amber-500"
                  style={{ left: `${row.p85}%`, width: `${row.p90 - row.p85}%` }}
                />
              )}
              {/* 방제 시작~최적 (90~100%) — 주황→빨강 그라디언트 */}
              {row.p100 > row.p90 && (
                <div
                  className="absolute top-0 h-full border-r border-red-600"
                  style={{
                    left: `${row.p90}%`,
                    width: `${row.p100 - row.p90}%`,
                    background: "linear-gradient(to right, #f97316, #dc2626)",
                  }}
                />
              )}
              {/* 방제 종료 구간 (100~107.5%) — 연빨강 */}
              {row.p107 > row.p100 && (
                <div
                  className="absolute top-0 h-full bg-red-200"
                  style={{ left: `${row.p100}%`, width: `${row.p107 - row.p100}%` }}
                />
              )}

              {/* 눈금 선 */}
              {[
                { pct: row.p70,  color: "#ca8a04" },
                { pct: row.p85,  color: "#d97706" },
                { pct: row.p90,  color: "#ea580c" },
                { pct: row.p100, color: "#dc2626" },
                { pct: row.p107, color: "#dc2626" },
              ].map((tick, ti) => (
                <div
                  key={ti}
                  className="absolute top-0 h-full w-0.5"
                  style={{ left: `${tick.pct}%`, backgroundColor: tick.color, opacity: 0.7 }}
                />
              ))}

              {/* 오늘 선 */}
              {todayPct > 0 && todayPct < 100 && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-blue-500 z-10"
                  style={{ left: `${todayPct}%` }}
                />
              )}
            </div>

            {/* 날짜 레이블 */}
            <div className="relative h-14 mt-0.5">
              {[
                { pct: row.p70,  doy: row.doy70,  label: "예찰 시작", color: "#ca8a04", up: false },
                { pct: row.p85,  doy: row.doy85,  label: "집중예찰",  color: "#d97706", up: true  },
                { pct: row.p90,  doy: row.doy90,  label: "방제 시작", color: "#ea580c", up: false },
                { pct: row.p100, doy: row.doy100, label: "방제 최적", color: "#dc2626", up: true  },
                { pct: row.p107, doy: row.doy107, label: "방제 종료", color: "#dc2626", up: false },
              ].map((item, ti) => (
                <div
                  key={ti}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${item.pct}%`,
                    transform: "translateX(-50%)",
                    top: item.up ? 0 : 28,
                  }}
                >
                  <div className="w-px h-2" style={{ backgroundColor: item.color }} />
                  <div className="text-center" style={{ color: item.color }}>
                    <div className="text-[9px] font-medium leading-tight whitespace-nowrap">{item.label}</div>
                    <div className="text-[9px] leading-tight whitespace-nowrap">{doyToLabel(item.doy)}</div>
                  </div>
                </div>
              ))}
              {/* 오늘 레이블 */}
              {todayPct > 0 && todayPct < 100 && (
                <div
                  className="absolute flex flex-col items-center"
                  style={{ left: `${todayPct}%`, transform: "translateX(-50%)", top: 12 }}
                >
                  <div className="text-[9px] text-blue-500 font-medium whitespace-nowrap">오늘</div>
                </div>
              )}
            </div>
          </div>
        ))}
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
