import { useNavigate } from "react-router-dom";
import { Plus, Calendar, DollarSign, Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "planning" | "bidding" | "in_progress" | "completed";
  budget: number;
  spent: number;
  trees: number;
  startDate: string;
  endDate?: string;
  assignee: string;
}

const mockProjects: Project[] = [
  {
    id: "P-001",
    name: "강남구 가지치기",
    description: "강남구 45그루 수목의 계절별 가지치기",
    status: "in_progress",
    budget: 45000000,
    spent: 32000000,
    trees: 45,
    startDate: "2024-03-01",
    assignee: "팀 A",
  },
  {
    id: "P-002",
    name: "서초구 병해충 방제",
    description: "긴급 병해충 방제 처리",
    status: "bidding",
    budget: 28000000,
    spent: 0,
    trees: 23,
    startDate: "2024-04-01",
    assignee: "팀 B",
  },
  {
    id: "P-003",
    name: "수목 건강 조사 1분기",
    description: "관리 중인 모든 수목의 분기별 건강 평가",
    status: "completed",
    budget: 15000000,
    spent: 14500000,
    trees: 3847,
    startDate: "2024-01-01",
    endDate: "2024-03-15",
    assignee: "팀 C",
  },
  {
    id: "P-004",
    name: "긴급 수목 제거",
    description: "학교 근처 3그루의 고위험 수목 제거",
    status: "planning",
    budget: 12000000,
    spent: 0,
    trees: 3,
    startDate: "2024-04-15",
    assignee: "팀 A",
  },
];

export default function Projects() {
  const navigate = useNavigate();

  const getStatusBadge = (status: Project["status"]) => {
    switch (status) {
      case "planning":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />계획 중</Badge>;
      case "bidding":
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />입찰 중</Badge>;
      case "in_progress":
        return <Badge className="gap-1"><Clock className="h-3 w-3" />진행 중</Badge>;
      case "completed":
        return <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3" />완료</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: Project["status"]) => {
    switch (status) {
      case "planning":
        return Clock;
      case "bidding":
        return AlertCircle;
      case "in_progress":
        return Clock;
      case "completed":
        return CheckCircle;
      default:
        return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">프로젝트</h1>
            <p className="text-muted-foreground">수목 관리 프로젝트 및 작업 지시서 관리</p>
          </div>
          <Button onClick={() => navigate("/projects/create")} className="gap-2" size="lg">
            <Plus className="h-5 w-5" />
            새 프로젝트 생성
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockProjects.map((project) => {
            const budgetPercent = (project.spent / project.budget) * 100;
            
            return (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {getStatusBadge(project.status)}
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">예산 사용률</span>
                      <span className="font-medium">{budgetPercent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>₩{(project.spent / 1000000).toFixed(1)}M</span>
                      <span>₩{(project.budget / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">시작일</p>
                        <p className="font-medium">{project.startDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">담당자</p>
                        <p className="font-medium">{project.assignee}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-sm">
                    <span className="text-muted-foreground">포함된 수목</span>
                    <span className="font-semibold">{project.trees}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
