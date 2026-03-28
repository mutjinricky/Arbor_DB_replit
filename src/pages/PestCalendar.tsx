import { useMemo } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug } from "lucide-react";
import { useWeatherData, PEST_TARGETS } from "@/hooks/useWeatherData";

// 이천 월평균기온 (평년값)
const ICHEON_MONTHLY_AVG = [-3.4, -0.6, 5.9, 12.9, 18.1, 22.4, 25.6, 26.0, 20.7, 13.8, 6.0, -0.7];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS_KO = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

const PEST_COLORS = {
  복숭아순나방: "#ef4444",
  꽃매미: "#f97316",
  갈색날개매미충: "#8b5cf6",
};

function buildMonthlyDD(baseTemp: number) {
  let cumulative = 0;
  return ICHEON_MONTHLY_AVG.map((avg, i) => {
    const monthly = Math.max(0, avg - baseTemp) * MONTH_DAYS[i];
    cumulative += monthly;
    return { month: monthly, cumulative };
  });
}

function estimateControlDate(baseTemp: number, targetDD: number): string {
  let cumulative = 0;
  for (let m = 0; m < 12; m++) {
    const monthlyDD = Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp) * MONTH_DAYS[m];
    if (cumulative + monthlyDD >= targetDD) {
      const dailyDD = Math.max(0, ICHEON_MONTHLY_AVG[m] - baseTemp);
      const daysNeeded = dailyDD > 0 ? Math.ceil((targetDD - cumulative) / dailyDD) : MONTH_DAYS[m];
      const day = Math.min(daysNeeded, MONTH_DAYS[m]);
      return `${m + 1}월 ${day}일`;
    }
    cumulative += monthlyDD;
  }
  return "해당 없음";
}

export default function PestCalendar() {
  const { pestDDs, isRealData, isLoading } = useWeatherData();

  const chartData = useMemo(() => {
    return MONTHS_KO.map((month, i) => {
      const row: Record<string, number | string> = { month };
      for (const pest of PEST_TARGETS) {
        const monthly = buildMonthlyDD(pest.baseTemp);
        row[pest.name] = Math.round(monthly[i].cumulative);
      }
      return row;
    });
  }, []);

  const pestInfo = useMemo(() => {
    return PEST_TARGETS.map((pest) => {
      const dd = pestDDs[pest.name];
      const currentDD = dd?.currentDD ?? 0;
      const targetDD = pest.targetDD;
      const pct = Math.min(100, Math.round((currentDD / targetDD) * 100));
      const remaining = Math.max(0, targetDD - currentDD);
      const avgDailyDD = Math.max(0.5, 12 - pest.baseTemp);
      const daysLeft = Math.round(remaining / avgDailyDD);
      const controlDate = estimateControlDate(pest.baseTemp, targetDD);

      let grade: "danger" | "warning" | "safe" =
        daysLeft < 60 ? "danger" : daysLeft < 90 ? "warning" : "safe";

      return { ...pest, currentDD: Math.round(currentDD), pct, daysLeft, grade, controlDate };
    });
  }, [pestDDs]);

  const GRADE_BADGE: Record<string, string> = {
    danger: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    safe: "bg-green-100 text-green-700 border-green-200",
  };
  const GRADE_LABEL = { danger: "위험", warning: "주의", safe: "안전" };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
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
              isLoading
                ? "bg-muted text-muted-foreground border-border"
                : isRealData
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-yellow-100 text-yellow-700 border-yellow-200"
            }`}
          >
            {isLoading ? "기상 로딩 중…" : isRealData ? "기상청 실측 ●" : "평년값 시뮬레이션"}
          </span>
        </div>

        {/* Pest Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {pestInfo.map((p) => (
            <Card key={p.name} data-testid={`card-pest-${p.name}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={GRADE_BADGE[p.grade]}
                  >
                    {GRADE_LABEL[p.grade]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">발육영점온도 {p.baseTemp}°C</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">누적 DD</span>
                      <span className="font-semibold">
                        {p.currentDD} / {p.targetDD} DD
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{
                          width: `${p.pct}%`,
                          backgroundColor: PEST_COLORS[p.name as keyof typeof PEST_COLORS],
                        }}
                      />
                    </div>
                    <div className="text-right text-xs text-muted-foreground mt-0.5">{p.pct}% 도달</div>
                  </div>

                  {/* Key info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">방제 예상일</p>
                      <p className="font-semibold">{p.controlDate}</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">잔여 일수</p>
                      <p className="font-semibold"
                        style={{ color: PEST_COLORS[p.name as keyof typeof PEST_COLORS] }}
                      >
                        D-{p.daysLeft}일
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly Cumulative DD Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">월별 유효적산온도(DD) 누적 추이 (이천 평년)</CardTitle>
            <p className="text-xs text-muted-foreground">
              각 해충의 발육영점온도를 초과한 일평균기온의 누적 합계 — 목표 DD 도달 시점이 1차 방제 기준
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" DD" />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} DD`, name]}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                {PEST_TARGETS.map((pest) => (
                  <Area
                    key={pest.name}
                    type="monotone"
                    dataKey={pest.name}
                    stroke={PEST_COLORS[pest.name as keyof typeof PEST_COLORS]}
                    fill={PEST_COLORS[pest.name as keyof typeof PEST_COLORS]}
                    fillOpacity={0.08}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
                {/* Target DD reference lines */}
                {PEST_TARGETS.map((pest) => (
                  <ReferenceLine
                    key={`ref-${pest.name}`}
                    y={pest.targetDD}
                    stroke={PEST_COLORS[pest.name as keyof typeof PEST_COLORS]}
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: `${pest.name} 목표(${pest.targetDD})`,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: PEST_COLORS[pest.name as keyof typeof PEST_COLORS],
                    }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Calendar Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">월별 방제 시기표</CardTitle>
            <p className="text-xs text-muted-foreground">
              ● 방제 권고 월 &nbsp; ◎ 2차 방제 (선택) &nbsp; ○ 해당 없음
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-40">해충명</th>
                    {MONTHS_KO.map((m) => (
                      <th key={m} className="text-center py-2 px-1 font-medium text-muted-foreground w-10">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* 복숭아순나방: May 1차, Jun 2차 */}
                  <CalendarRow name="복숭아순나방" color={PEST_COLORS["복숭아순나방"]} primary={[4]} secondary={[5]} />
                  {/* 꽃매미: May 1차, Jun 2차 */}
                  <CalendarRow name="꽃매미" color={PEST_COLORS["꽃매미"]} primary={[4]} secondary={[5, 6]} />
                  {/* 갈색날개매미충: Apr-May 1차, Jun 2차 */}
                  <CalendarRow name="갈색날개매미충" color={PEST_COLORS["갈색날개매미충"]} primary={[3, 4]} secondary={[5]} />
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <p>• <strong>복숭아순나방</strong>: 5월 초 방제 (누적 260 DD 도달) — 복숭아·자두·벚꽃류 주요 해충</p>
              <p>• <strong>꽃매미</strong>: 5월 하순 방제 (누적 355 DD 도달) — 포도·가죽나무·벚나무 피해</p>
              <p>• <strong>갈색날개매미충</strong>: 4월 하순~5월 방제 (누적 202 DD 도달) — 과수·조경수 전반 피해</p>
              <p className="text-xs mt-2 text-primary font-medium">※ 방제 시기는 기상청 실시간 데이터 연동 시 자동 업데이트됩니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CalendarRow({
  name, color, primary, secondary,
}: { name: string; color: string; primary: number[]; secondary: number[] }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4 font-medium" style={{ color }}>{name}</td>
      {MONTHS_KO.map((_, i) => {
        const isPrimary = primary.includes(i);
        const isSecondary = secondary.includes(i);
        return (
          <td key={i} className="text-center py-3 px-1">
            {isPrimary ? (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                style={{ backgroundColor: color }}
                title="1차 방제 권고"
              >●</span>
            ) : isSecondary ? (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold"
                style={{ borderColor: color, color }}
                title="2차 방제"
              >◎</span>
            ) : (
              <span className="text-muted-foreground/40 text-xs">○</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
