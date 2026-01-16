import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

interface Activity {
  id: string;
  type: "work_order" | "alert" | "completion" | "budget";
  title: string;
  description: string;
  timestamp: string;
  status?: "success" | "warning" | "destructive";
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "alert",
    title: "새로운 고위험 수목 알림",
    description: "강남구의 수목 #T-001에 즉시 주의가 필요합니다",
    timestamp: "5분 전",
    status: "destructive",
  },
  {
    id: "2",
    type: "completion",
    title: "작업 지시서 완료",
    description: "서초구 15그루 수목에 대한 가지치기 작업 완료",
    timestamp: "2시간 전",
    status: "success",
  },
  {
    id: "3",
    type: "work_order",
    title: "새 작업 지시서 생성",
    description: "8그루 수목에 대한 병해충 방제 프로젝트 승인됨",
    timestamp: "4시간 전",
  },
  {
    id: "4",
    type: "budget",
    title: "예산 목표 달성",
    description: "연간 예산의 40% 사용됨",
    timestamp: "1일 전",
    status: "warning",
  },
  {
    id: "5",
    type: "completion",
    title: "점검 라운드 완료",
    description: "강남구 250그루 수목의 월간 점검 완료",
    timestamp: "2일 전",
    status: "success",
  },
];

export function RecentActivityFeed() {
  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "alert":
        return AlertTriangle;
      case "completion":
        return CheckCircle;
      case "work_order":
        return FileText;
      case "budget":
        return TrendingUp;
      default:
        return FileText;
    }
  };

  const getIconColor = (status?: Activity["status"]) => {
    switch (status) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "destructive":
        return "text-destructive";
      default:
        return "text-primary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => {
            const Icon = getIcon(activity.type);
            const iconColor = getIconColor(activity.status);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {activity.timestamp}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
