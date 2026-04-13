import { useState } from "react";
import { AlertTriangle, Trees, DollarSign } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { WorkOrderStatus } from "@/components/WorkOrderStatus";
import { AlertsList } from "@/components/AlertsList";
import { ExpenditureChart } from "@/components/ExpenditureChart";
import { RecentActivityFeed } from "@/components/RecentActivityFeed";
import { TreeProfileModal } from "@/components/TreeProfileModal";
import { WorkOrderDialog } from "@/components/WorkOrderDialog";
import { PestAlertBanner } from "@/components/PestAlertBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Text } from "recharts";

const expenditureData = [
  { name: "가지치기", amount: 45000000 },
  { name: "병해충 방제", amount: 28000000 },
  { name: "영양공급", amount: 15000000 },
  { name: "외과수술", amount: 35000000 },
  { name: "제거", amount: 12000000 },
];

const riskData = [
  { name: "경 (정상)", value: 80.0, color: "#22c55e" },
  { name: "중 (주의)", value: 16.0, color: "#eab308" },
  { name: "심 (위험)", value: 3.5,  color: "#f97316" },
  { name: "극심",      value: 0.5,  color: "#dc2626" },
];

const speciesData = [
  { name: "산수유 나무", value: 100 },
];

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted))"];

export default function Dashboard() {
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [workOrderDialogOpen, setWorkOrderDialogOpen] = useState(false);

  const handleTreeClick = (treeId: string) => {
    setSelectedTreeId(treeId);
    setProfileModalOpen(true);
  };

  const handleAddToProject = (treeId: string) => {
    setWorkOrderDialogOpen(true);
    setProfileModalOpen(false);
  };

  return (
    <div className="flex-1 bg-background">
      <main className="container mx-auto px-6 py-8">
        {/* 해충 방제 알림 배너 */}
        <PestAlertBanner />

        {/* Row 1: KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <KPICard
            title="고위험 수목"
            value={153}
            icon={AlertTriangle}
            variant="destructive"
            trend={{ value: "어제 대비 +1", isPositive: false }}
          />
          <KPICard
            title="관리 중인 총 수목"
            value="2,985"
            icon={Trees}
            variant="success"
          />
          <KPICard
            title="예산 사용률"
            value="40%"
            icon={DollarSign}
            variant="warning"
            trend={{ value: "₩100M / ₩250M", isPositive: true }}
          />
        </div>

        {/* Row 2: Trees Requiring Immediate Attention, Tree Health, and Species Diversity */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <AlertsList onViewTree={handleTreeClick} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">수목 위험도 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {riskData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">수목 종 다양성</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Text x="50%" y={20} textAnchor="middle" fontSize={16} fontWeight="bold">
                    {speciesData[0]?.name || ""}
                  </Text>
                  <Pie
                    data={speciesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {speciesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Work Order Status and Expenditure */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <WorkOrderStatus
            data={{
              bidding: 5,
              inProgress: 10,
              awaitingReview: 3,
              completed: 8,
            }}
          />
          <ExpenditureChart data={expenditureData} />
        </div>

        {/* Row 4: Recent Activity Feed */}
        <div className="mb-8">
          <RecentActivityFeed />
        </div>
      </main>

      <TreeProfileModal
        treeId={selectedTreeId}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onCreateWorkOrder={handleAddToProject}
      />

      <WorkOrderDialog
        isOpen={workOrderDialogOpen}
        onClose={() => setWorkOrderDialogOpen(false)}
        treeIds={selectedTreeId ? [selectedTreeId] : []}
      />
    </div>
  );
}
