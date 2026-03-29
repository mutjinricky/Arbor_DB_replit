import { useState, useMemo } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";
import { useWeatherData, PEST_TARGETS } from "@/hooks/useWeatherData";

// ─── 상수 ───────────────────────────────────────────────────────────────────
const ICHEON_MONTHLY_AVG = [-3.4, -0.6, 5.9, 12.9, 18.1, 22.4, 25.6, 26.0, 20.7, 13.8, 6.0, -0.7];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const PEST_COLOR: Record<string, string> = {
  복숭아순나방: "#ef4444",
  꽃매미: "#f97316",
  갈색날개매미충: "#8b5cf6",
};

// 복숭아순나방 다세대 목표 DD (PDF 7항)
const PEACH_GENERATIONS = [214, 660, 1380, 1950];

// PDF 8항 — 월별 방제 시기표 (0-based month index)
// ● 주요방제, ◎ 추가·2차, ○ 예찰·보조
type MarkType = "primary" | "secondary" | "observe" | "none";
const MONTHLY_SCHEDULE: Record<string, MarkType[]> = {
  복숭아순나방: ["none","none","none","none","primary","primary","secondary","primary","secondary","none","none","none"],
  꽃매미:      ["none","none","none","observe","primary","secondary","secondary","primary","observe","none","none","none"],
  갈색날개매미충:["none","none","none","observe","primary","secondary","observe","primary","secondary","none","none","none"],
};

// 4단계 상태 (PDF 3항)
type PestStatus = "정상" | "예찰" | "준비" | "실행";
function getPestStatus(pct: number): PestStatus {
  if (pct >= 100) return "실행";
  if (pct >= 90)  return "준비";
  if (pct >= 70)  return "예찰";
  return "정상";
}
const STATUS_STYLE: Record<PestStatus, { badge: string; bar: string; label: string }> = {
  정상: { badge: "bg-green-100 text-green-700 border-green-200",  bar: "#22c55e", label: "정상 — 정보 조회 중심" },
  예찰: { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", bar: "#eab308", label: "예찰 — 현장 조사 필요" },
  준비: { badge: "bg-orange-100 text-orange-700 border-orange-200", bar: "#f97316", label: "준비 — 방제 준비 알림" },
  실행: { badge: "bg-red-100 text-red-700 border-red-200",   bar: "#ef4444", label: "실행 — 방제 실행 권고" },
};

// ─── 유틸 ───────────────────────────────────────────────────────────────────
function buildMonthlyDD(baseTemp: number): { monthly: number; cumulative: number }[] {
  let cumulative = 0;
  return ICHEON_MONTHLY_AVG.map((avg, i) => {
    const monthly = Math.max(0, avg - baseTemp) * MONTH_DAYS[i];
    cumulative += monthly;
    return { monthly, cumulative };
  });
}

function estimateDateForDD(baseTemp: number, targetDD: number): string {
  let cumulative = 0;
  for (let m = 0; m < 12; m++) {
    const monthlyDD = Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp) * MONTH_DAYS[m];
    if (cumulative + monthlyDD >= targetDD) {
      const dailyDD = Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp);
      const day = dailyDD > 0
        ? Math.min(Math.ceil((targetDD - cumulative) / dailyDD), MONTH_DAYS[m])
        : MONTH_DAYS[m];
      return `${m + 1}월 ${day}일`;
    }
    cumulative += monthlyDD;
  }
  return "—";
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function PestCalendar() {
  const { pestDDs, isRealData, isLoading } = useWeatherData();
  const [selectedPest, setSelectedPest] = useState<string>("복숭아순나방");
  const [rangeMonths, setRangeMonths] = useState<3 | 6 | 12>(3);

  // ── 선택 해충 기본 정보
  const pestBase = PEST_TARGETS.find((p) => p.name === selectedPest) ?? PEST_TARGETS[0];

  // ── 카드용: 각 해충의 현재 상태 + 마일스톤 날짜 계산
  const pestCards = useMemo(() => {
    return PEST_TARGETS.map((pest) => {
      const dd = pestDDs[pest.name];
      const currentDD = dd?.currentDD ?? 0;
      const target = pest.targetDD;
      const pct = Math.min(110, Math.round((currentDD / target) * 100));
      const status = getPestStatus(pct);

      const dates = {
        surveyStart: estimateDateForDD(pest.baseTemp, target * 0.70),
        intenseStart: estimateDateForDD(pest.baseTemp, target * 0.85),
        controlStart: estimateDateForDD(pest.baseTemp, target * 0.90),
        controlBest:  estimateDateForDD(pest.baseTemp, target * 1.00),
        controlEnd:   estimateDateForDD(pest.baseTemp, target * 1.075),
      };

      const remaining = Math.max(0, target - currentDD);
      const avgDailyDD = Math.max(0.5, 12 - pest.baseTemp);
      const daysLeft = Math.round(remaining / avgDailyDD);

      return { ...pest, currentDD: Math.round(currentDD), pct, status, dates, daysLeft };
    });
  }, [pestDDs]);

  // ── 그래프 데이터: 선택 해충의 월별 누적 DD
  const monthlyDD = useMemo(() => buildMonthlyDD(pestBase.baseTemp), [pestBase.baseTemp]);

  // 현재 달(0-based) 기준 범위 시작
  const nowMonth = new Date().getMonth(); // 0-based
  const rangeStart = Math.max(0, Math.min(nowMonth - 1, 12 - rangeMonths));

  const chartData = useMemo(() => {
    return monthlyDD
      .map((d, i) => ({ month: MONTHS_KO[i], monthIdx: i, cumulative: Math.round(d.cumulative) }))
      .slice(rangeStart, rangeStart + rangeMonths);
  }, [monthlyDD, rangeStart, rangeMonths]);

  // 현재 누적 DD (시뮬레이션 기준 현재 달까지)
  const currentDDForChart = Math.round(pestDDs[selectedPest]?.currentDD ?? monthlyDD[nowMonth]?.cumulative ?? 0);

  // ── 마일스톤 DD 값 (Y축 기준선용)
  const target = pestBase.targetDD;
  const milestones = {
    surveyStart:  Math.round(target * 0.70),
    intenseStart: Math.round(target * 0.85),
    controlStart: Math.round(target * 0.90),
    controlBest:  target,
    controlEnd:   Math.round(target * 1.075),
  };

  // 다세대 (복숭아순나방)용 마일스톤 목록
  const isMultiGen = selectedPest === "복숭아순나방";
  const genTargets = isMultiGen ? PEACH_GENERATIONS : [target];

  // Y축 최댓값
  const yMax = Math.max(...chartData.map((d) => d.cumulative), milestones.controlEnd, ...(isMultiGen ? PEACH_GENERATIONS : [])) * 1.05;

  // ── 현재 상태 색상 (세로 현재위치 표시용)
  const nowCard = pestCards.find((p) => p.name === selectedPest)!;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* 헤더 */}
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
          {pestCards.map((p) => {
            const s = STATUS_STYLE[p.status];
            const isSelected = p.name === selectedPest;
            return (
              <Card
                key={p.name}
                data-testid={`card-pest-${p.name}`}
                className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary" : "hover:shadow-md"}`}
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
                  {/* DD 진행률 */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">누적 DD</span>
                      <span className="font-semibold">{p.currentDD} / {p.targetDD} DD</span>
                    </div>
                    <div className="relative w-full bg-muted rounded-full h-3">
                      {/* 집중예찰 구간 85~90% */}
                      <div className="absolute h-3 rounded-full bg-yellow-200/60" style={{ left: "85%", width: "5%", top: 0 }} />
                      {/* 진행 바 */}
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(p.pct, 100)}%`, backgroundColor: s.bar }}
                      />
                      {/* 70%, 90% 마커 */}
                      {[70, 90].map((pct) => (
                        <div key={pct} className="absolute top-0 h-3 w-0.5 bg-white/60" style={{ left: `${pct}%` }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                      <span>{p.pct}% 도달</span>
                      <span className="italic">{s.label}</span>
                    </div>
                  </div>

                  {/* 마일스톤 날짜 */}
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <MilestoneRow icon="·····" label="예찰 시작" date={p.dates.surveyStart} color="#22c55e" />
                    <MilestoneRow icon="≈≈≈≈" label="집중예찰" date={`${p.dates.intenseStart} ~ ${p.dates.controlStart}`} color="#eab308" />
                    <MilestoneRow icon="·····" label="방제 시작일" date={p.dates.controlStart} color="#f97316" />
                    <MilestoneRow icon="━━━━" label="방제 최적일" date={p.dates.controlBest} color="#ef4444" bold />
                    <MilestoneRow icon="·····" label="방제 종료일" date={p.dates.controlEnd} color="#ef4444" />
                  </div>

                  {/* 잔여일 */}
                  <div className="text-center text-xs font-semibold" style={{ color: s.bar }}>
                    {p.daysLeft > 0 ? `D-${p.daysLeft}일` : "방제 실행 권고"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── 방제 시기 그래프 ── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">
                  방제 시기 그래프 — {selectedPest}
                  {isMultiGen && <span className="text-xs text-muted-foreground ml-2">(4세대 표시)</span>}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  유효적산온도 누적 추이 및 방제 권장 구간 | 현재 누적: {currentDDForChart} DD
                </p>
              </div>
              {/* 기간 선택 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">표시 기간</span>
                {([3, 6, 12] as const).map((m) => (
                  <Button
                    key={m}
                    variant={rangeMonths === m ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => setRangeMonths(m)}
                    data-testid={`button-range-${m}`}
                  >
                    {m === 12 ? "전체" : `${m}개월`}
                  </Button>
                ))}
              </div>
            </div>

            {/* 해충 필터 탭 */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {PEST_TARGETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedPest(p.name)}
                  data-testid={`tab-pest-${p.name}`}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    selectedPest === p.name
                      ? "text-white border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary"
                  }`}
                  style={selectedPest === p.name ? { backgroundColor: PEST_COLOR[p.name] } : {}}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={chartData} margin={{ top: 16, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  unit=" DD"
                  domain={[0, Math.ceil(yMax / 100) * 100]}
                  width={65}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} DD`, "누적 DD"]}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />

                {/* ── 반투명 띠: 집중예찰 (85~90%) ── */}
                <ReferenceArea
                  y1={milestones.intenseStart}
                  y2={milestones.controlStart}
                  fill="#eab308"
                  fillOpacity={0.12}
                  ifOverflow="extendDomain"
                />

                {/* ── 반투명 띠: 방제 권장기간 (90~107.5%) ── */}
                <ReferenceArea
                  y1={milestones.controlStart}
                  y2={milestones.controlEnd}
                  fill="#ef4444"
                  fillOpacity={0.10}
                  ifOverflow="extendDomain"
                />

                {/* ── 마일스톤 기준선 (단일 세대) ── */}
                {!isMultiGen && <>
                  <ReferenceLine y={milestones.surveyStart} stroke="#22c55e" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: "예찰 시작(70%)", position: "insideTopRight", fontSize: 9, fill: "#22c55e" }} />
                  <ReferenceLine y={milestones.controlStart} stroke="#f97316" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: "방제 시작(90%)", position: "insideTopRight", fontSize: 9, fill: "#f97316" }} />
                  <ReferenceLine y={milestones.controlBest} stroke="#ef4444" strokeWidth={2}
                    label={{ value: "방제 최적(100%)", position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />
                  <ReferenceLine y={milestones.controlEnd} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: "방제 종료(107%)", position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />
                </>}

                {/* ── 다세대 기준선 (복숭아순나방) ── */}
                {isMultiGen && PEACH_GENERATIONS.map((genDD, idx) => (
                  <ReferenceLine
                    key={`gen-${idx}`}
                    y={genDD}
                    stroke="#ef4444"
                    strokeWidth={idx === 0 ? 2 : 1.5}
                    strokeDasharray={idx === 0 ? "0" : "5 4"}
                    label={{
                      value: `${idx + 1}세대 (${genDD} DD)`,
                      position: "insideTopRight",
                      fontSize: 9,
                      fill: "#ef4444",
                    }}
                  />
                ))}

                {/* ── 현재 DD 기준선 ── */}
                <ReferenceLine
                  y={currentDDForChart}
                  stroke={nowCard ? STATUS_STYLE[nowCard.status].bar : "#6366f1"}
                  strokeWidth={2}
                  strokeDasharray="8 3"
                  label={{
                    value: `현재 ${currentDDForChart} DD`,
                    position: "insideBottomRight",
                    fontSize: 10,
                    fill: nowCard ? STATUS_STYLE[nowCard.status].bar : "#6366f1",
                  }}
                />

                {/* ── 누적 DD 곡선 ── */}
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

            {/* 범례 설명 */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 border-t-2 border-dashed border-green-500" />예찰 시작 (70% DD)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-3 bg-yellow-300/50 border border-yellow-400 rounded-sm" />집중예찰 구간 (85~90%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 border-t-2 border-dashed border-orange-500" />방제 시작일 (90%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 border-t-2 border-red-500" />방제 최적일 (100%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 border-t-2 border-dashed border-red-500" />방제 종료일 (107%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-3 bg-red-300/30 border border-red-400 rounded-sm" />방제 권장기간
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── 월별 방제 시기표 ── */}
        <Card>
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
                    {MONTHS_KO.map((m) => (
                      <th key={m} className="text-center py-2 px-1 font-medium text-muted-foreground w-10">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(MONTHLY_SCHEDULE).map(([name, schedule]) => (
                    <tr key={name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 font-medium" style={{ color: PEST_COLOR[name] }}>{name}</td>
                      {schedule.map((mark, i) => (
                        <ScheduleCell key={i} mark={mark} color={PEST_COLOR[name]} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <p>• <strong>복숭아순나방</strong>: 연 4세대 — 1세대(214 DD), 2세대(660 DD), 3세대(1,380 DD), 4세대(1,950 DD) 방제적기</p>
              <p>• <strong>꽃매미</strong>: 5월 약충 부화 이후 방제 집중 (발육영점 8.14°C, 목표 355 DD)</p>
              <p>• <strong>갈색날개매미충</strong>: 4~5월 약충 발생 초기 방제 중요 (발육영점 12.1°C, 목표 202 DD)</p>
              <p className="text-xs mt-2 text-primary font-medium">※ 방제 시기는 기상청 실시간 데이터 연동 시 자동 업데이트됩니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────────
function MilestoneRow({
  icon, label, date, color, bold,
}: { icon: string; label: string; date: string; color: string; bold?: boolean }) {
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
  if (mark === "primary") {
    return (
      <td className="text-center py-3 px-1">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: color }}
          title="주요 방제"
        >●</span>
      </td>
    );
  }
  if (mark === "secondary") {
    return (
      <td className="text-center py-3 px-1">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-bold"
          style={{ borderColor: color, color }}
          title="추가·2차 방제"
        >◎</span>
      </td>
    );
  }
  if (mark === "observe") {
    return (
      <td className="text-center py-3 px-1">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs"
          style={{ borderColor: color + "80", color: color + "99" }}
          title="예찰·보조관리"
        >○</span>
      </td>
    );
  }
  return (
    <td className="text-center py-3 px-1">
      <span className="text-muted-foreground/30 text-xs">—</span>
    </td>
  );
}
