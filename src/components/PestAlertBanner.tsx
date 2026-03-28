import { useState } from "react";
import { X, Bug, AlertTriangle, Info } from "lucide-react";
import { useWeatherData, PEST_TARGETS } from "@/hooks/useWeatherData";

export function PestAlertBanner() {
  const { pestDDs, isLoading } = useWeatherData();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (isLoading) return null;

  const alerts: Array<{
    key: string;
    pest: string;
    daysLeft: number;
    level: "critical" | "warning" | "info";
  }> = [];

  for (const pest of PEST_TARGETS) {
    const dd = pestDDs[pest.name];
    if (!dd) continue;
    const remaining = Math.max(0, dd.targetDD - dd.currentDD);
    const avgDailyDD = Math.max(0.5, 12 - dd.baseTemp);
    const daysLeft = Math.round(remaining / avgDailyDD);

    let level: "critical" | "warning" | "info" | null = null;
    if (daysLeft <= 7) level = "critical";
    else if (daysLeft <= 30) level = "warning";
    else if (daysLeft <= 60) level = "info";

    if (level) {
      alerts.push({ key: pest.name, pest: pest.name, daysLeft, level });
    }
  }

  const visible = alerts.filter((a) => !dismissed.has(a.key));
  if (visible.length === 0) return null;

  const STYLES = {
    critical: {
      wrapper: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
      icon: <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />,
      badge: "bg-red-100 text-red-700 border border-red-200",
      text: "text-red-800 dark:text-red-300",
      sub: "text-red-600/70 dark:text-red-400/70",
      label: "🚨 긴급",
    },
    warning: {
      wrapper: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
      icon: <Bug className="h-4 w-4 text-orange-600 flex-shrink-0" />,
      badge: "bg-orange-100 text-orange-700 border border-orange-200",
      text: "text-orange-800 dark:text-orange-300",
      sub: "text-orange-600/70 dark:text-orange-400/70",
      label: "⚠️ 주의",
    },
    info: {
      wrapper: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
      icon: <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />,
      badge: "bg-blue-100 text-blue-700 border border-blue-200",
      text: "text-blue-800 dark:text-blue-300",
      sub: "text-blue-600/70 dark:text-blue-400/70",
      label: "ℹ️ 안내",
    },
  };

  return (
    <div className="space-y-2 mb-6">
      {visible.map((alert) => {
        const s = STYLES[alert.level];
        return (
          <div
            key={alert.key}
            data-testid={`banner-pest-alert-${alert.key}`}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${s.wrapper} transition-all`}
          >
            {s.icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${s.badge}`}>
                  {s.label}
                </span>
                <span className={`text-sm font-medium ${s.text}`}>
                  [{alert.pest}] 방제 예정 D-{alert.daysLeft}일
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${s.sub}`}>
                유효적산온도 목표치 도달 예상까지 약 {alert.daysLeft}일 남았습니다.{" "}
                해충 방제 달력에서 상세 일정을 확인하세요.
              </p>
            </div>
            <button
              data-testid={`button-dismiss-alert-${alert.key}`}
              onClick={() => setDismissed((prev) => new Set([...prev, alert.key]))}
              className={`p-1 rounded hover:bg-black/5 transition-colors flex-shrink-0 ${s.sub}`}
              aria-label="닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
