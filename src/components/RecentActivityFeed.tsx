import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, ChevronDown, CheckCircle2 } from "lucide-react";

// ── 타입 ───────────────────────────────────────────────────────────────────────
type ProjectStatus = "계획중" | "진행중" | "완료";
type ActivityStatus = "착공" | "작업중" | "작업완료" | "준공";

interface BizProject {
  id: string;
  name: string;
  year: number;
  region: string;
  type: string;
  status: ProjectStatus;
  period: string;
  vendor: string;
}

// ── 상수 ───────────────────────────────────────────────────────────────────────
const BIZ_KEY = "dryad_business_history_v3";
const ACT_KEY = "dryad_activity_status_v1";

const VALID_REGIONS = ["도로", "마을", "축제장", "전답", "농가"];
const ALL_ACTIVITY_STATUSES: ActivityStatus[] = ["착공", "작업중", "작업완료", "준공"];

const INITIAL_PROJECTS: BizProject[] = [
  { id: "BH-2024-001", name: "이천시 장호원읍 노거수 생육기반 개선사업", year: 2024, region: "마을",  type: "토양개량",   status: "진행중", period: "2026-03-01 ~ 2026-06-30", vendor: "화산나무병원" },
  { id: "BH-2024-002", name: "이천시 신둔면 가로수 전정 및 수형조절 사업", year: 2024, region: "도로",  type: "가지치기",   status: "계획중", period: "2026-07-01 ~ 2026-09-30", vendor: "강산나무병원" },
  { id: "BH-2024-003", name: "이천시 도립리 솔껍질깍지벌레 방제사업",     year: 2024, region: "마을",  type: "병해충방제", status: "완료",   period: "2026-02-01 ~ 2026-03-31", vendor: "한수나무병원" },
  { id: "BH-2023-001", name: "이천시 산수유마을 안전진단 사업",           year: 2023, region: "마을",  type: "정밀진단",   status: "완료",   period: "2025-10-01 ~ 2025-11-30", vendor: "솔향나무병원" },
  { id: "BH-2023-002", name: "이천시 백사면 수세회복 사업",               year: 2023, region: "마을",  type: "시비관리",   status: "완료",   period: "2025-05-01 ~ 2025-08-31", vendor: "한산나무병원" },
  { id: "BH-2023-003", name: "이천시 관고동 위험수목 제거사업",           year: 2023, region: "도로",  type: "위험목제거", status: "완료",   period: "2025-04-01 ~ 2025-05-31", vendor: "나무잇나무병원" },
];

// ── 스타일 맵 ──────────────────────────────────────────────────────────────────
const ACT_STYLE: Record<ActivityStatus, { badge: string; bar: string }> = {
  착공:   { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",   bar: "bg-blue-400" },
  작업중: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", bar: "bg-amber-400" },
  작업완료: { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", bar: "bg-emerald-400" },
  준공:   { badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",  bar: "bg-slate-400" },
};

// ── 유틸 ───────────────────────────────────────────────────────────────────────
function loadProjects(): BizProject[] {
  try {
    const raw = localStorage.getItem(BIZ_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BizProject[];
      if (parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_PROJECTS;
}

function loadActivityStatuses(): Record<string, ActivityStatus> {
  try {
    const raw = localStorage.getItem(ACT_KEY);
    if (raw) return JSON.parse(raw) as Record<string, ActivityStatus>;
  } catch {}
  return {};
}

function saveActivityStatuses(s: Record<string, ActivityStatus>) {
  try { localStorage.setItem(ACT_KEY, JSON.stringify(s)); } catch {}
}

function defaultActivityStatus(status: ProjectStatus): ActivityStatus {
  if (status === "진행중") return "작업중";
  if (status === "완료") return "준공";
  return "착공";
}

function parsePeriod(period: string): { start: Date | null; end: Date | null } {
  const parts = period.split("~").map((s) => s.trim());
  if (parts.length !== 2) return { start: null, end: null };
  const start = new Date(parts[0]);
  const end = new Date(parts[1]);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { start: null, end: null };
  return { start, end };
}

function calcDDay(period: string): { daysLeft: number; progress: number } {
  const { start, end } = parsePeriod(period);
  if (!start || !end) return { daysLeft: 0, progress: 0 };
  const now = new Date();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  return { daysLeft, progress };
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export function RecentActivityFeed() {
  const [projects] = useState<BizProject[]>(() =>
    loadProjects()
      .filter((p) => VALID_REGIONS.includes(p.region))
      .sort((a, b) => b.id.localeCompare(a.id))
  );

  const [actStatuses, setActStatuses] = useState<Record<string, ActivityStatus>>(() => {
    const stored = loadActivityStatuses();
    const result: Record<string, ActivityStatus> = {};
    projects.forEach((p) => {
      result[p.id] = stored[p.id] ?? defaultActivityStatus(p.status);
    });
    return result;
  });

  function changeStatus(id: string, s: ActivityStatus) {
    const updated = { ...actStatuses, [id]: s };
    setActStatuses(updated);
    saveActivityStatuses(updated);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">최근 활동</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {projects.length === 0 && (
            <p className="px-5 py-8 text-sm text-center text-muted-foreground">표시할 활동이 없습니다</p>
          )}
          {projects.map((p) => {
            const actStatus = actStatuses[p.id] ?? defaultActivityStatus(p.status);
            const isCompleted = actStatus === "준공" || actStatus === "작업완료";
            const { daysLeft, progress } = calcDDay(p.period);
            const style = ACT_STYLE[actStatus];

            return (
              <div key={p.id} className="px-5 py-3.5 hover:bg-accent/30 transition-colors">
                {/* 상단 행: 상태 배지 + 사업명 + 변경 버튼 */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className={`mt-0.5 inline-block shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold ${style.badge}`}>
                      {actStatus}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-snug truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.region} · {p.type} · {p.vendor}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-0.5 shrink-0"
                        data-testid={`button-act-status-${p.id}`}
                      >
                        상태변경 <ChevronDown className="h-2.5 w-2.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[90px]">
                      {ALL_ACTIVITY_STATUSES.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          className={`text-xs ${actStatus === s ? "font-bold text-indigo-600" : ""}`}
                          onClick={() => changeStatus(p.id, s)}
                        >
                          {s}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 게이지 바 + D-day */}
                {isCompleted ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: "100%" }} />
                    </div>
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium whitespace-nowrap">
                      <CheckCircle2 className="h-3 w-3" /> 완료
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${style.bar}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${daysLeft <= 14 ? "text-red-500" : "text-muted-foreground"}`}>
                      {daysLeft >= 0 ? `D-${daysLeft}` : `D+${Math.abs(daysLeft)}`}
                    </span>
                  </div>
                )}

                {/* 공기 */}
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {p.period}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
