import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Calendar, DollarSign, MapPin, Users, CheckCircle, Clock, Circle, User, TreePine, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TreeProfileModal } from "@/components/TreeProfileModal";

interface ProjectPhase {
  title: string;
  dateRange: string;
  status: "completed" | "in_progress" | "planned";
}

interface ProjectLocation {
  id: string;
  lat: number;
  lng: number;
  treeId: string;
}

interface Contractor {
  name: string;
  contactEmail: string;
  avatar?: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  status: "planning" | "bidding" | "in_progress" | "completed";
  totalBudget: number;
  currentExpenditure: number;
  trees: number;
  startDate: string;
  endDate?: string;
  assignee: string;
  phases: ProjectPhase[];
  locations: ProjectLocation[];
  contractors: Contractor[];
}

// Mock data with expanded details
const mockProjectDetails: Record<string, ProjectDetail> = {
  "P-001": {
    id: "P-001",
    name: "산수유 마을 가지치기",
    description: "45그루 수목의 계절별 가지치기로 수목 건강과 공공 안전 유지",
    status: "in_progress",
    totalBudget: 45000000,
    currentExpenditure: 32000000,
    trees: 45,
    startDate: "2024-03-01",
    endDate: "2024-05-31",
    assignee: "팀 A",
    phases: [
      { title: "현장 평가", dateRange: "2024-03-01 ~ 2024-03-07", status: "completed" },
      { title: "장비 준비", dateRange: "2024-03-08 ~ 2024-03-15", status: "completed" },
      { title: "가지치기 시행", dateRange: "2024-03-16 ~ 2024-05-20", status: "in_progress" },
      { title: "최종 점검", dateRange: "2024-05-21 ~ 2024-05-31", status: "planned" },
    ],
    locations: [
      { id: "LOC-001", lat: 37.4979, lng: 127.0276, treeId: "TREE-1024" },
      { id: "LOC-002", lat: 37.4985, lng: 127.0282, treeId: "TREE-1025" },
      { id: "LOC-003", lat: 37.4990, lng: 127.0290, treeId: "TREE-1026" },
    ],
    contractors: [
      { name: "그린케어 수목병원", contactEmail: "contact@greencare.kr" },
      { name: "도시숲 주식회사", contactEmail: "info@urbanforest.kr" },
    ],
  },
  "P-002": {
    id: "P-002",
    name: "병해충 방제",
    description: "영향을 받은 수목에 대한 긴급 병해충 방제 처리",
    status: "bidding",
    totalBudget: 28000000,
    currentExpenditure: 0,
    trees: 23,
    startDate: "2024-04-01",
    endDate: "2024-04-30",
    assignee: "팀 B",
    phases: [
      { title: "병해충 식별", dateRange: "2024-04-01 ~ 2024-04-05", status: "planned" },
      { title: "처리 계획", dateRange: "2024-04-06 ~ 2024-04-10", status: "planned" },
      { title: "처리 시행", dateRange: "2024-04-11 ~ 2024-04-25", status: "planned" },
      { title: "후속 모니터링", dateRange: "2024-04-26 ~ 2024-04-30", status: "planned" },
    ],
    locations: [
      { id: "LOC-004", lat: 37.4835, lng: 127.0324, treeId: "TREE-2001" },
      { id: "LOC-005", lat: 37.4840, lng: 127.0330, treeId: "TREE-2002" },
    ],
    contractors: [
      { name: "에코페스트 솔루션", contactEmail: "contact@ecopest.kr" },
    ],
  },
  "P-003": {
    id: "P-003",
    name: "수목 건강 조사 1분기",
    description: "관리 중인 모든 수목의 분기별 건강 평가",
    status: "completed",
    totalBudget: 15000000,
    currentExpenditure: 14500000,
    trees: 3847,
    startDate: "2024-01-01",
    endDate: "2024-03-15",
    assignee: "팀 C",
    phases: [
      { title: "조사 계획", dateRange: "2024-01-01 ~ 2024-01-10", status: "completed" },
      { title: "현장 조사", dateRange: "2024-01-11 ~ 2024-02-28", status: "completed" },
      { title: "데이터 분석", dateRange: "2024-03-01 ~ 2024-03-10", status: "completed" },
      { title: "보고서 작성", dateRange: "2024-03-11 ~ 2024-03-15", status: "completed" },
    ],
    locations: [
      { id: "LOC-006", lat: 37.5000, lng: 127.0400, treeId: "TREE-3001" },
      { id: "LOC-007", lat: 37.5010, lng: 127.0410, treeId: "TREE-3002" },
    ],
    contractors: [
      { name: "서울 수목 진단", contactEmail: "info@stdiag.kr" },
      { name: "그린 헬스 서비스", contactEmail: "contact@greenhealth.kr" },
      { name: "아버리스트 네트워크 코리아", contactEmail: "info@arboristnetwork.kr" },
    ],
  },
  "P-004": {
    id: "P-004",
    name: "긴급 수목 제거",
    description: "학교 근처 3그루의 고위험 수목 제거",
    status: "planning",
    totalBudget: 12000000,
    currentExpenditure: 0,
    trees: 3,
    startDate: "2024-04-15",
    assignee: "팀 A",
    phases: [
      { title: "위험도 평가", dateRange: "2024-04-15 ~ 2024-04-17", status: "planned" },
      { title: "안전 계획", dateRange: "2024-04-18 ~ 2024-04-20", status: "planned" },
      { title: "수목 제거", dateRange: "2024-04-21 ~ 2024-04-23", status: "planned" },
      { title: "현장 정리", dateRange: "2024-04-24 ~ 2024-04-25", status: "planned" },
    ],
    locations: [
      { id: "LOC-008", lat: 37.5100, lng: 127.0500, treeId: "TREE-4001" },
    ],
    contractors: [
      { name: "세이프트리 긴급 서비스", contactEmail: "emergency@safetree.kr" },
    ],
  },
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = id ? mockProjectDetails[id] : null;

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">프로젝트를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            프로젝트로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const budgetPercent = (project.currentExpenditure / project.totalBudget) * 100;
  const isOnTrack = budgetPercent <= 90;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-success";
      case "in_progress":
        return "text-primary";
      case "planning":
        return "text-muted-foreground";
      case "bidding":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [treeModalOpen, setTreeModalOpen] = useState(false);
  const [addTreeInput, setAddTreeInput] = useState("");
  const [extraTrees, setExtraTrees] = useState<string[]>([]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" />완료</Badge>;
      case "in_progress":
        return <Badge className="gap-1"><Clock className="h-3 w-3" />진행 중</Badge>;
      case "planning":
        return <Badge variant="secondary" className="gap-1"><Circle className="h-3 w-3" />계획 중</Badge>;
      case "bidding":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />입찰 중</Badge>;
      default:
        return null;
    }
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-primary" />;
      case "planned":
        return <Circle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* C-01: Page Header */}
        <div className="mb-8 space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                  <Link to="/projects">프로젝트</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{project.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div>
            <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
            <p className="text-lg text-muted-foreground mb-2">{project.description}</p>
            <p className="text-sm text-muted-foreground">프로젝트 ID: {project.id}</p>
          </div>
        </div>

        {/* C-02: Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Project Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-muted-foreground">프로젝트 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", 
                  project.status === "completed" ? "bg-success" :
                  project.status === "in_progress" ? "bg-warning" :
                  "bg-muted-foreground"
                )} />
                {getStatusBadge(project.status)}
              </div>
            </CardContent>
          </Card>

          {/* Key Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-muted-foreground">주요 일정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">
                    {project.startDate} ~ {project.endDate || "진행 중"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Budget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-muted-foreground">총 예산</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  ₩{(project.totalBudget / 1000000).toFixed(1)}M
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Detailed Information - 2 column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* C-03: Budget vs. Expenditure */}
            <Card>
              <CardHeader>
                <CardTitle>예산 대비 지출</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={budgetPercent} className="h-3" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">현재 지출</span>
                    <span className="font-semibold">₩{(project.currentExpenditure / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">총 예산</span>
                    <span className="font-semibold">₩{(project.totalBudget / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className={cn("text-sm font-medium pt-2", isOnTrack ? "text-success" : "text-destructive")}>
                    예산의 {budgetPercent.toFixed(1)}% 사용됨. 프로젝트가 예산 {isOnTrack ? "범위 내" : "초과"}입니다.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* C-04: Project Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>프로젝트 타임라인</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {project.phases.map((phase, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        {getPhaseIcon(phase.status)}
                        {index < project.phases.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2 mb-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <h4 className={cn("font-semibold mb-1", getStatusColor(phase.status))}>
                          {phase.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">{phase.dateRange}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* C-05: Project Map View */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  프로젝트 지도 보기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-[400px] bg-secondary/30 rounded-lg overflow-hidden border-2 border-border">
                  {/* Simple map placeholder with pins */}
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <MapPin className="h-12 w-12 mx-auto" />
                      <p className="text-sm">인터랙티브 지도 보기</p>
                      <p className="text-xs">{project.locations.length}개 위치 표시됨</p>
                    </div>
                  </div>
                  
                  {/* Mock pins */}
                  {project.locations.slice(0, 3).map((location, index) => (
                    <div
                      key={location.id}
                      className="absolute w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        left: `${30 + index * 20}%`,
                        top: `${40 + index * 15}%`,
                      }}
                    >
                      <MapPin className="h-4 w-4 text-primary-foreground" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  총 수목: {project.trees}그루 | 매핑된 위치: {project.locations.length}개
                </p>
              </CardContent>
            </Card>

            {/* C-06b: Connected Trees */}
          {(() => {
            const allTreeIds = [
              ...project.locations.map((l) => l.treeId),
              ...extraTrees,
            ];
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5" />
                    연결 수목 ({allTreeIds.length}그루)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allTreeIds.map((treeId, idx) => {
                      const loc = project.locations.find((l) => l.treeId === treeId);
                      return (
                        <div
                          key={`${treeId}-${idx}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          data-testid={`row-tree-${treeId}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <TreePine className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-medium truncate">{treeId}</p>
                              {loc && (
                                <p className="text-xs text-muted-foreground">
                                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              data-testid={`button-view-tree-${treeId}`}
                              onClick={() => {
                                const numericId = treeId.replace(/\D/g, "");
                                setSelectedTreeId(numericId || treeId);
                                setTreeModalOpen(true);
                              }}
                            >
                              프로필
                            </Button>
                            {!project.locations.find((l) => l.treeId === treeId) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                data-testid={`button-remove-tree-${treeId}`}
                                onClick={() => setExtraTrees((prev) => prev.filter((t) => t !== treeId))}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="수목 ID 입력 (예: TREE-2001)"
                      value={addTreeInput}
                      onChange={(e) => setAddTreeInput(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-add-tree"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && addTreeInput.trim()) {
                          const id = addTreeInput.trim().toUpperCase();
                          if (!allTreeIds.includes(id)) {
                            setExtraTrees((prev) => [...prev, id]);
                          }
                          setAddTreeInput("");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 flex-shrink-0"
                      data-testid="button-add-tree"
                      onClick={() => {
                        const id = addTreeInput.trim().toUpperCase();
                        if (id && !allTreeIds.includes(id)) {
                          setExtraTrees((prev) => [...prev, id]);
                        }
                        setAddTreeInput("");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      추가
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* C-06: Assigned Contractors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  지정된 계약업체
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.contractors.map((contractor, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {contractor.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{contractor.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{contractor.contactEmail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <TreeProfileModal
        treeId={selectedTreeId}
        isOpen={treeModalOpen}
        onClose={() => { setTreeModalOpen(false); setSelectedTreeId(null); }}
      />
    </div>
  );
}
