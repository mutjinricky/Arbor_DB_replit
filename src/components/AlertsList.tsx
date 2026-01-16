import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, ChevronRight } from "lucide-react";

interface Alert {
  id: string;
  treeId: string;
  location: string;
  reason: string;
  risk: "high" | "medium";
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    treeId: "7",
    location: "경사리 도로",
    reason: "2025년 7월 23일 점검 중 설해 피해 확인",
    risk: "high",
  },
  {
    id: "2",
    treeId: "13",
    location: "경사리 도로",
    reason: "뿌리 부패 증상 관찰됨",
    risk: "high",
  },
  {
    id: "3",
    treeId: "37",
    location: "경사리 도로",
    reason: "병해충 피해 발생 - 예방 처치 필요",
    risk: "high",
  },
];

interface AlertsListProps {
  onAlertClick?: (alert: Alert) => void;
  onViewTree?: (treeId: string) => void;
}

export function AlertsList({ onAlertClick, onViewTree }: AlertsListProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          즉시 주의가 필요한 수목
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 bg-card rounded-lg border border-border hover:shadow-md transition-all cursor-pointer"
              onClick={() => {
                onAlertClick?.(alert);
                onViewTree?.(alert.treeId);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.risk === "high" ? "destructive" : "default"} className="text-xs">
                      {alert.risk.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-sm font-semibold">{alert.treeId}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{alert.location}</span>
                  </div>
                  <p className="text-sm">{alert.reason}</p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
