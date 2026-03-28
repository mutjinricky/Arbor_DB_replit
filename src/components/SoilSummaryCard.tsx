import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Sprout } from "lucide-react";
import {
  calculateSoilScore,
  SOIL_COLORS,
  SOIL_LABELS,
  type SoilGrade,
  type TreeFullData,
} from "@/lib/riskCalculations";

interface GradeCount { grade: SoilGrade; count: number; label: string; color: string }

export function SoilSummaryCard() {
  const [treesJson, setTreesJson] = useState<Record<string, TreeFullData> | null>(null);

  useEffect(() => {
    fetch("/data/trees.json")
      .then((r) => r.json())
      .then(setTreesJson)
      .catch(() => {});
  }, []);

  const gradeCounts = useMemo<GradeCount[]>(() => {
    const counts: Record<SoilGrade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    if (treesJson) {
      for (const [id, tree] of Object.entries(treesJson)) {
        const { grade } = calculateSoilScore(id, tree);
        counts[grade]++;
      }
    }
    return (["A", "B", "C", "D", "E"] as SoilGrade[]).map((g) => ({
      grade: g,
      count: counts[g],
      label: g + "등급",
      color: SOIL_COLORS[g],
    }));
  }, [treesJson]);

  const worstTrees = useMemo(() => {
    if (!treesJson) return [];
    return Object.entries(treesJson)
      .map(([id, tree]) => ({ id, tree, ...calculateSoilScore(id, tree) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
  }, [treesJson]);

  const totalLoaded = treesJson ? Object.keys(treesJson).length : 0;
  const badCount = (gradeCounts.find(g => g.grade === "D")?.count ?? 0) + (gradeCounts.find(g => g.grade === "E")?.count ?? 0);

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sprout className="h-4 w-4 text-primary" />
            토양 건전성 (K-UTSI) 분포
          </CardTitle>
          {treesJson ? (
            <span className="text-xs text-muted-foreground">
              총 {totalLoaded.toLocaleString()}그루 | 불량 이하: <span className="text-orange-600 font-semibold">{badCount}그루</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground animate-pulse">로딩 중…</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bar Chart */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">등급별 수목 수</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={gradeCounts} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`${v}그루`]}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {gradeCounts.map((g) => (
                    <Cell key={g.grade} fill={g.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Worst trees list */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">토양 불량 수목 상위 5</p>
            <div className="space-y-1.5">
              {worstTrees.length === 0 ? (
                <p className="text-xs text-muted-foreground animate-pulse">로딩 중…</p>
              ) : (
                worstTrees.map(({ id, tree, score, grade }) => (
                  <div
                    key={id}
                    data-testid={`row-soil-worst-${id}`}
                    className="flex items-center justify-between text-xs bg-muted/40 rounded-md px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: SOIL_COLORS[grade] }}
                      >
                        {grade}
                      </span>
                      <span className="font-medium">수목 #{id}</span>
                      <span className="text-muted-foreground">{tree.species}</span>
                    </div>
                    <span className="font-semibold" style={{ color: SOIL_COLORS[grade] }}>
                      {score}점
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
          {(["A", "B", "C", "D", "E"] as SoilGrade[]).map((g) => (
            <div key={g} className="flex items-center gap-1 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOIL_COLORS[g] }} />
              <span className="text-muted-foreground">{SOIL_LABELS[g]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
