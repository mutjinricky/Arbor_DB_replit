import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scissors, Bug, Leaf, Stethoscope, Trash2 } from "lucide-react";

interface ExpenditureData {
  name: string;
  amount: number;
}

interface ExpenditureChartProps {
  data: ExpenditureData[];
}

export function ExpenditureChart({ data }: ExpenditureChartProps) {
  const iconMap: Record<string, typeof Scissors> = {
    Pruning: Scissors,
    "Pest Control": Bug,
    Nutrition: Leaf,
    Surgery: Stethoscope,
    Removal: Trash2,
    "가지치기": Scissors,
    "병해충 방제": Bug,
    "영양공급": Leaf,
    "외과수술": Stethoscope,
    "제거": Trash2,
  };

  const colorMap: Record<string, string> = {
    Pruning: "text-chart-1",
    "Pest Control": "text-chart-2",
    Nutrition: "text-chart-3",
    Surgery: "text-chart-4",
    Removal: "text-chart-5",
    "가지치기": "text-chart-1",
    "병해충 방제": "text-chart-2",
    "영양공급": "text-chart-3",
    "외과수술": "text-chart-4",
    "제거": "text-chart-5",
  };

  const bgColorMap: Record<string, string> = {
    Pruning: "bg-chart-1",
    "Pest Control": "bg-chart-2",
    Nutrition: "bg-chart-3",
    Surgery: "bg-chart-4",
    Removal: "bg-chart-5",
    "가지치기": "bg-chart-1",
    "병해충 방제": "bg-chart-2",
    "영양공급": "bg-chart-3",
    "외과수술": "bg-chart-4",
    "제거": "bg-chart-5",
  };

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  function fmtKRW(amount: number): string {
    if (amount >= 100_000_000) {
      const eok = Math.floor(amount / 100_000_000);
      const man = Math.floor((amount % 100_000_000) / 10_000);
      return man > 0 ? `${eok}억${man}만원` : `${eok}억원`;
    }
    const man = Math.floor(amount / 10_000);
    return `${man}만원`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">공사별 지출 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => {
            const Icon = iconMap[item.name] || Scissors;
            const percentage = total > 0 ? (item.amount / total) * 100 : 0;
            const colorClass = colorMap[item.name] || "text-primary";
            const bgColorClass = bgColorMap[item.name] || "bg-primary";

            return (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Badge variant="secondary">{fmtKRW(item.amount)}</Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${bgColorClass}`}
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
