import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface WorkOrderStatusProps {
  data: {
    bidding: number;
    inProgress: number;
    awaitingReview: number;
    completed: number;
  };
}

export function WorkOrderStatus({ data }: WorkOrderStatusProps) {
  const statusItems = [
    { label: "입찰 중", count: data.bidding, icon: Clock, color: "text-warning" },
    { label: "진행 중", count: data.inProgress, icon: ClipboardList, color: "text-primary" },
    { label: "검토 대기", count: data.awaitingReview, icon: AlertCircle, color: "text-accent" },
    { label: "완료", count: data.completed, icon: CheckCircle, color: "text-success" },
  ];

  const total = data.bidding + data.inProgress + data.awaitingReview + data.completed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">작업 진행 상태</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusItems.map((item) => {
            const Icon = item.icon;
            const percentage = total > 0 ? (item.count / total) * 100 : 0;

            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      item.color === "text-warning"
                        ? "bg-warning"
                        : item.color === "text-success"
                        ? "bg-success"
                        : item.color === "text-accent"
                        ? "bg-accent"
                        : "bg-primary"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
